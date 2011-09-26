/*global describe: false, beforeEach: false, afterEach: false, it: false, jasmine: false,
         expect: false, angular: false */

describe('Services', function () {
  'use strict';

  var scope = null;

  beforeEach(function () {
    scope = angular.scope();
  });

  describe('$xhr.error', function () {
    var xhrError = null, $route = null;

    beforeEach(function () {
      xhrError = scope.$service('$xhr.error');
      $route = scope.$service('$route');
    });

    it('should set flash in current scope', function () {
      $route.reload();
      scope.$digest();
      $route.current.scope = scope;
      xhrError(500, 'Ouch!');
      expect(scope.flash).toEqual({ errors: [{ message: 'ERROR 500: "Ouch!"' }]});
    });
  });


  describe('with XHR', function () {
    var $browser = null;

    beforeEach(function () {
      $browser = scope.$service('$browser');
    });

    afterEach(function () {
      expect($browser.xhr.requests.length).toBe(0, 'You have not flushed the $browser.xhr requests.');
    });

    describe('Document', function () {
      var Document = null;

      beforeEach(function () {
        Document = scope.$service('Document');
      });

      describe('get', function () {
        it('should query couchdb for the document with the given id', function () {
          var scalarini, resp = { _id: 'scalarini', data: 'abcd' };
          $browser.xhr.expectGET('/boutique_db/scalarini').respond(JSON.stringify(resp));
          scalarini = Document.get({ id: resp._id });
          expect(scalarini).toEqualData({});
          $browser.xhr.flush();
          expect(scalarini).toEqualData(resp);
        });
      });

      describe('aziende', function () {
        it('should query couchdb for all docs of type azienda', function () {
          $browser.xhr.expectGET('/boutique_db/_all_docs?endkey=%22azienda_%EF%BF%B0%22&include_docs=true&startkey=%22azienda_%22').respond({ rows: [] });
          var query = Document.aziende();
          expect(query).toEqualData({});
          $browser.xhr.flush();
          expect(query).toEqualData({ rows: [] });
        });
      });


      describe('clienti', function () {
        it('should query couchdb for all docs of type cliente', function () {
          $browser.xhr.expectGET('/boutique_db/_all_docs?endkey=%22cliente_010101_%EF%BF%B0%22&include_docs=true&startkey=%22cliente_010101_%22').respond({ rows: [] });
          var query = Document.clienti('azienda_010101');
          expect(query).toEqualData({});
          $browser.xhr.flush();
          expect(query).toEqualData({ rows: [] });
        });
      });


      describe('save', function () {

        it('should PUT new documents', function () {
          var data = { nome: 'Azienda 010101' },
            azienda = new Document(data),
            response = { ok: true, id: 'azienda_010101', rev: '946B7D1C' };

          $browser.xhr.expectPUT('/boutique_db/azienda_010101', data).respond(response);
          azienda.$save({ id: 'azienda_010101' }, function (resp) {
            expect(resp).toEqualData(response);
          });
          $browser.xhr.flush();
        });

        it('should PUT updated documents', function () {
          var data = { _id: 'azienda_010101', nome: 'Azienda 010101' },
            azienda = new Document(data),
            response = { ok: true, id: 'azienda_010101', rev: '946B7D1C' };
          $browser.xhr.expectPUT('/boutique_db/azienda_010101', data).respond(response);
          azienda.$save(function (resp) {
            expect(resp).toEqualData(response);
          });
          $browser.xhr.flush();
        });
      });


      describe('toAziendaId', function () {

        it('should return "azienda_010101" for codice "010101"', function () {
          expect(Document.toAziendaId('010101')).toBe('azienda_010101');
        });

        it('should return undefined for undefined, null, or blank codice', function () {
          expect(Document.toAziendaId()).toBeUndefined();
          expect(Document.toAziendaId(null)).toBeUndefined();
          expect(Document.toAziendaId('')).toBeUndefined();
        });
      });


      describe('toCodice', function () {

        it('should return "010101" for id "azienda_010101', function () {
          expect(Document.toCodice('azienda_010101')).toBe('010101');
        });

        it('should return "010101_10" for id "cliente_010101_10', function () {
          expect(Document.toCodice('cliente_010101_10')).toBe('010101_10');
        });

        it('should return undefined for undefined, null, or blank id', function () {
          expect(Document.toCodice()).toBeUndefined();
          expect(Document.toCodice(null)).toBeUndefined();
          expect(Document.toCodice('')).toBeUndefined();
        });
      });
    });

    describe('as400', function () {
      var As400 = null;

      beforeEach(function () {
        As400 = scope.$service('As400');
      });

      describe('bolla', function () {
        it('should query with the given parameters', function () {
          var intestazioneBolla = {
              data: '110704',
              numero: '40241',
              enteNumerazione: 'Y',
              codiceNumerazione: '10'
            };
          $browser.xhr.expectGET('/boutique_app/as400/bolla/data=110704/numero=40241/enteNumerazione=Y/codiceNumerazione=10').respond(JSON.stringify(intestazioneBolla));
          As400.bolla(intestazioneBolla, function (code, data) {
            expect(code).toBe(200);
            expect(data.numero).toBe(intestazioneBolla.numero);
          });
          $browser.xhr.flush();
        });
      });
    });
  });

  describe('userCtx', function () {
    it('should have "name" === "boutique"', function () {
      var userCtx = scope.$service('userCtx');
      expect(userCtx.name).toEqual('boutique');
    });
  });


  describe('Validator', function () {
    var Validator = null;

    beforeEach(function () {
      Validator = scope.$service('Validator');

      this.addMatchers({
        toHaveError: function (expected) {
          return this.actual.errors.some(function (e) {
            return e.message === expected;
          });
        }
      });
    });

    it('should require an authenticated user', function () {
      expect(angular.service('Validator')({}).check({})).toHaveError('Non autorizzato');
      expect(angular.service('Validator')({}).check({ _deleted: true })).toHaveError('Non autorizzato');
    });

    it('should not validate deleted documents', function () {
      expect(Validator.check({ _deleted: true }).errors.length).toBe(0);
    });

    it('should reject invalid types', function () {
      var msg = 'Invalid type';
      expect(Validator.check({})).toHaveError(msg);
      expect(Validator.check({ _id: 'NONVALIDTYPE_002' })).toHaveError(msg);
      expect(Validator.check({ _id: 'invalidid_' })).toHaveError(msg);
    });

    it('should reject unknown types', function () {
      var msg = 'Unknown type';
      expect(Validator.check({ _id: 'unknowntype_002' })).toHaveError(msg);
      expect(Validator.check({ _id: 'unknownid' })).toHaveError(msg);
    });

    it('should require six digits code for azienda', function () {
      var msg = 'Invalid azienda code';
      expect(Validator.check({ _id: 'azienda_1' })).toHaveError(msg);
      expect(Validator.check({ _id: 'azienda_000000' })).not.toHaveError(msg);
    });

    it('should require nome azienda', function () {
      var msg = 'Required: nome';
      expect(Validator.check({ _id: 'azienda_1' })).toHaveError(msg);
      expect(Validator.check({ _id: 'azienda_1', nome: ' ' })).toHaveError(msg);
      expect(Validator.check({ _id: 'azienda_1', nome: 'n' })).not.toHaveError(msg);
    });

    it('should forbid change of _id', function () {
      var msg = 'Invalid _id';
      expect(Validator.check({ _id: 'azienda_1' }, { _id: 'azienda_1' })).not.toHaveError(msg);
      expect(Validator.check({ _id: 'azienda_1' }, { _id: 'azienda_2' })).toHaveError(msg);
    });
  });
});
