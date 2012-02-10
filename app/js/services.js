/*global angular:false, JSZip:false*/
angular.module('app.services', [], ['$provide', function ($provide) {
  'use strict';
  var VIEW_NAMES = ['aziende', 'contatori', 'movimentoMagazzinoPendente', 'riferimentiMovimentiMagazzino'];

  $provide.factory('CdbView', ['$resource', 'couchdb', function ($resource, couchdb) {
    var view, views = {};

    VIEW_NAMES.forEach(function (viewName) {
      views[viewName] = {
        method: 'GET',
        params: { id: viewName }
      };
    });
    view = $resource('/' + couchdb.db + '/_design/' + couchdb.designDoc + '/_view/:id', { id: '@_id' }, views);

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
  }]);

  $provide.factory('Document', ['$resource', 'couchdb', function ($resource, couchdb) {
    var r = $resource('/' + couchdb.db + '/:id', { id: '@_id' }, {
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
  }]);


  $provide.factory('As400', ['$http', function ($http) {
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
        $http.get(params.join('/')).success(success);
      }
    };
  }]);


  $provide.factory('SessionInfo', ['$http', 'Document', '$location', 'CdbView', 'codici', 'couchdb', function ($http, Document, $location, CdbView, codici, couchdb) {
    var info = { loading: 0, flash: {} };

    function loaded() {
      info.loading -= 1;
    }

    function loadedData(obj, data) {
      info.loading -= 1;
      angular.copy(data, obj);
    }

    /*jslint unparam:true*/
    function loadedError(data, status, headers, config) {
      info.loading -= 1;
      info.error('Error ' + status + ' on ' + config.url + ': ' + JSON.stringify(data));
    }
    /*jslint unparam:false*/

    info.startLoading = function () {
      info.loading += 1;
    };
    info.doneLoading = loaded;

    info.getResource = function (resourceUrl) {
      var obj = {};
      info.loading += 1;
      $http.get(resourceUrl).success(angular.bind(this, loadedData, obj)).error(loadedError);
      return obj;
    };

    info.getDocument = function (id) {
      return info.getResource('/' + couchdb.db + '/' + id);
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
        codici.toSearchableListini);
    };

    // TODO DRY there's lot of repetition in this code
    info.save = function (data, success, error) {
      info.loading += 1;
      return Document.save(data, function () {
        loaded();
        if (success) {
          success.apply(null, arguments);
        }
      }, function (response) {
        loaded();
        if (error) {
          error.apply(null, arguments);
        } else {
          info.error('Error ' + response.status + ' ' + response.data.error + ' on ' + response.config.data._id + ': ' + response.data.reason);
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
  }]);

  $provide.factory('session', ['SessionInfo', '$http', function (SessionInfo, $http) {
    SessionInfo.startLoading();

    // TODO show errors to user
    var done = SessionInfo.doneLoading,
      promise = $http({ method: 'GET', url: '../_session' });
    promise.then(done, done);

    return promise.then(function (value) {
      return value.data;
    });
  }]);

  $provide.factory('Downloads', ['$http', '$document', 'SessionInfo', 'codici', function ($http, $document, SessionInfo, codici) {
    function setData(data) {
      var el = $document[0].getElementById('downloads');
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
        var mactA = a.barcode.substring(codici.LEN_STAGIONE),
          mactB = b.barcode.substring(codici.LEN_STAGIONE);
        if (mactA < mactB) {
          return -1;
        }
        if (mactA > mactB) {
          return 1;
        }
        return a.barcode < b.barcode ? -1 : a.barcode > b.barcode ? 1 : 0;
      }
    };

    /*jslint unparam:true, evil:true*/
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
        .replace(/\t/g, '\\t') + "');}return __p.join('');";
      return (new Function('obj', tmpl))(data);
    }
    /*jslint unparam:false, evil:false*/


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
            return $http.get('templates/etichette' + t).success(function (template) {
              ordinamenti.forEach(function (ordinamento) {
                zip.add('etichette-' + ordinamento + t,
                  applyTemplate(template, { rows: labels.sort(labelComparators[ordinamento]) }));
              });
              addFiles();
            }).error(function () {
              SessionInfo.error('Errore scaricando template etichette');
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
  }]);

  function viewToMapByKey(json) {
    var map = {};
    JSON.parse(json).rows.forEach(function (row) {
      map[row.key] = row.value === null ? row.doc : row;
    });
    return map;
  }

  $provide.factory('Azienda', ['SessionInfo', '$http', 'couchdb', function (SessionInfo, $http, couchdb) {
    SessionInfo.startLoading();

    //TODO show errors to users instead of log
    var done = SessionInfo.doneLoading,
      promise = $http({
        method: 'GET',
        url: '/' + couchdb.db + '/_design/' + couchdb.designDoc + '/_view/aziende?include_docs=true',
        transformResponse: viewToMapByKey
      });
    promise.then(done, done);

    return {
      all: function () {
        return promise.then(function (value) {
          return value.data;
        });
      },
      nome: function (codiceAzienda) {
        return promise.then(function (value) {
          var azienda = value.data[codiceAzienda];
          return azienda ? azienda.value : codiceAzienda;
        });
      }
    };
  }]);

  $provide.factory('Listino', ['SessionInfo', '$http', 'couchdb', 'codici', function (SessionInfo, $http, couchdb, codici) {
    SessionInfo.startLoading();

    function setCol(listini) {
      Object.keys(listini).forEach(function (versioneListino) {
        var listino = listini[versioneListino];
        listino.col = codici.colNamesToColIndexes(listino.columnNames);
      });
      return listini;
    }

    //TODO show errors to users instead of log
    var done = SessionInfo.doneLoading,
      promise = $http({
        method: 'GET',
        url: '/' + couchdb.db + '/_design/' + couchdb.designDoc + '/_view/listini?include_docs=true',
        transformResponse: [viewToMapByKey, setCol]
      });
    promise.then(done, done);

    return {
      all: function () {
        return promise;
      }
    };
  }]);

  $provide.factory('Doc', ['$http', 'couchdb', 'SessionInfo', function ($http, couchdb, SessionInfo) {
    return {
      find: function (id) {
        SessionInfo.startLoading();
        var done = SessionInfo.doneLoading,
          promise = $http.get('/' + couchdb.db + '/' + id).error(function (data, status) {
            SessionInfo.error('Error ' + status + ' ' + data.error + ' on ' + id + ': ' + data.reason);
          });
        promise.then(done, done);
        return promise;
      }
    };
  }]);
}]);
