/*global angular: false */

function AziendaCtrl($routeParams, Document, Validator) {
  'use strict';
  var self = this;
  this.Document = Document;
  this.Validator = Validator;
  
  this.aziende = Document.aziende(function () {
    if ($routeParams.codice) {
      self.selectCodice($routeParams.codice);
    }
  });
  this.azienda = { _id: $routeParams.codice };
  this.flash = {};
}
AziendaCtrl.$inject = ['$routeParams', 'Document', 'Validator'];

(function () {
  'use strict';
  
  AziendaCtrl.prototype = {
      
    validate: function () {
      this.flash = this.Validator.check(this.azienda);
      return this.flash.errors.length === 0;
    },
    
    save: function () {
      var self = this;
      if (this.validate()) {
        this.Document.save(this.azienda, function (res) {
          self.azienda._rev = res.rev;
          self.flash.notice = [{ message: 'Salvato' }];
        });
      }
    },
    
    select: function (idx) {
      this.azienda = angular.copy(this.aziende.rows[idx].doc);
    },
    
    selectCodice: function (codice) {
      var self = this,
        id = 'azienda_' + codice;
      return this.aziende.rows.some(function (row, idx) {
        if (row.id === id) {
          self.select(idx);
          return true;
        }
      });
    }
  };
}());