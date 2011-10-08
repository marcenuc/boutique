/*global require: false, angular: false, document: false */

require(['domReady!', 'order!angular/angular', 'order!validate_doc_update', 'order!services', 'order!controllers', 'order!filters'], function () {
  'use strict';
  //TODO $digest() non servirà più nella prossima versione: rimuovere dopo aggiornamento.
  angular.compile(document)().$digest();
});
