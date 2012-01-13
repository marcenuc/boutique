/*global describe: false, beforeEach: false, afterEach: false, it: false, expect: false, angular: false, Ctrl: false, CODICI: false */

describe('Controller', function () {
  'use strict';

  var scope = null,
    $browser = null,
    $log = null,
    ctrl = null,
    modelliEScalarini = {
      lista: {
        '11270899': ['ABITO', 2],
        '11480243': ['ABITO BOT.FANT.', 2],
        '10270233': ['ABITO BOT.FANT.', 1],
        '92370233': ['ABITO BOT.FANT.', 1]
      }
    },
    taglieScalarini = {
      colonneTaglie: [null, { '44': 0, '46': 1, '48': 2, '50': 3, '52': 4, '54': 5, '56': 6, '58': 7, '60': 8, '62': 9, '64': 10, '66': 11 }],
      descrizioniTaglie: [null, { '44': '44', '46': '46', '48': '48', '50': '50', '52': '52', '54': '54', '56': '56', '58': '58', '60': '60', '62': '62', '64': '64', '66': 'SM' }],
      listeDescrizioni: [null, ['44', '46', '48', '50', '52', '54', '56', '58', '60', '62', '64', 'SM']]
    },
    listini = {
      total_rows: 5,
      offset: 1,
      rows: [{
        id: 'Listino_1',
        key: 'Listino_1',
        value: { rev: '1-d6363be2d62ec0f2eb5b961527bdddbf' },
        doc: { _id: 'Listino_1', _rev: '1-d6363be2d62ec0f2eb5b961527bdddbf', columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'],
          prezzi: {} }
      }, {
        id: 'Listino_2',
        key: 'Listino_2',
        value: { rev: '1-d6363be2d62ec0f2eb5b961527bdddba' },
        doc: { _id: 'Listino_2', _rev: '1-d6363be2d62ec0f2eb5b961527bdddba', columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'],
          prezzi: {} }
      }, {
        id: 'Listino_019998',
        key: 'Listino_019998',
        value: { rev: '1-d6363be2d62ec0f2eb5b961527bdddba' },
        doc: { _id: 'Listino_019998', _rev: '1-d6363be2d62ec0f2eb5b961527bdddba', columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'],
          prezzi: {}, versioneBase: '1' }
      }, {
        id: 'Listino_099997',
        key: 'Listino_099997',
        value: { rev: '2-d6363be2d62ec0f2eb5b961527bdddba' },
        doc: { _id: 'Listino_099997', _rev: '2-d6363be2d62ec0f2eb5b961527bdddba', columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'],
          prezzi: {}, versioneBase: '2' }
      }]
    },
    aziende = {
      rows: [{
        id: 'Azienda_019998',
        key: 'Azienda_019998',
        value: '019998 Mag. Disponibile'
      }, {
        id: 'Azienda_099997',
        key: 'Azienda_099997',
        value: '099997 Negozio LE'
      }]
    },
    aziendeDocs = {
      rows: [{
        id: 'Azienda_019998',
        key: 'Azienda_019998',
        value: '019998 Mag. Disponibile',
        doc: {
          _id: "Azienda_019998",
          _rev: "1-d6363be2d62ec0f2eb5b961527bdddbf",
          tipo: "MAGAZZINO",
          nome: "Mag. Disponibile",
          indirizzo: "S.S. 275 km. 21,4 Lucugnano",
          comune: "Tricase (LE) ITALY",
          provincia: "LE",
          cap: "73030",
          contatti: [ "0833/706311", "0833/706322 (fax)" ]
        }
      }, {
        id: 'Azienda_099997',
        key: 'Azienda_099997',
        value: '099997 Negozio LE',
        doc: {
          _id: "Azienda_099997",
          _rev: "2-9415d085eb2ad39b3d7e40cab79cbf5b",
          tipo: "NEGOZIO",
          contatti: [ "0832 332401" ],
          nome: "Negozio LE",
          indirizzo: "Via Liborio Romano 73",
          comune: "Lecce",
          provincia: "LE",
          cap: "73100"
        }
      }]
    };

  function okResponse(id, rev) {
    return { ok: true, id: id, rev: rev || '1' };
  }

  function getUrl(id) {
    var u;
    switch (id) {
    case 'AZIENDE':
      u = '_design/boutique_db/_view/aziende';
      break;
    case 'AZIENDE_DOCS':
      u = '_design/boutique_db/_view/aziende?include_docs=true';
      break;
    case 'LISTINI':
      u = '_all_docs?endkey=%22Listino_%EF%BF%B0%22&include_docs=true&startkey=%22Listino_%22';
      break;
    case 'VIEW_RIFERIMENTI':
      u = '_design/boutique_db/_view/riferimentiMovimentiMagazzino?key=%22BollaAs400_20110704_1234_Y_10%22';
      break;
    case 'VIEW_NUMERI':
      u = '_design/boutique_db/_view/contatori?descending=true&endkey=%5B%22010101%22,2011,%22A%22%5D&limit=1&startkey=%5B%22010101%22,2011,%22A%22,%7B%7D%5D';
      break;
    case 'VIEW_PENDENTI':
      u = '_design/boutique_db/_view/movimentoMagazzinoPendente';
      break;
    default:
      u = id;
      break;
    }
    return '/boutique_db/' + u;
  }

  function expectGET(urlId, response200, errStatus, errBody) {
    //TODO DRY questa è praticamente identica a expectPUT;
    var xpct = $browser.xhr.expectGET(getUrl(urlId)), response;
    if (errStatus) {
      response = errBody;
      xpct.respond(errStatus, errBody);
    } else {
      response = response200 || okResponse(urlId);
      xpct.respond(JSON.stringify(response));
    }
    return response;
  }

  function expectPUT(data, response200, errStatus, errBody) {
    //TODO DRY questa è praticamente identica a expectGET;
    var response,
      urlId = data._id,
      xpct = $browser.xhr.expectPUT(getUrl(urlId), data);
    if (errStatus) {
      response = errBody;
      xpct.respond(errStatus, response);
    } else {
      response = response200 || okResponse(urlId);
      xpct.respond(JSON.stringify(response));
    }
    return response;
  }

  beforeEach(function () {
    scope = angular.scope();
    $browser = scope.$service('$browser');
    $log = scope.$service('$log');
    ctrl = null;
  });

  afterEach(function () {
    expect($browser.xhr.requests.length).toBe(0, 'You have not flushed the $browser.xhr requests.');
  });

  describe('Azienda', function () {
    var $routeParams = null;

    function newController(status, body) {
      expectGET('AZIENDE_DOCS', aziendeDocs, status, body);
      ctrl = scope.$new(Ctrl.Azienda);
    }

    beforeEach(function () {
      $routeParams = scope.$service('$routeParams');
    });

    describe('inizialization', function () {
      it('should fetch all aziende', function () {
        newController();
        $browser.xhr.flush();
        expect(Object.keys(ctrl.aziende).length).toEqualData(aziendeDocs.rows.length);
      });

      it('should flash fetch errors', function () {
        //TODO this test should not be specific to Ctrl.Azienda
        var $route = scope.$service('$route'), SessionInfo = scope.$service('SessionInfo');
        newController(500, 'No service');
        $route.reload();
        scope.$digest();
        $route.current.scope = ctrl;
        $browser.xhr.flush();
        expect(SessionInfo.flash).toEqual({ errors: [{ message: 'ERROR 500: No service' }] });
      });

      it('should set id and azienda according to $routeParams.codice', function () {
        var azienda = aziendeDocs.rows[1].doc;
        $routeParams.codice = CODICI.typeAndCodeFromId(azienda._id)[2];
        expectGET(azienda._id, azienda);
        newController();
        expect(ctrl.id).toBe(azienda._id);
        $browser.xhr.flush();
        expect(ctrl.azienda).toEqualData(azienda);
      });
    });


    describe('actions', function () {
      var SessionInfo = null;

      beforeEach(function () {
        SessionInfo = scope.$service('SessionInfo');
        newController();
        $browser.xhr.flush();
      });

      describe('validate', function () {
        it('should set SessionInfo.flash to validation errors', function () {
          expect(SessionInfo.flash).toEqual({});
          ctrl.azienda = { _id: 'Azienda_000001' };
          expect(ctrl.validate()).toBe(false);
          expect(SessionInfo.flash).toEqual({ errors: [{ message: 'Required: nome' }, { message: 'Required: tipo' }] });
          ctrl.azienda = { _id: 'Azienda_000001', nome: 'a', tipo: 'NEGOZIO' };
          expect(ctrl.validate()).toBeTruthy();
          expect(SessionInfo.flash).toEqual({ errors: [] });
        });
      });

      describe('save', function () {
        var response = null;

        function doSave() {
          response = expectPUT(ctrl.azienda);
          ctrl.save();
          $browser.xhr.flush();
        }

        it('should not submit the data if not valid', function () {
          ctrl.id = 'Azienda_010101';
          ctrl.azienda = { _id: ctrl.id, _rev: '1', nome: '' };
          ctrl.save();
          expect(ctrl.azienda._rev).toBe('1');
          expect(SessionInfo.flash.errors[0]).toEqual({ message: 'Required: nome' });
        });

        it('should create new document if id changed', function () {
          ctrl.id = 'Azienda_000000';
          ctrl.azienda = angular.copy(aziendeDocs.rows[0].doc);
          var data = angular.copy(ctrl.azienda);
          delete data._rev;
          expectPUT(data);
          expectPUT({ _id: 'Listino_019998', columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'], prezzi: {}, versioneBase: '1' });
          expectGET(ctrl.azienda._id); //TODO mock $location instead
          ctrl.save();
          $browser.xhr.flush();
        });


        describe('new document', function () {
          beforeEach(function () {
            ctrl.azienda = { _id: 'Azienda_010101', nome: 'Nuova azienda', tipo: 'NEGOZIO' };
            ctrl.id = ctrl.azienda._id;
            expectPUT({ _id: 'Listino_010101', columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'], prezzi: {}, versioneBase: '1' });
            expectGET(ctrl.azienda._id); //TODO mock $location instead
            doSave();
          });

          it('should set _rev field to the returned revision', function () {
            expect(ctrl.azienda._rev).toBe(response.rev);
          });

          it('should redirect to azienda page', function () {
            expect(scope.$service('$location').path()).toBe('/' + ctrl.azienda._id);
          });
        });

        describe('existing document', function () {
          beforeEach(function () {
            ctrl.azienda = angular.copy(aziendeDocs.rows[0].doc);
            ctrl.id = ctrl.azienda._id;
            ctrl.azienda.nome = 'NUOVO NOME';
            doSave();
          });

          it('should update _rev field to the returned revision', function () {
            expect(ctrl.azienda._rev).toBe(response.rev);
          });

          it('should update aziende when saving updates to azienda', function () {
            expect(ctrl.azienda).toEqualData(ctrl.aziende['019998'].doc);
          });
        });
      });


      describe('isIdChanged', function () {
        it('should return true only if id is not equal to azienda._id', function () {
          ctrl.id = aziende.rows[0].id;
          ctrl.azienda = { _id: aziende.rows[1].id };
          expect(ctrl.isIdChanged()).toBe(true);
          ctrl.azienda._id = ctrl.id;
          expect(ctrl.isIdChanged()).toBe(false);
        });
      });
    });
  });

  describe('NewMovimentoMagazzino', function () {
    var causale = { descrizione: 'VENDITA', segno: -1, gruppo: 'A', causaleA: 1 },
      emptyMM = CODICI.newMovimentoMagazzino('010101', '20111231', 12, causale, '020202');

    function newController() {
      expectGET('AZIENDE', aziende);
      ctrl = scope.$new(Ctrl.NewMovimentoMagazzino);
      $browser.xhr.flush();
    }

    beforeEach(function () {
      newController();
    });

    describe('create', function () {
      it('should create a new document with model data', function () {
        ctrl.form = {
          data: '20111231',
          da: '010101',
          a: '020202',
          causale: causale
        };
        expectGET('VIEW_NUMERI', { rows: [
          { key: ['010101', 2011, 'A', 11], value: 1 }
        ]});
        expectPUT(emptyMM);
        expectGET(emptyMM._id); //TODO mock $location instead
        expectGET('LISTINI', listini); //TODO mock $location instead
        expectGET('TaglieScalarini', taglieScalarini); //TODO mock $location instead
        expectGET('ModelliEScalarini', modelliEScalarini); //TODO mock $location instead
        ctrl.create();
        $browser.xhr.flush();
        expect(scope.$service('$location').path()).toBe('/' + emptyMM._id);
      });
    });
  });

  describe('EditMovimentoMagazzino', function () {
    var codes = null,
      causale = { descrizione: 'VENDITA', segno: -1, gruppo: 'A', causaleA: 1 },
      emptyMM = CODICI.newMovimentoMagazzino('010101', '20111231', 12, causale, '020202'),
      movimento = angular.copy(emptyMM);
    movimento._rev = '1-d6363be2d62ec0f2eb5b961527bdddbf';
    movimento.rows.push(['102702335017800044', 2, '44', 'ABITO', 10000, 1]);

    function newController() {
      expectGET(movimento._id, movimento);
      expectGET('AZIENDE', aziende);
      expectGET('LISTINI', listini);
      expectGET('TaglieScalarini', taglieScalarini);
      expectGET('ModelliEScalarini', modelliEScalarini);
      ctrl = scope.$new(Ctrl.EditMovimentoMagazzino);
      $browser.xhr.flush();
    }

    beforeEach(function () {
      var codice = CODICI.typeAndCodeFromId(movimento._id)[2];
      codes = CODICI.parseIdMovimentoMagazzino(movimento._id);
      scope.$service('$routeParams').codice = codice;
      newController();
    });

    describe('inizialization', function () {
      it('should set codes from $routeParams.codice', function () {
        expect(ctrl.codes).toEqual(codes);
      });

      it('should set model to movimento magazzino', function () {
        expect(ctrl.model).toEqualData(movimento);
      });
    });

    describe('save', function () {
      var response = null;

      beforeEach(function () {
        response = expectPUT(ctrl.model);
        ctrl.save();
        $browser.xhr.flush();
      });

      it('should update _rev field to the returned revision', function () {
        expect(ctrl.model._rev).toBe(response.rev);
      });
    });
  });

  describe('MovimentoMagazzino', function () {
    var causale = { descrizione: 'VENDITA', segno: -1, gruppo: 'A', causaleA: 1 },
      emptyMM = CODICI.newMovimentoMagazzino('010101', '20111231', 12, causale, '020202'),
      pendenti = { rows: [{ id: emptyMM._id, key: ['010101', 2011, 'A', 12], value: 1 }]};

    function newController() {
      expectGET('AZIENDE', aziende);
      expectGET('VIEW_PENDENTI', pendenti);
      ctrl = scope.$new(Ctrl.MovimentoMagazzino);
      $browser.xhr.flush();
    }

    beforeEach(function () {
      newController();
    });

    it('should get all MovimentoMagazzino not accodato', function () {
      expect(ctrl.pendenti).toEqualData(pendenti);
    });

    describe('find', function () {
      it('should get requested MovimentoMagazzino', function () {
        ctrl.form = { da: '010101', anno: '2011', causale: { gruppo: 'A' }, numero: '12' };
        ctrl.find();
        expect(scope.$service('$location').path()).toBe('/' + emptyMM._id);
      });
    });
  });

  describe('RicercaBollaAs400', function () {
    var scalarini = {
      taglie: {
        '2': { '44': '44', '46': '46', '48': '48', '50': '50', '52': '52', '56': '56', '58': '58', '60': '60', '62': '62', '64': '64', 'SM': '66' },
        '3': { 'TU': '01' }
      },
      listeDescrizioni: {
        '2': ['44', '46', '48', '50', '52', '54', '56', '58', '60', '62', '64', 'SM'],
        '3': ['TU']
      }
    },
      causaliAs400 = {
        '1': { '98': ['VENDITA', -1] }
      },
      intestazione = { data: '20110704', numero: '1234', enteNumerazione: 'Y', codiceNumerazione: '10' },
      bollaAs400 = {
        columnNames: ['codiceCliente', 'tipoMagazzino', 'codiceMagazzino', 'causale', 'stagione', 'modello',
                      'articolo', 'colore', 'scalarino', 'qta1', 'qta2', 'qta3', 'qta4', 'qta5', 'qta6',
                      'qta7', 'qta8', 'qta9', 'qta10', 'qta11', 'qta12', 'prezzo'],
        rows: [
          ['002812', '1', 'C', '98', '112', '70899', '5017', '8000', '2', '1', '2', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1.00'],
          ['002812', '1', 'C', '98', '114', '80243', '5157', '7184', '2', '0', '0', null, '0', '0', '0', '0', '0', '0', '0', '0', '2', '1.00'],
          ['002812', '1', 'C', '98', '113', '10256', '2645', '7315', '3', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1.00']
        ]
      },
      mm = {
        _id: 'MovimentoMagazzino_010101_2011_A_1',
        riferimento: 'BollaAs400_20110704_1234_Y_10',
        data: '20110704',
        causale: ['VENDITA', -1],
        a: '020202',
        causaleA: ['ACQUISTO', 1],
        columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
        rows: [
          ['112708995017800044', 2, '44', 'ABITO', 0, 1],
          ['112708995017800046', 2, '46', 'ABITO', 0, 2],
          ['114802435157718466', 2, 'SM', 'ABITO BOT.FANT.', 0, 2]
        ]
      };

    describe('actions', function () {

      function newController() {
        expectGET('AZIENDE', aziende);
        expectGET('TaglieScalarini', scalarini);
        expectGET('ModelliEScalarini', modelliEScalarini);
        expectGET('CausaliAs400', causaliAs400);
        ctrl = scope.$new(Ctrl.RicercaBollaAs400);
      }

      beforeEach(function () {
        newController();
        $browser.xhr.flush();
      });

      describe('buildId', function () {
        it('should put, in this order, "data", "numero", "enteNumerazione", and "codiceNumerazione" in the id', function () {
          ctrl.intestazione = intestazione;
          expect(ctrl.buildId()).toBe(mm.riferimento);
        });
      });

      describe('buildRows', function () {
        it('should return rows for MovimentoMagazzino', function () {
          ctrl.id = mm.riferimento;
          ctrl.bollaAs400 = bollaAs400;
          expect(ctrl.buildRows()).toEqual(mm.rows);
        });
      });

      describe('save', function () {
        xit('should put the document', function () {
          ctrl.id = mm.riferimento;
          ctrl.bollaAs400 = bollaAs400;
          ctrl.movimentoMagazzino = {
            data: '20110704',
            da: '010101',
            a: '020202',
            causale: CODICI.CAUSALI_MOVIMENTO_MAGAZZINO[0],
            causaleA: CODICI.CAUSALI_MOVIMENTO_MAGAZZINO[1]
          };
          expectGET('VIEW_NUMERI', { rows: []});
          expectPUT(mm);
          ctrl.save();
          $browser.xhr.flush();
          expect(scope.$service('$location').path()).toBe(mm._id);
        });
      });

      describe('fetch', function () {
        it('should GET bolla only from CouchDB if already present', function () {
          expectGET(mm);
          expectGET('VIEW_RIFERIMENTI', { rows: [] });
          $browser.xhr.expectGET('../as400/bolla/data=110704/numero=1234/enteNumerazione=Y/codiceNumerazione=10').respond(JSON.stringify(bollaAs400));
          ctrl.intestazione = intestazione;
          ctrl.fetch();
          $browser.xhr.flush();
        });
      });
    });
  });


  describe('RicercaArticoli', function () {
    var rows = [
        ['102', '70233', '5215', '2100', '019998', 0, 1, { '48': 1, '50': 1, '52': 1 }],
        ['923', '70233', '5215', '2100', '019998', 1, 1, { '50': 1, '52': 1 }]
      ],
      rowsExpected = [
        ['019998 Mag. Disponibile', 'ABITO BOT.FANT.', '102', '70233', '5215', '2100', 1, 'PRONTO', 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 3, '1', '## N.D. ##'],
        ['019998 Mag. Disponibile', 'ABITO BOT.FANT.', '923', '70233', '5215', '2100', 1, 'IN PRODUZIONE', 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 2, '1', '## N.D. ##']
      ],
      giacenze = { rows: rows };

    function newController() {
      expectGET('AZIENDE', aziende);
      expectGET('TaglieScalarini', taglieScalarini);
      expectGET('ModelliEScalarini', modelliEScalarini);
      expectGET('Giacenze', giacenze);
      expectGET('LISTINI', listini);
      ctrl = scope.$new(Ctrl.RicercaArticoli);
    }

    describe('filtraGiacenza', function () {
      beforeEach(function () {
        newController();
        $browser.xhr.flush();
      });

      it('should group NON consecutive rows', function () {
        expect(ctrl.filtrate).toEqual([]);
        ctrl.filtraGiacenza();
        expect(ctrl.filtrate).toEqual(rowsExpected);
      });
    });
  });
});
