/*jslint nomen: true */
/*global angular: false, validate_doc_update: false, Ctrl: false */

(function () {
  'use strict';

  /* App service which is responsible for the main configuration of the app. */
  angular.service('Boutique', function ($route, $window) {

    $route.when('/Azienda_:codice', { template: 'partials/azienda.html', controller: Ctrl.Azienda });
    $route.when('/Azienda', { template: 'partials/azienda.html', controller: Ctrl.Azienda });
    $route.when('/BollaAs400_:codice', { template: 'partials/ricerca-bolla-as400.html', controller: Ctrl.RicercaBollaAs400 });
    $route.when('/BollaAs400', { template: 'partials/ricerca-bolla-as400.html', controller: Ctrl.RicercaBollaAs400 });
    $route.when('/ricerca-articoli', { template: 'partials/ricerca-articoli.html', controller: Ctrl.RicercaArticoli });
    $route.when('/ricerca-giacenza', { template: 'partials/ricerca-giacenza.html', controller: Ctrl.RicercaArticoli });
    $route.otherwise({ redirectTo: '/' });

    this.$on('$afterRouteChange', function () {
      $window.scrollTo(0, 0);
    });

  }, { $inject: ['$route', '$window'], $eager: true });


  angular.service('$xhr.error', function ($route) {
    return function (request, response) {
      var msg, body;
      if (response) {
        body = response.body;
        msg = 'ERROR ' + response.status + ': ' + (typeof body !== 'string' ? JSON.stringify(body) : body);
      } else {
        msg = 'REQUEST FAILED: ' + JSON.stringify(request);
      }
      $route.current.scope.flash = { errors: [{ message: msg }] };
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
      return r.query(range('Azienda'), success, error);
    };

    r.clienti = function (azienda, success) {
      var baseId = azienda.replace(/^Azienda_/, 'Cliente_');
      return r.query(range(baseId), success);
    };

    r.toAziendaId = function (codice) {
      if (codice) {
        return 'Azienda_' + codice;
      }
    };

    r.toCodice = function (id) {
      var ids = /^[A-Z][a-zA-Z]+_([0-9][0-9_]*)$/.exec(id);
      if (ids) {
        return ids[1];
      }
    };

    return r;
  }, { $inject: ['$resource'] });


  angular.service('As400', function ($xhr) {
    return {
      bolla: function (intestazioneBolla, success) {
        var p, params = [];
        for (p in intestazioneBolla) {
          if (intestazioneBolla.hasOwnProperty(p)) {
            params.push(p + '=' + intestazioneBolla[p]);
          }
        }
        $xhr('GET', '/boutique_app/as400/bolla/' + params.join('/'), success);
      }
    };
  }, { $inject: ['$xhr'] });


  angular.service('userCtx', function () {
    return {
      name: 'boutique'
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