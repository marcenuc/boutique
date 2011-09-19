function AziendaCtrl($routeParams, Document) {
  'use strict';
  var self = this;
  this.aziende = Document.aziende(function () {
    if ($routeParams.codice) {
      self.selectCodice($routeParams.codice);
    }
  });
  this.codice = $routeParams.codice;
  this.azienda = new Document({});
}
AziendaCtrl.$inject = ['$routeParams', 'Document'];

AziendaCtrl.prototype = {
  save: function () {
    'use strict';
    this.azienda.$save({ id: 'azienda_' + this.codice });
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