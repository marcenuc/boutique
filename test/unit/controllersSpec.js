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
    var scope, $browser = null, ctrl = null;

    beforeEach(function () {
      scope = angular.scope();
      $browser = scope.$service('$browser');

      $browser.xhr.expectGET('/boutique_db/_all_docs?endkey=%22azienda_%EF%BF%B0%22&include_docs=true&startkey=%22azienda_%22').respond(aziende);
      ctrl = scope.$new(AziendaCtrl);
    });

    it('should populate "aziende" model with all aziende fetched from xhr', function () {
      expect(ctrl.aziende).toEqualData({});
      $browser.xhr.flush();
      expect(ctrl.aziende).toEqualData(aziende);
    });
    
    it('should set default azienda to new empty document', function () {
      expect(ctrl.azienda).toEqualData({});
    });
    
    describe('save', function () {
      it('should ', function () {
        $browser.xhr.expectPUT('/boutique_db/azienda_010101', { nome: 'Azienda 010101' }).respond({ ok: true });
        ctrl.codice = '010101';
        ctrl.azienda.nome = 'Azienda 010101';
        ctrl.save();
      });
    });
  });
});
