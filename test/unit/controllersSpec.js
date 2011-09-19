/*global describe: false, beforeEach: false, it: false, expect: false, angular: false,
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

    it('should populate "aziende" model with all aziende fetched from xhr', function () {
      expect(ctrl.aziende).toEqualData({});
      $browser.xhr.flush();
      expect(ctrl.aziende).toEqualData(aziende);
    });
    
    it('should set codice and azienda based on $routeParams.codice', function () {
      $routeParams.codice = '099997';
      expect(ctrl.codice).toBeUndefined();
      expect(ctrl.azienda).toEqualData({});
      $browser.xhr.flush();
      expect(ctrl.codice).toBe('099997');
      expect(ctrl.azienda).toEqualData(aziende.rows[1].doc);
    });
    
    describe('save', function () {
      it('should PUT the data to the DB', function () {
        $browser.xhr.expectPUT('/boutique_db/azienda_010101', { nome: 'Azienda 010101' }).respond({ ok: true });
        ctrl.codice = '010101';
        ctrl.azienda.nome = 'Azienda 010101';
        ctrl.save();
      });
    });
    
    describe('select', function () {
      it('should put the azienda at given index from aziende to azienda and set codice', function () {
        $browser.xhr.flush();
        ctrl.select(1);
        expect(ctrl.codice).toBe('099997');
        expect(ctrl.azienda).toEqualData(aziende.rows[1].doc);
      });
    });
    
    describe('selectCodice', function () {
      it('should put the azienda with given codice from aziende to azienda and set codice', function () {
        $browser.xhr.flush();
        expect(ctrl.selectCodice('000000')).toBe(false);
        expect(ctrl.codice).toBeUndefined();
        expect(ctrl.azienda).toEqualData({});
        expect(ctrl.selectCodice('099997')).toBe(true);
        expect(ctrl.codice).toBe('099997');
        expect(ctrl.azienda).toEqualData(aziende.rows[1].doc);
      });
    });
  });
});
