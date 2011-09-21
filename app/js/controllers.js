/*global angular: false */

function AziendaCtrl($routeParams, Document, Validator, userCtx, $location) {
  'use strict';
  var self = this;
  this.Document = Document;
  this.Validator = Validator;
  this.userCtx = userCtx;
  this.$location = $location;

  this.aziende = Document.aziende(function () {
    if ($routeParams.codice) {
      self.selectCodice($routeParams.codice);
    }
  });
  this.azienda = { _id: Document.toAziendaId($routeParams.codice) };

  this.flash = userCtx.flash;
  userCtx.flash = {};
}
AziendaCtrl.$inject = ['$routeParams', 'Document', 'Validator', 'userCtx', '$location'];

(function () {
  'use strict';

  AziendaCtrl.prototype = {

    getAziendaAtIdx: function () {
      if (angular.isDefined(this.aziendaIdx)) {
        return this.aziende.rows[this.aziendaIdx].doc;
      }
    },

    isIdChanged: function () {
      var selectedAzienda = this.getAziendaAtIdx();
      return selectedAzienda && selectedAzienda._id !== this.azienda._id;
    },

    validate: function () {
      this.flash = this.Validator.check(this.azienda, this.getAziendaAtIdx());
      return this.flash.errors.length === 0;
    },

    save: function () {
      var self = this;
      if (this.isIdChanged()) {
        delete this.azienda._rev;
        delete this.aziendaIdx;
      }
      if (this.validate()) {
        this.Document.save(this.azienda, function (res) {
          var isNew = !self.azienda._rev,
            notice = { notice: [{ message: 'Salvato' }] };
          self.azienda._rev = res.rev;
          if (isNew) {
            self.userCtx.flash = notice;
            self.aziende.rows.push({ doc: angular.copy(self.azienda) });
            self.$location.path('/azienda/' + self.Document.toCodice(self.azienda._id)).replace();
          } else {
            self.flash = notice;
            angular.copy(self.azienda, self.aziende.rows[self.aziendaIdx].doc);
          }
        });
      }
    },

    select: function (idx) {
      this.azienda = angular.copy(this.aziende.rows[idx].doc);
      this.aziendaIdx = idx;
    },

    selectCodice: function (codice) {
      var self = this,
        id = this.Document.toAziendaId(codice);
      return this.aziende.rows.some(function (row, idx) {
        if (row.id === id) {
          self.select(idx);
          return true;
        }
      });
    }
  };
}());