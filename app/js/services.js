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

  angular.service('$xhr.error', function ($route) {
    return function (request, response) {
      $route.current.scope.flash = { errors: [{ message: 'ERROR ' + request + ': ' + JSON.stringify(response) }] };
    };
  }, { $inject: ['$route'], $eager: true });

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

    r.aziende = function (success, error) {
      return r.query(range('azienda'), success, error);
    };

    r.clienti = function (azienda, success) {
      var baseId = azienda.replace(/^azienda_/, 'cliente_');
      return r.query(range(baseId), success);
    };

    r.toAziendaId = function (codice) {
      if (codice) {
        return 'azienda_' + codice;
      }
    };

    r.toCodice = function (id) {
      var ids = /^[a-z]+_([0-9][0-9_]*)$/.exec(id);
      if (ids) {
        return ids[1];
      }
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