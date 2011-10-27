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
    $route.when('/MovimentoMagazzino', { template: 'partials/movimento-magazzino.html', controller: Ctrl.MovimentoMagazzino });
    $route.when('/MovimentoMagazzino_:codice', { template: 'partials/movimento-magazzino.html', controller: Ctrl.MovimentoMagazzino });
    $route.when('/Listino', { template: 'partials/listino.html', controller: Ctrl.Listino });
    $route.when('/Listino_:codice', { template: 'partials/edit-listino.html', controller: Ctrl.Listino });
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


  angular.service('CdbView', function ($resource) {
    var view = $resource('/boutique_db/_design/boutique_db/_view/:id', { id: '@_id' }, {
      riferimentiMovimentiMagazzino: {
        method: 'GET',
        isArray: false,
        params: {
          id: 'riferimentiMovimentiMagazzino'
        }
      },
      serialiMovimentiMagazzino: {
        method: 'GET',
        isArray: false,
        params: {
          id: 'serialiMovimentiMagazzino'
        }
      }
    });

    view.ultimoMovimentoMagazzino = function (codiceAzienda, anno, success, error) {
      return view.serialiMovimentiMagazzino({
        include_docs: 'false',
        descending: 'true',
        limit: 1,
        startkey: [codiceAzienda, anno, {}],
        endkey: [codiceAzienda, anno]
      }, success, error);
    };

    view.riferimentoMovimentoMagazzino = function (idRiferimento, success, error) {
      return view.riferimentiMovimentiMagazzino({ key: JSON.stringify(idRiferimento) }, success, error);
    };

    return view;
  }, { $inject: ['$resource'] });

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

    r.clienti = function (codiceAzienda, success) {
      var baseId = codiceAzienda.replace(/^Azienda_/, 'Cliente_');
      return r.query(range(baseId), success);
    };

    return r;
  }, { $inject: ['$resource'] });


  angular.service('As400', function ($xhr) {
    return {
      bolla: function (intestazioneBolla, success) {
        var k, v, params = ['/boutique_app/as400/bolla'];
        for (k in intestazioneBolla) {
          if (intestazioneBolla.hasOwnProperty(k)) {
            v = intestazioneBolla[k];
            if (k === 'data' && v.length === 8) {
              v = v.substring(2);
            }
            params.push(k + '=' + v);
          }
        }
        $xhr('GET', params.join('/'), success);
      }
    };
  }, { $inject: ['$xhr'] });


  angular.service('userCtx', function () {
    return {
      name: 'commerciale',
      roles: ['boutique']
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