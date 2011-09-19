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
  this.codice = $routeParams.codice;
  this.azienda = {};
  this.flash = {};
}
AziendaCtrl.$inject = ['$routeParams', 'Document', 'Validator'];

AziendaCtrl.prototype = {
  validate: function (docId) {
    'use strict';
    this.flash = this.Validator.check(this.azienda, {}, docId);
    return this.flash.errors.length === 0;
  },
  save: function () {
    'use strict';
    var self = this,
      docId = this.azienda._id || 'azienda_' + this.codice;
    if (this.validate(docId)) {
      this.Document.save({ id: docId }, this.azienda, function (res) {
        self.azienda._rev = res.rev;
      });
    }
  },
  select: function (idx) {
    'use strict';
    this.azienda = this.aziende.rows[idx].doc;
    this.codice = this.azienda._id.split('_', 2)[1];
  },
  selectCodice: function (codice) {
    'use strict';
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