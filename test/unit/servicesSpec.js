/*global describe: false, beforeEach: false, it: false, jasmine: false,
         expect: false, angular: false */

describe('Services', function () {
  'use strict';
  var scope = null,
    $browser = null;

  beforeEach(function () {
    scope = angular.scope();
    $browser = scope.$service('$browser');
  });

  describe('Document', function () {
    
    describe('aziende', function () {
      it('should query couchdb for all docs of type azienda', function () {
        var Document = scope.$service('Document'), query;
        $browser.xhr.expectGET('/boutique_db/_all_docs?endkey=%22azienda_%EF%BF%B0%22&include_docs=true&startkey=%22azienda_%22').respond({ rows: [] });
        query = Document.aziende();
        $browser.xhr.flush();
        expect(query).toEqualData({ rows: [] });
      });
    });
    
    describe('clienti', function () {
      it('should query couchdb for all docs of type cliente', function () {
        var Document = scope.$service('Document'), query;
        $browser.xhr.expectGET('/boutique_db/_all_docs?endkey=%22cliente_010101_%EF%BF%B0%22&include_docs=true&startkey=%22cliente_010101_%22').respond({ rows: [] });
        query = Document.clienti('azienda_010101');
        $browser.xhr.flush();
        expect(query).toEqualData({ rows: [] });
      });
    });
    
    describe('save', function () {
      it('should PUT new documents', function () {
        var Document = scope.$service('Document'),
          data = { nome: 'Azienda 010101' },
          azienda = new Document(data);
        $browser.xhr.expectPUT('/boutique_db/azienda_010101', data).respond('{"ok": true, "id": "azienda_010101", "rev": "946B7D1C"}');
        azienda.$save({ id: 'azienda_010101' });
        $browser.xhr.flush();
      });
      
      it('should PUT updated documents', function () {
        var Document = scope.$service('Document'),
          data = { _id: 'azienda_010101', nome: 'Azienda 010101' },
          azienda = new Document(data);
        $browser.xhr.expectPUT('/boutique_db/azienda_010101', data).respond('{"ok": true, "id": "azienda_010101", "rev": "946B7D1C"}');
        azienda.$save();
        $browser.xhr.flush();
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
