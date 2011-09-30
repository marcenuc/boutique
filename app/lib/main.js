/*global require: false, angular: false, document: false */

require(['order!lib/angular/angular.js', 'order!js/validate_doc_update.js', 'order!js/services.js', 'order!js/controllers.js', 'order!js/filters.js'], function () {
  'use strict';
  require.ready(function () {
    angular.compile(document)().$digest();
  });
});
