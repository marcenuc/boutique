/*global describe: false, beforeEach: false, afterEach: false, it: false, xit: false, expect: false, angular: false, Ctrl: false, CODICI: false */

describe('Controller', function () {
  'use strict';

  var scope = null,
    $browser = null,
    ctrl = null,
    modelliEScalarini = {
      lista: { '10270233': ['ABITO BOT.FANT.', 1], '92370233': ['ABITO BOT.FANT.', 1] }
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
        doc: { _id: 'Listino_1', _rev: '1-d6363be2d62ec0f2eb5b961527bdddbf', prezzi: {} }
      }, {
        id: 'Listino_2',
        key: 'Listino_2',
        value: { rev: '1-d6363be2d62ec0f2eb5b961527bdddba' },
        doc: { _id: 'Listino_2', _rev: '1-d6363be2d62ec0f2eb5b961527bdddba', prezzi: {} }
      }, {
        id: 'Listino_019998',
        key: 'Listino_019998',
        value: { rev: '1-d6363be2d62ec0f2eb5b961527bdddba' },
        doc: { _id: 'Listino_019998', _rev: '1-d6363be2d62ec0f2eb5b961527bdddba', prezzi: {}, versioneBase: '1' }
      }, {
        id: 'Listino_099997',
        key: 'Listino_099997',
        value: { rev: '2-d6363be2d62ec0f2eb5b961527bdddba' },
        doc: { _id: 'Listino_099997', _rev: '2-d6363be2d62ec0f2eb5b961527bdddba', prezzi: {}, versioneBase: '2' }
      }]
    },
    aziende = {
      total_rows: 15,
      offset: 1,
      rows: [{
        id: 'Azienda_019998',
        key: 'Azienda_019998',
        value: { rev: "1-d6363be2d62ec0f2eb5b961527bdddbf" },
        doc: {
          _id: "Azienda_019998",
          _rev: "1-d6363be2d62ec0f2eb5b961527bdddbf",
          tipo: "MAGAZZINO",
          versioneListino: 1,
          nome: "Mag. Disponibile",
          indirizzo: "S.S. 275 km. 21,4 Lucugnano",
          comune: "Tricase (LE) ITALY",
          provincia: "LE",
          cap: "73030",
          contatti: [ "0833/706311", "0833/706322 (fax)" ]
        }
      }, {
        id: "Azienda_099997",
        key: "Azienda_099997",
        value: { "rev" : "2-9415d085eb2ad39b3d7e40cab79cbf5b" },
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
      u = '_all_docs?endkey=%22Azienda_%EF%BF%B0%22&include_docs=true&startkey=%22Azienda_%22';
      break;
    case 'LISTINI':
      u = '_all_docs?endkey=%22Listino_%EF%BF%B0%22&include_docs=true&startkey=%22Listino_%22';
      break;
    case 'VIEW_RIFERIMENTI':
      u = '_design/boutique_db/_view/riferimentiMovimentiMagazzino?key=%22BollaAs400_20110704_1234_Y_10%22';
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

  function expectPUT(urlId, data, response200, errStatus, errBody) {
    //TODO DRY questa è praticamente identica a expectGET;
    var xpct = $browser.xhr.expectPUT(getUrl(urlId), data), response;
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
    ctrl = null;
  });

  afterEach(function () {
    expect($browser.xhr.requests.length).toBe(0, 'You have not flushed the $browser.xhr requests.');
  });


  describe('utils', function () {
    describe('dotPad', function () {
      it('should pad with dots strings shorter than the given length', function () {
        var u = Ctrl.utils.dotPad;
        expect(u(null, 5)).toBe('.....');
        expect(u('', 5)).toBe('.....');
        expect(u('1', 5)).toBe('1....');
        expect(u('..1', 5)).toBe('..1..');
      });

      it('should left untouched strings longer than pad length', function () {
        expect(Ctrl.utils.dotPad('..1', 2)).toBe('..1');
      });
    });
  });


  describe('Azienda', function () {
    var $routeParams = null;

    function newController(status, body) {
      expectGET('AZIENDE', aziende, status, body);
      ctrl = scope.$new(Ctrl.Azienda);
    }

    beforeEach(function () {
      $routeParams = scope.$service('$routeParams');
    });

    describe('inizialization', function () {

      it('should have an empty list of aziende before fetching', function () {
        newController();
        expect(ctrl.aziende).toEqualData({});
        $browser.xhr.flush();
      });

      it('should fetch all aziende', function () {
        newController();
        $browser.xhr.flush();
        expect(ctrl.aziende).toEqualData(aziende);
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
        var azienda = aziende.rows[1].doc;
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
          response = expectPUT(ctrl.azienda._id, ctrl.azienda);
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
          ctrl.azienda = angular.copy(aziende.rows[0].doc);
          var data = angular.copy(ctrl.azienda);
          delete data._rev;
          expectPUT(ctrl.azienda._id, data);
          ctrl.save();
          $browser.xhr.flush();
        });


        describe('new document', function () {
          beforeEach(function () {
            ctrl.azienda = { _id: 'Azienda_010101', nome: 'Nuova azienda', tipo: 'NEGOZIO' };
            ctrl.id = ctrl.azienda._id;
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
            ctrl.azienda = angular.copy(aziende.rows[0].doc);
            ctrl.id = ctrl.azienda._id;
            ctrl.azienda.nome = "NUOVO NOME";
            doSave();
          });

          it('should update _rev field to the returned revision', function () {
            expect(ctrl.azienda._rev).toBe(response.rev);
          });

          it('should update aziende when saving updates to azienda', function () {
            expect(ctrl.azienda).toEqualData(ctrl.aziende.rows[0].doc);
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


  describe('MovimentoMagazzino', function () {
    var $routeParams = null,
      movimenti = [
        {
          _id: 'MovimentoMagazzino_099999_2011_12',
          _rev: "1-d6363be2d62ec0f2eb5b961527bdddbf",
          columnNames: ['barcode', 'qta'],
          data: '20111010',
          causale: ['VENDITA', -1, 0],
          rows: [
            ['102702335017800044', 1]
          ]
        }
      ];

    function newController(status, body) {
      expectGET('AZIENDE', aziende, status, body);
      expectGET('TaglieScalarini', taglieScalarini);
      expectGET('ModelliEScalarini', modelliEScalarini);
      ctrl = scope.$new(Ctrl.MovimentoMagazzino);
    }

    beforeEach(function () {
      $routeParams = scope.$service('$routeParams');
    });

    describe('inizialization', function () {
      it('should set causale to the first one', function () {
        newController();
        $browser.xhr.flush();
        expect(ctrl.causale).toEqual(['VENDITA', -1, 0]);
      });

      it('should fetch all aziende', function () {
        newController();
        $browser.xhr.flush();
        expect(ctrl.aziende).toEqual({ '019998': '019998 Mag. Disponibile', '099997': '099997 Negozio LE' });
      });

      it('should flash fetch errors', function () {
        var $route = scope.$service('$route'), SessionInfo = scope.$service('SessionInfo');
        newController(500, 'No service');
        $route.reload();
        scope.$digest();
        $route.current.scope = ctrl;
        $browser.xhr.flush();
        expect(SessionInfo.flash).toEqual({ errors: [{ message: 'ERROR 500: No service' }] });
      });

      it('should set origine, data, and numero according to $routeParams.codice', function () {
        var movimento = movimenti[0],
          codice = CODICI.typeAndCodeFromId(movimento._id)[2],
          codes = codice.split('_');
        $routeParams.codice = codice;
        newController();
        $browser.xhr.flush();
        expect(ctrl.origine).toBe(codes[0]);
        expect(ctrl.data).toBe(codes[1]);
        expect(ctrl.numero).toBe(codes[2]);
      });
    });


    describe('actions', function () {
      beforeEach(function () {
        newController();
        $browser.xhr.flush();
      });

      describe('save', function () {
        var response = null;

        function doSave() {
          var bolla = ctrl.buildBolla();
          // buildBolla() adds an empty row at the end: remove it.
          bolla.rows.pop();
          response = expectPUT(bolla._id, bolla, { ok: true, rev: '1', id: bolla._id });
          ctrl.save();
          $browser.xhr.flush();
        }

        it('should create new document if data changed', function () {
          ctrl.buildModel(movimenti[0]);
          ctrl.data = '20100102';
          var r, mm = angular.copy(movimenti[0]), id = CODICI.idMovimentoMagazzino('099999', '2010', '12');
          delete mm._rev;
          mm._id = id;
          mm.data = ctrl.data;
          r = expectPUT(id, mm);
          ctrl.save();
          $browser.xhr.flush();
          expect(ctrl.rev).toBe(r.rev);
        });


        describe('new document', function () {
          beforeEach(function () {
            var mm = angular.copy(movimenti[0]);
            delete mm._rev;
            ctrl.buildModel(mm);
            doSave();
          });

          it('should set rev field to the returned revision', function () {
            expect(ctrl.rev).toBe(response.rev);
          });

          it('should redirect to movimento page', function () {
            expect(scope.$service('$location').path()).toBe('/' + movimenti[0]._id);
          });

        });

        describe('existing document', function () {
          beforeEach(function () {
            ctrl.buildModel(movimenti[0]);
            doSave();
          });

          it('should update _rev field to the returned revision', function () {
            expect(ctrl.rev).toBe(response.rev);
          });
        });
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
      bollaDoc = {
        _id: 'MovimentoMagazzino_123456_2011_1',
        riferimento: 'BollaAs400_20110704_1234_Y_10',
        data: '20110704',
        causale: ['VENDITA', -1, 0],
        columnNames: ['barcode', 'qta'],
        rows: [
          ['112708995017800044', 1],
          ['112708995017800046', 2],
          ['114802435157718466', 2]
        ]
      };

    describe('actions', function () {

      function newController() {
        expectGET('AZIENDE', aziende);
        expectGET('TaglieScalarini', scalarini);
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
          expect(ctrl.buildId()).toBe(bollaDoc.riferimento);
        });
      });

      describe('buildBolla', function () {
        it('should put codiceCliente, tipoMagazzino, codiceMagazzino, and causale in the doc', function () {
          ctrl.id = bollaDoc.riferimento;
          ctrl.bollaAs400 = bollaAs400;
          ctrl.movimentoMagazzino = {
            numero: '1',
            data: '20110704',
            origine: '123456',
            causale: ['VENDITA', -1, 0]
          };
          expect(ctrl.buildBolla()).toEqual(bollaDoc);
        });
      });

      describe('save', function () {
        function doSave() {
          expectPUT(bollaDoc._id, bollaDoc, JSON.stringify(okResponse));
          ctrl.save();
          $browser.xhr.flush();
        }

        it('should put the document', function () {
          ctrl.id = bollaDoc.riferimento;
          ctrl.bollaAs400 = bollaAs400;
          ctrl.movimentoMagazzino = {
            numero: '1',
            data: '20110704',
            origine: '123456',
            causale: ['VENDITA', -1, 0]
          };
          doSave();
        });
      });

      describe('fetch', function () {
        it('should GET bolla only from CouchDB if already present', function () {
          expectGET(bollaDoc._id, bollaDoc);
          expectGET('VIEW_RIFERIMENTI', { rows: [] });
          $browser.xhr.expectGET('/boutique_app/as400/bolla/data=110704/numero=1234/enteNumerazione=Y/codiceNumerazione=10').respond(JSON.stringify(bollaAs400));
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
        ['019998 Mag. Disponibile', 'ABITO BOT.FANT.', '102', '70233', '5215', '2100', 1, 'PRONTO', 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 3, 1, 'n.d.'],
        ['019998 Mag. Disponibile', 'ABITO BOT.FANT.', '923', '70233', '5215', '2100', 1, 'IN PRODUZIONE', 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 2, 1, 'n.d.']
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