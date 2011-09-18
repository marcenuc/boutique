function AziendaCtrl(Document) {
  'use strict';
  this.aziende = Document.aziende();
  this.codice = '';
  this.azienda = new Document({});
}
AziendaCtrl.$inject = ['Document'];

AziendaCtrl.prototype = {
  save: function () {
    'use strict';
    this.azienda.$save({ id: 'azienda_' + this.codice });
  }
};