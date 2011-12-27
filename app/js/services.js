/*jslint nomen: true */
/*global angular: false, validate_doc_update: false, Ctrl: false, CONFIG: false, CODICI: false, JSZip: false, document: false*/

(function () {
  'use strict';
  var VIEW_NAMES = ['aziende', 'contatori', 'movimentoMagazzinoPendente', 'riferimentiMovimentiMagazzino'];

  /* App service which is responsible for the main configuration of the app. */
  angular.service('Boutique', function ($route, $window) {
    $route.when('/Azienda_:codice', { template: 'partials/azienda.html', controller: Ctrl.Azienda });
    $route.when('/Azienda', { template: 'partials/azienda.html', controller: Ctrl.Azienda });
    $route.when('/BollaAs400_:codice', { template: 'partials/ricerca-bolla-as400.html', controller: Ctrl.RicercaBollaAs400 });
    $route.when('/BollaAs400', { template: 'partials/ricerca-bolla-as400.html', controller: Ctrl.RicercaBollaAs400 });
    $route.when('/ricerca-giacenza', { template: 'partials/ricerca-giacenza.html', controller: Ctrl.RicercaArticoli });
    $route.when('/MovimentoMagazzino', { template: 'partials/movimento-magazzino.html', controller: Ctrl.MovimentoMagazzino });
    $route.when('/MovimentoMagazzino_', { template: 'partials/new-movimento-magazzino.html', controller: Ctrl.NewMovimentoMagazzino });
    $route.when('/MovimentoMagazzino_:codice', { template: 'partials/edit-movimento-magazzino.html', controller: Ctrl.EditMovimentoMagazzino });
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
    var view, views = {};

    VIEW_NAMES.forEach(function (viewName) {
      views[viewName] = {
        method: 'GET',
        params: { id: viewName }
      };
    });
    view = $resource('/' + CONFIG.db + '/_design/' + CONFIG.designDoc + '/_view/:id', { id: '@_id' }, views);

    view.ultimoNumero = function (codiceAzienda, anno, gruppo, success, error) {
      var year = parseInt(anno, 10);
      return view.contatori({
        descending: 'true',
        limit: 1,
        startkey: JSON.stringify([codiceAzienda, year, gruppo, {}]),
        endkey: JSON.stringify([codiceAzienda, year, gruppo])
      }, success, error);
    };

    view.riferimentoMovimentoMagazzino = function (idRiferimento, success, error) {
      return view.riferimentiMovimentiMagazzino({ key: JSON.stringify(idRiferimento) }, success, error);
    };

    return view;
  }, { $inject: ['$resource'] });

  angular.service('Document', function ($resource) {
    var r = $resource('/' + CONFIG.db + '/:id', { id: '@_id' }, {
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

    r.listini = function (success, error, mangler) {
      return r.query(range('Listino'), undefined, success, error, mangler);
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
        var k, v, params = ['../as400/bolla'];
        for (k in intestazioneBolla) {
          if (intestazioneBolla.hasOwnProperty(k)) {
            v = intestazioneBolla[k];
            if (k === 'data' && v.length === 8) {
              // as400 uses 6 digits dates
              v = v.substring(2);
            }
            params.push(k + '=' + v);
          }
        }
        $xhr('GET', params.join('/'), success);
      }
    };
  }, { $inject: ['$xhr'] });


  angular.service('SessionInfo', function ($resource, Document, xhrError, $location, CdbView) {
    var info = { loading: 0, flash: {} };

    function loaded() {
      info.loading -= 1;
    }

    function loadedError(url, code, response) {
      loaded();
      xhrError({ url: url }, { status: code, body: response });
    }

    info.getResource = function (resourceUrl) {
      info.loading += 1;
      return $resource(resourceUrl).get(loaded, angular.bind(this, loadedError, resourceUrl));
    };

    info.getDocument = function (id) {
      info.loading += 1;
      return Document.get({ id: id }, loaded, angular.bind(this, loadedError, id));
    };
    info.prossimoNumero = function (codiceAzienda, anno, gruppo, success) {
      info.loading += 1;
      return CdbView.ultimoNumero(codiceAzienda, anno, gruppo,
        function (res) {
          loaded();
          var numero = res.rows.length ? res.rows[0].key[3] : 0;
          success(numero + 1);
        },
        angular.bind(this, loadedError, 'ultimoNumero'));
    };

    VIEW_NAMES.forEach(function (viewName) {
      if (viewName !== 'aziende') {
        info[viewName] = function (params) {
          info.loading += 1;
          return CdbView[viewName](params, loaded, angular.bind(this, loadedError, viewName));
        };
      }
    }, this);
    info.aziende = function (params) {
      info.loading += 1;
      return CdbView.aziende(params, undefined, loaded,
        angular.bind(this, loadedError, 'aziende'),
        function (response) {
          var aziende = {}, rows = response.rows, i, ii, r, codes;
          for (i = 0, ii = rows.length; i < ii; i += 1) {
            r = rows[i];
            codes = r.id.split('_', 2);
            aziende[codes[1]] = r;
          }
          return aziende;
        });
    };

    info.listini = function () {
      info.loading += 1;
      return Document.listini(loaded,
        angular.bind(this, loadedError, 'listini'),
        function (response) {
          var listini = {}, rows = response.rows, r, i, ii, codes;
          // TODO DRY copiato in listino.js
          for (i = 0, ii = rows.length; i < ii; i += 1) {
            r = rows[i];
            codes = CODICI.parseIdListino(r.id);
            if (codes) {
              r.doc.col = CODICI.colNamesToColIndexes(r.doc.columnNames);
              listini[codes.versione] = r.doc;
            }
          }
          return listini;
        });
    };

    // TODO DRY there's lot of repetition in this code
    info.save = function (data, success, error) {
      info.loading += 1;
      return Document.save(data, function () {
        loaded();
        if (success) {
          success.apply(null, arguments);
        }
      }, function (code, response) {
        loaded();
        if (error) {
          error.apply(null, arguments);
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
    // TODO DRY error and notice are identical
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
  }, { $inject: ['$resource', 'Document', '$xhr.error', '$location', 'CdbView'] });

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

  angular.service('Downloads', function ($xhr, SessionInfo) {
    /*
     * WARNING: this service uses DOM directly to interact with the save.swf flash service.
     * It's pretty hard to unit test it. However it should be easy to mock because it has
     * very little business logic.
     */
    function setData(data) {
      var el = document.getElementById('downloads');
      el.style.zIndex = 9999;
      el.style.visibility = 'visible';
      return el.setData(data);
    }

    var labelComparators = {
      TSMAC: function (a, b) {
        if (a.taglia < b.taglia) {
          return -1;
        }
        if (a.taglia > b.taglia) {
          return 1;
        }
        return a.barcode < b.barcode ? -1 : a.barcode > b.barcode ? 1 : 0;
      },
      SMACT: function (a, b) {
        return a.barcode < b.barcode ? -1 : a.barcode > b.barcode ? 1 : 0;
      },
      MACTS: function (a, b) {
        var mactA = a.barcode.substring(CODICI.LEN_STAGIONE),
          mactB = b.barcode.substring(CODICI.LEN_STAGIONE);
        if (mactA < mactB) {
          return -1;
        }
        if (mactA > mactB) {
          return 1;
        }
        return a.barcode < b.barcode ? -1 : a.barcode > b.barcode ? 1 : 0;
      }
    };

    // Taken from http://documentcloud.github.com/underscore Micro-Templating function.
    function applyTemplate(str, data) {
      var tmpl = 'var __p=[],print=function(){__p.push.apply(__p,arguments);};' +
        'with(obj||{}){__p.push(\'' +
        str.replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/<%=([\s\S]+?)%>/g, function (match, code) {
          return "'," + code.replace(/\\'/g, "'") + ",'";
        })
        .replace(/<%([\s\S]+?)%>/g, function (match, code) {
          return "');" + code.replace(/\\'/g, "'")
            .replace(/[\r\n\t]/g, ' ') + "__p.push('";
        })
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t')
        + "');}return __p.join('');",
        func = new Function('obj', tmpl);
      return func(data);
    }


    return {
      prepare: function (labels, fileName) {
        var t, i, ii, templates = [],
          ordinamenti = Object.keys(labelComparators),
          layouts = ['standard', 'outlet'],
          formati = ['strette', 'larghe'],
          zip = new JSZip();
        if (!labels) {
          return SessionInfo.notice('Impossibile generare le etichette in presenza di errori');
        }
        layouts.forEach(function (layout) {
          formati.forEach(function (formato) {
            templates.push('-' + layout + '-' + formato + '.txt');
          });
        });
        function addFiles() {
          if (i < ii) {
            t = templates[i];
            i += 1;
            return $xhr('GET', 'templates/etichette' + t, function (status, template) {
              if (status !== 200) {
                return SessionInfo.error('Errore scaricando template etichette');
              }
              ordinamenti.forEach(function (ordinamento) {
                zip.add('etichette-' + ordinamento + t,
                  applyTemplate(template, { rows: labels.sort(labelComparators[ordinamento]) }));
              });
              addFiles();
            });
          }
          setData({
            data: zip.generate(),
            filename: fileName + '.zip',
            dataType: 'base64'
          });
        }
        i = 0;
        ii = templates.length;
        addFiles();
      }
    };
  }, { $inject: ['$xhr', 'SessionInfo'] });
}());
