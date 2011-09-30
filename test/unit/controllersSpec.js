/*global describe: false, beforeEach: false, afterEach: false, it: false, xit: false, expect: false, angular: false, Ctrl: false */

describe('Controller', function () {
  'use strict';

  var scope = null,
    $browser = null,
    ctrl = null,
    okResponse = { ok: true, rev: '1' },
    aziende = {
      "total_rows" : 15,
      "offset" : 1,
      "rows" : [ {
        "id" : "Azienda_019998",
        "key" : "Azienda_019998",
        "value" : { "rev" : "1-d6363be2d62ec0f2eb5b961527bdddbf" },
        "doc" : {
          "_id" : "Azienda_019998",
          "_rev" : "1-d6363be2d62ec0f2eb5b961527bdddbf",
          "tipo" : "MAGAZZINO",
          "nome" : "Magazzino Disponibile-Tailor S.r.l.",
          "indirizzo" : "S.S. 275 km. 21,4 Lucugnano",
          "comune" : "Tricase (LE) ITALY",
          "provincia" : "LE",
          "cap" : "73030",
          "contatti" : [ "0833/706311", "0833/706322 (fax)" ]
        }
      }, {
        "id" : "Azienda_099997",
        "key" : "Azienda_099997",
        "value" : { "rev" : "2-9415d085eb2ad39b3d7e40cab79cbf5b" },
        "doc" : {
          "_id" : "Azienda_099997",
          "_rev" : "2-9415d085eb2ad39b3d7e40cab79cbf5b",
          "tipo" : "NEGOZIO",
          "contatti" : [ "0832 332401" ],
          "nome" : "Negozio Lecce - Tailor S.r.l.",
          "indirizzo" : "Via Liborio Romano 73",
          "comune" : "Lecce",
          "provincia" : "LE",
          "cap" : "73100"
        }
      } ]
    };

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

    describe('colNamesToColIndexes', function () {
      it('should return an hash with values equal to index of the column in the given array', function () {
        var u = Ctrl.utils.colNamesToColIndexes;
        expect(u(['a', 'b', 'c'])).toEqual({ a: 0, b: 1, c: 2 });
      });
    });
  });


  describe('Azienda', function () {
    var $routeParams = null;

    function newController(status, body) {
      var xpct = $browser.xhr.expectGET('/boutique_db/_all_docs?endkey=%22Azienda_%EF%BF%B0%22&include_docs=true&startkey=%22Azienda_%22');
      if (status) {
        xpct.respond(status, body);
      } else {
        xpct.respond(JSON.stringify(aziende));
      }
      ctrl = scope.$new(Ctrl.Azienda);
    }

    beforeEach(function () {
      $routeParams = scope.$service('$routeParams');
    });

    describe('inizialization', function () {

      it('should set aziendaIdx to undefined', function () {
        newController();
        $browser.xhr.flush();
        expect(ctrl.aziendaIdx).toBeUndefined();
      });

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
        var $route = scope.$service('$route');
        newController(500, 'No service');
        $route.reload();
        scope.$digest();
        $route.current.scope = ctrl;
        $browser.xhr.flush();
        expect(ctrl.flash).toEqual({ errors: [{ message: 'ERROR 500: No service' }] });
      });

      it('should set azienda and aziendaIdx according to $routeParams.codice', function () {
        var azienda = aziende.rows[1].doc,
          Document = scope.$service('Document');
        $routeParams.codice = Document.toCodice(azienda._id);
        newController();
        expect(ctrl.azienda._id).toBe(azienda._id);
        $browser.xhr.flush();
        expect(ctrl.azienda).toEqual(azienda);
        expect(ctrl.aziendaIdx).toBe(1);
      });

      it('should set flash to userCtx.flash and reset the latter', function () {
        var userCtx = scope.$service('userCtx'),
          flash = { errors: [{ message: 'sample error' }] };
        userCtx.flash = flash;
        newController();
        $browser.xhr.flush();
        expect(ctrl.flash).toEqual(flash);
        expect(userCtx.flash).toEqual({});
      });
    });


    describe('actions', function () {
      beforeEach(function () {
        newController();
        $browser.xhr.flush();
      });

      describe('validate', function () {
        it('should set flash to validation errors', function () {
          expect(ctrl.flash).toBeUndefined();
          ctrl.azienda = { _id: 'Azienda_000001' };
          expect(ctrl.validate()).toBe(false);
          expect(ctrl.flash).toEqual({ errors: [{ message: 'Required: nome' }] });
          ctrl.azienda = { _id: 'Azienda_000001', nome: 'a' };
          expect(ctrl.validate()).toBe(true);
          expect(ctrl.flash).toEqual({ errors: [] });
        });
      });

      describe('save', function () {

        function doSave() {
          $browser.xhr.expectPUT('/boutique_db/' + ctrl.azienda._id, ctrl.azienda).respond(JSON.stringify(okResponse));
          ctrl.save();
          $browser.xhr.flush();
        }

        function expectAppendedAzienda() {
          var newCount = ctrl.aziende.rows.length,
            oldCount = aziende.rows.length;
          expect(newCount).toBe(oldCount + 1);
          expect(ctrl.aziende.rows[newCount - 1].doc).toEqualData(ctrl.azienda);
        }


        it('should not submit the data if not valid', function () {
          ctrl.azienda = { _id: 'Azienda_010101', _rev: '1', nome: '' };
          ctrl.save();
          expect(ctrl.azienda._rev).toBe('1');
          expect(ctrl.flash.errors[0]).toEqual({ message: 'Required: nome' });
        });

        it('should create new document if id changed', function () {
          ctrl.select(0);
          ctrl.azienda._id = 'Azienda_000000';
          var az = angular.copy(ctrl.azienda);
          delete az._rev;
          $browser.xhr.expectPUT('/boutique_db/Azienda_000000', az).respond(JSON.stringify(okResponse));
          ctrl.save();
          $browser.xhr.flush();
          expectAppendedAzienda();
        });


        describe('new document', function () {

          beforeEach(function () {
            ctrl.azienda = { _id: 'Azienda_010101', nome: 'Nuova azienda' };
            doSave();
          });

          it('should set _rev field to the returned revision', function () {
            expect(ctrl.azienda._rev).toBe(okResponse.rev);
          });

          it('should append azienda to aziende', function () {
            expectAppendedAzienda();
          });

          it('should redirect to azienda page', function () {
            expect(scope.$service('$location').path()).toBe('/Azienda_010101');
          });

        });

        describe('existing document', function () {

          beforeEach(function () {
            ctrl.select(0);
            doSave();
          });

          it('should update _rev field to the returned revision', function () {
            expect(ctrl.azienda._rev).toBe(okResponse.rev);
          });

          it('should update aziende when saving updates to azienda', function () {
            expect(ctrl.azienda).toEqualData(ctrl.aziende.rows[0].doc);
          });
        });
      });


      describe('select', function () {

        it('should copy to azienda from aziende at given index', function () {
          ctrl.select(1);
          expect(ctrl.azienda).toEqualData(ctrl.aziende.rows[1].doc);
          expect(ctrl.azienda === ctrl.aziende.rows[1].doc).toBe(false);
        });

        it('should cache selected index in aziendaIdx', function () {
          ctrl.select(0);
          expect(ctrl.aziendaIdx).toBe(0);
          ctrl.select(1);
          expect(ctrl.aziendaIdx).toBe(1);
        });
      });


      describe('selectCodice', function () {

        it('should copy to azienda from aziende with given codice', function () {
          expect(ctrl.selectCodice('000000')).toBe(false);
          expect(ctrl.azienda).toEqualData({});
          expect(ctrl.selectCodice('099997')).toBe(true);
          expect(ctrl.azienda).toEqualData(aziende.rows[1].doc);
          expect(ctrl.azienda === ctrl.aziende.rows[1].doc).toBe(false);
        });
      });


      describe('getAziendaAtIdx', function () {

        it('should return undefined if aziendaIdx is undefined', function () {
          ctrl.aziendaIdx = undefined;
          expect(ctrl.getAziendaAtIdx()).toBeUndefined();
        });

        it('should return the first record in aziende if aziendaIdx is 0', function () {
          ctrl.aziendaIdx = 0;
          expect(ctrl.getAziendaAtIdx()).toBe(ctrl.aziende.rows[0].doc);
        });
      });


      describe('isIdChanged', function () {
        it('should return true only if _id of azienda is not equal to _id of azienda at aziendaIdx', function () {
          ctrl.select(0);
          expect(ctrl.isIdChanged()).toBe(false);
          ctrl.azienda._id = 'Azienda_999999';
          expect(ctrl.isIdChanged()).toBe(true);
        });
      });
    });
  });


  describe('RicercaBollaAs400', function () {
    var scalarini = { posizioniCodici: {
        '2': ["44", "46", "48", "50", "52", "54", "56", "58", "60", "62", "64", "66"],
        '3': ["01"]
      }},
      causaliAs400 = {
        '1': { '98': ['VENDITA', -1] }
      },
      intestazione = { data: '110704', numero: '1234', enteNumerazione: 'Y', codiceNumerazione: '10' },
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
        _id: 'BollaAs400_110704_1234_Y_10',
        codiceCliente: '002812',
        tipoMagazzino: '1',
        codiceMagazzino: 'C',
        causale: ['98', 'VENDITA', -1],
        rows: [
          ['112708995017800044', 1],
          ['112708995017800046', 2],
          ['114802435157718466', 2]
        ]
      };

    describe('actions', function () {

      function newController() {
        $browser.xhr.expectGET('/boutique_db/Scalarini').respond(JSON.stringify(scalarini));
        $browser.xhr.expectGET('/boutique_db/CausaliAs400').respond(JSON.stringify(causaliAs400));
        ctrl = scope.$new(Ctrl.RicercaBollaAs400);
      }

      beforeEach(function () {
        newController();
        $browser.xhr.flush();
      });

      describe('buildId', function () {
        it('should put, in this order, "data", "numero", "enteNumerazione", and "codiceNumerazione" in the id', function () {
          ctrl.intestazione = intestazione;
          expect(ctrl.buildId()).toBe('BollaAs400_110704_1234_Y_10');
        });
      });

      describe('buildBolla', function () {
        it('should put codiceCliente, tipoMagazzino, codiceMagazzino, and causale in the doc', function () {
          ctrl.id = 'BollaAs400_110704_1234_Y_10';
          ctrl.bollaAs400 = bollaAs400;
          expect(ctrl.buildBolla()).toEqual(bollaDoc);
        });
      });

      describe('save', function () {
        function doSave() {
          $browser.xhr.expectPUT('/boutique_db/' + bollaDoc._id, bollaDoc).respond(JSON.stringify(okResponse));
          ctrl.save();
          $browser.xhr.flush();
        }

        it('should put the document', function () {
          ctrl.id = bollaDoc._id;
          ctrl.bollaAs400 = bollaAs400;
          doSave();
        });
      });

      describe('fetch', function () {
        it('should GET bolla only from CouchDB if already present', function () {
          $browser.xhr.expectGET('/boutique_db/' + bollaDoc._id).respond(JSON.stringify(bollaDoc));
          $browser.xhr.expectGET('/boutique_app/as400/bolla/data=110704/numero=1234/enteNumerazione=Y/codiceNumerazione=10').respond(JSON.stringify(bollaAs400));
          ctrl.intestazione = intestazione;
          ctrl.fetch();
          $browser.xhr.flush();
        });
      });
    });
  });
});