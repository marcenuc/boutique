/*global describe: false, beforeEach: false, afterEach: false, it: false, expect: false, angular: false,
         AziendaCtrl: false */

describe('Controllers', function () {
  'use strict';
  
  var aziende = {
    "total_rows" : 15,
    "offset" : 1,
    "rows" : [ {
      "id" : "azienda_019998",
      "key" : "azienda_019998",
      "value" : { "rev" : "1-d6363be2d62ec0f2eb5b961527bdddbf" },
      "doc" : {
        "_id" : "azienda_019998",
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
      "id" : "azienda_099997",
      "key" : "azienda_099997",
      "value" : { "rev" : "2-9415d085eb2ad39b3d7e40cab79cbf5b" },
      "doc" : {
        "_id" : "azienda_099997",
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
      
  describe('AziendaCtrl', function () {
    var scope, $browser = null, $routeParams = null, ctrl = null;

    beforeEach(function () {
      scope = angular.scope();
      $browser = scope.$service('$browser');
      $routeParams = scope.$service('$routeParams');

      $browser.xhr.expectGET('/boutique_db/_all_docs?endkey=%22azienda_%EF%BF%B0%22&include_docs=true&startkey=%22azienda_%22').respond(aziende);
      ctrl = scope.$new(AziendaCtrl);
    });
    
    afterEach(function () {
      expect($browser.xhr.requests.length).toBe(0, 'You have not flushed the $browser.xhr requests.');
    });
    
    
    describe('inizialization', function () {
      it('should have an empty list of aziende before fetching', function () {
        expect(ctrl.aziende).toEqualData({});
        $browser.xhr.flush();
      });

      it('should populate "aziende" model with all aziende fetched from xhr', function () {
        $browser.xhr.flush();
        expect(ctrl.aziende).toEqualData(aziende);
      });
      
      it('should set azienda._id to $routeParams.codice after fetching aziende', function () {
        $routeParams.codice = '099997';        
        $browser.xhr.flush();
        expect(ctrl.azienda).toEqual(aziende.rows[1].doc);
      });
    });
    

    describe('actions', function () {
      beforeEach(function () {
        $browser.xhr.flush();
      });
      
      describe('save', function () {
        it('should not submit the data if not valid', function () {
          ctrl.azienda = { _id: 'azienda_010101', _rev: '1', nome: ''};
          ctrl.save();
          expect(ctrl.azienda._rev).toBe('1');
          expect(ctrl.flash.errors[0]).toEqual({ message: 'Required: nome' });
        });
      
        it('should set _rev field in new documents', function () {
          ctrl.azienda = { _id: 'azienda_010101', nome: 'Nuova azienda' };
          $browser.xhr.expectPUT('/boutique_db/azienda_010101', ctrl.azienda).respond({ ok: true, rev: '1' });
          ctrl.save();
          $browser.xhr.flush();
          expect(ctrl.azienda._rev).toBe('1');
        });
      
        it('should update _rev field in existing documents', function () {
          ctrl.azienda = { _id: 'azienda_010101', _rev: '1', nome: 'Vecchia azienda' };
          $browser.xhr.expectPUT('/boutique_db/azienda_010101', ctrl.azienda).respond({ ok: true, rev: '2' });
          ctrl.save();
          $browser.xhr.flush();
          expect(ctrl.azienda._rev).toBe('2');
        });
      });
    
      describe('select', function () {
        it('should copy to azienda from aziende at given index', function () {
          ctrl.select(1);
          expect(ctrl.azienda).toEqualData(aziende.rows[1].doc);
          expect(ctrl.azienda === ctrl.aziende.rows[1].doc).toBe(false);
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
    });
  });
});