/*global describe: false, beforeEach: false, afterEach: false, it: false, jasmine: false,
         expect: false, angular: false */

describe('Services', function () {
  'use strict';

  var scope = null, $browser = null;

  beforeEach(function () {
    scope = angular.scope();
    $browser = scope.$service('$browser');
  });

  describe('Document', function () {
    var Document = null;

    beforeEach(function () {
      Document = scope.$service('Document');
    });

    afterEach(function () {
      expect($browser.xhr.requests.length).toBe(0, 'You have not flushed the $browser.xhr requests.');
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


  describe('userCtx', function () {
    /**
     * userCtx.browser is used by validate_doc_update() to know the context
     * of execution: if "undefined", it's running in CouchDB.
     */
    it('should have "browser" === true', function () {
      var userCtx = scope.$service('userCtx');
      expect(userCtx.browser).toEqual(true);
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
      expect(angular.service('Validator')({ browser: true }).check({})).toHaveError('Non autorizzato');
      expect(angular.service('Validator')({ browser: true }).check({ _deleted: true })).toHaveError('Non autorizzato');
    });

    it('should not validate deleted documents', function () {
      expect(Validator.check({ _deleted: true }).errors.length).toBe(0);
    });

    it('should reject unknown or invalid type', function () {
      var msg = 'Invalid type';
      expect(Validator.check({})).toHaveError(msg);
      expect(Validator.check({ _id: 'NOVALIDTYPE_002' })).toHaveError(msg);
      expect(Validator.check({ _id: 'unknowntype_002' })).toHaveError(msg);
      expect(Validator.check({ _id: 'invalidid' })).toHaveError(msg);
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
  });
});
