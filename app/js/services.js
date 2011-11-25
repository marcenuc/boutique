/*jslint nomen: true */
/*global angular: false, validate_doc_update: false, Ctrl: false*/

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
      $route.current.scope.SessionInfo.error(msg);
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

    r.listini = function (success, error) {
      return r.query(range('Listino'), success, error);
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


  angular.service('SessionInfo', function ($resource, Document, xhrError, $location) {
    var info = { loading: 0, flash: {} };

    function loaded() {
      info.loading -= 1;
    }

    info.getResource = function (resourceUrl) {
      info.loading += 1;
      return $resource(resourceUrl).get(loaded, function (code, response) {
        loaded();
        xhrError({ url: resourceUrl }, { status: code, body: response });
      });
    };

    // TODO DRY there's lot of repetition in this code
    info.getDocument = function (id, success, error) {
      info.loading += 1;
      return Document.get({ id: id }, function () {
        loaded();
        if (success) {
          success.apply(this, arguments);
        }
      }, function (code, response) {
        loaded();
        if (error) {
          error.apply(this, arguments);
        } else {
          xhrError({ url: id }, { status: code, body: response });
        }
      });
    };
    ['aziende', 'listini'].forEach(function (klass) {
      info[klass] = function (success, error) {
        info.loading += 1;
        return Document[klass](function () {
          loaded();
          if (success) {
            success.apply(this, arguments);
          }
        }, function (code, response) {
          loaded();
          if (error) {
            error.apply(this, arguments);
          } else {
            xhrError({ url: klass }, { status: code, body: response });
          }
        });
      };
    });
    info.save = function (data, success, error) {
      info.loading += 1;
      return Document.save(data, function () {
        loaded();
        if (success) {
          success.apply(this, arguments);
        }
      }, function (code, response) {
        loaded();
        if (error) {
          error.apply(this, arguments);
        } else {
          xhrError({ data: data }, { status: code, body: response });
        }
      });
    };

    info.resetFlash = function () {
      if (info.keepFlash) {
        delete info.keepFlash;
      } else {
        info.flash = {};
      }
    };
    info.setFlash = function (flash) {
      info.flash = flash;
      return flash.hasOwnProperty('errors') && flash.errors.length;
    };
    info.error = function (msg, append) {
      if (!append) {
        info.resetFlash();
      }
      if (!info.flash.hasOwnProperty('errors')) {
        info.flash.errors = [];
      }
      info.flash.errors.push({ message: msg });
    };
    info.notice = function (msg, append) {
      if (!append) {
        info.resetFlash();
      }
      if (!info.flash.hasOwnProperty('notices')) {
        info.flash.notices = [];
      }
      info.flash.notices.push({ message: msg });
    };

    info.goTo = function (path) {
      info.keepFlash = true;
      $location.path(path).replace();
    };
    return info;
  }, { $inject: ['$resource', 'Document', '$xhr.error', '$location'] });

  // TODO
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