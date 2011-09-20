/*jslint nomen: true */
/*global angular: false, validate_doc_update: false,
         AziendaCtrl: false */

(function () {
  'use strict';
  
  /* App service which is responsible for the main configuration of the app. */
  angular.service('Boutique', function ($route, $window) {

    $route.when('/azienda/:codice', { template: 'partials/azienda.html', controller: AziendaCtrl });
    $route.otherwise({ redirectTo: '/' });

    var self = this;

    self.$on('$afterRouteChange', function () {
      $window.scrollTo(0, 0);
    });

  }, { $inject: ['$route', '$window'], $eager: true });


  angular.service('Document', function ($resource) {
    var r = $resource('/boutique_db/:id', { id: '@_id' }, {
      query: {
        method: 'GET',
        isArray: false,
        params: {
          id: '_all_docs',
          include_docs: 'true'
        }
      },
      save: { method: 'PUT' }
    });
  
    function range(key) {
      return {
        startkey: '"' + key + '_"',
        endkey: '"' + key + '_\uFFF0"'
      };
    }

    r.aziende = function (success) {
      return r.query(range('azienda'), success);
    };
  
    r.clienti = function (azienda, success) {
      var baseId = azienda.replace(/^azienda_/, 'cliente_');
      return r.query(range(baseId), success);
    };
  
    return r;
  }, { $inject: ['$resource'] });


  angular.service('userCtx', function () {
    return {
      name: 'boutique',
      browser: true
    };
  });


  angular.service('Validator', function (userCtx) {
    return { 
      check: function (doc, oldDoc) {
        return validate_doc_update(doc, oldDoc, userCtx);
      }
    };
  }, { $inject: ['userCtx'] });
}());