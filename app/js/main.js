/*global require:false, angular:false, document:false*/

require(['jszip', 'angular', 'config', 'codici', 'validators', 'app', 'services', 'controllers', 'filters', 'widgets'], function () {
  'use strict';
  angular.element(document).ready(function () {
    angular.bootstrap(document, ['app']);
  });
});
