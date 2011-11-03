/*global require: false, angular: false, document: false */

require(['domReady!', 'order!angular/angular', 'order!codici', 'order!validate_doc_update', 'order!services', 'order!controllers', 'order!filters', 'order!directives'], function () {
  'use strict';
  angular.compile(document)().$apply();
});
