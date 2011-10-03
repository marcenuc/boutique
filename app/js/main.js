/*global require: false, angular: false, document: false */

require(['domReady!', 'order!angular/angular', 'order!validate_doc_update', 'order!services', 'order!controllers', 'order!filters'], function () {
  'use strict';
  angular.compile(document)().$digest();
});
