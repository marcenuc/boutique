/*global angular:false, JSZip:false*/
angular.module('app.services', [], ['$provide', function ($provide) {
  'use strict';

  $provide.factory('SessionInfo', ['$location', function ($location) {
    var info = { loading: 0, flash: {} };

    info.startLoading = function () {
      info.loading += 1;
    };

    info.doneLoading = function loaded() {
      info.loading -= 1;
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
      $location.path(path);
    };
    return info;
  }]);

  $provide.factory('session', ['SessionInfo', '$http', function (SessionInfo, $http) {
    SessionInfo.startLoading();

    // TODO show errors to user (use Doc?)
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
          // TODO use $q.all()
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


  $provide.factory('Azienda', ['Doc', 'couchdb', function (Doc, couchdb) {
    function find() {
      return Doc.find('AZIENDE', couchdb.viewPath('aziende?include_docs=true'), viewToMapByKey);
    }

    return {
      all: function () {
        return find();
      },
      nome: function (codiceAzienda) {
        return find().then(function (aziende) {
          var azienda = aziende[codiceAzienda];
          return azienda ? azienda.value : codiceAzienda;
        });
      },
      nomi: function () {
        return find().then(function (aziende) {
          var map = {};
          Object.keys(aziende).forEach(function (codiceAzienda) {
            map[codiceAzienda] = aziende[codiceAzienda].value;
          });
          return map;
        });
      }
    };
  }]);

  $provide.factory('Listino', ['Doc', 'couchdb', 'codici', function (Doc, couchdb, codici) {
    function setCol(listini) {
      Object.keys(listini).forEach(function (versioneListino) {
        var listino = listini[versioneListino];
        listino.col = codici.colNamesToColIndexes(listino.columnNames);
      });
      return listini;
    }

    return {
      all: function () {
        return Doc.find('LISTINI', couchdb.viewPath('listini?include_docs=true'), [viewToMapByKey, setCol]);
      },
      load: function () {
        return Doc.load(['LISTINI'], [couchdb.viewPath('listini?include_docs=true')], [[viewToMapByKey, setCol]])[0];
      }
    };
  }]);

  $provide.factory('As400', ['$http', 'SessionInfo', function ($http, SessionInfo) {
    return {
      bolla: function (intestazioneBolla) {
        var params = ['../as400/bolla'];
        Object.keys(intestazioneBolla).forEach(function (k) {
          var v = intestazioneBolla[k];
          if (k === 'data' && v.length === 8) {
            // as400 uses 6 digits dates
            v = v.substring(2);
          }
          params.push(k + '=' + v);
        });
        return $http.get(params.join('/')).error(function (body, status) {
          SessionInfo.error('ERRORE ' + status + ': ' + body);
        });
      }
    };
  }]);

  $provide.factory('cache', ['$cacheFactory', 'codici', 'couchdb', function ($cacheFactory, codici, couchdb) {
    var cache = $cacheFactory('docs');

    function update(cacheId) {
      if (typeof cacheId !== 'string') {
        return;
      }
      var other, docId = /\/([A-Za-z_0-9]+)$/.exec(cacheId);
      if (docId) {
        if (codici.parseIdAzienda(docId[1])) {
          other = couchdb.viewPath('aziende?include_docs=true');
          if (cache.get(other)) {
            cache.remove(other);
          }
        }
      }
    }

    return {
      info: function () {
        return cache.info();
      },
      put: function (id, obj) {
        update(id);
        return cache.put(id, obj);
      },
      get: function (id) {
        return cache.get(id);
      },
      remove: function (id) {
        return cache.remove(id);
      },
      removeAll: function () {
        return cache.removeAll();
      }
    };
  }]);

  $provide.factory('Doc', ['$http', 'couchdb', 'SessionInfo', 'cache', function ($http, couchdb, SessionInfo, cache) {
    function load(docIds, docPaths, responseTransformers) {
      return docIds.map(function (id, i) {
        var path = (docPaths && docPaths[i]) || couchdb.docPath(id),
          config = {
            cache: cache,
            transformResponse: (responseTransformers && responseTransformers[i])
          };
        return $http.get(path, config).error(function (data, status) {
          SessionInfo.error('Error ' + status + ' ' + data.error + ' on ' + id + ': ' + data.reason);
        }).then(function (value) {
          return value.data;
        });
      });
    }

    return {
      load: load,
      find: function (id, docPath, transformResponse) {
        SessionInfo.startLoading();
        var done = SessionInfo.doneLoading,
          promise = load([id], [docPath], [transformResponse])[0];
        promise.then(done, done);
        return promise;
      },
      save: function (doc) {
        SessionInfo.startLoading();
        var done = SessionInfo.doneLoading,
          url = couchdb.docPath(doc._id),
          promise = $http.put(url, doc).error(function (data, status) {
            SessionInfo.error('Error ' + status + ' ' + data.error + ' on ' + doc._id + ': ' + data.reason);
          });
        //TODO remove only affected entries
        cache.removeAll();
        promise.then(done, done);
        return promise.then(function (value) {
          doc._rev = value.data.rev;
          return doc;
        });
      }
    };
  }]);

  $provide.factory('MovimentoMagazzino', ['$http', 'couchdb', 'codici', 'Doc', 'SessionInfo', function ($http, couchdb, codici, Doc, SessionInfo) {
    function nextId(codiceAzienda, data, gruppo) {
      SessionInfo.startLoading();
      var done = SessionInfo.doneLoading,
        anno = parseInt(data.substring(0, 4), 10),
        startkey = JSON.stringify([codiceAzienda, anno, gruppo, {}]),
        endkey = JSON.stringify([codiceAzienda, anno, gruppo]),
        promise = $http.get(couchdb.viewPath('contatori?limit=1&descending=true&startkey=' + startkey + '&endkey=' + endkey)).error(function (data, status) {
          SessionInfo.error('Error ' + status + ' ' + data.error + ': ' + data.reason);
        });
      promise.then(done, done);
      return promise.then(function (value) {
        var rows = value.data.rows,
          numero = rows.length ? rows[0].key[3] : 0;
        return codici.idMovimentoMagazzino(codiceAzienda, anno, gruppo, numero + 1);
      });
    }

    return {
      search: function (options) {
        var id, key;
        if (options.magazzino1 && options.causale1 && options.anno && options.numero) {
          id = codici.idMovimentoMagazzino(options.magazzino1, options.anno, options.causale1.gruppo, options.numero);
          return Doc.find(id).then(function (doc) {
            var col, notFound;
            if (options.smact) {
              col = codici.colNamesToColIndexes(doc.columnNames);
              notFound = doc.rows.every(function (row) {
                return row[col.barcode].substring(0, options.smact.length) !== options.smact;
              });
              if (notFound) {
                return { rows: [] };
              }
            }
            return { rows: [{ key: [options.magazzino1, doc.data, doc.causale1[0], options.causale1.gruppo, options.numero], id: doc._id }] };
          });
        } else if (options.magazzino1 && options.smact) {
          key = options.magazzino1 + '","' + options.smact;
          return Doc.find('SEARCH', couchdb.viewPath('movimentiArticolo?startkey=["' + key + '"]&endkey=["' + key + '\ufff0"]')).then(function (res) {
            var rows = [], docs = {};
            res.rows.forEach(function (row) {
              if (!docs[row.id]) {
                docs[row.id] = 1;
                var codes = codici.parseIdMovimentoMagazzino(row.id);
                if (!options.anno || parseInt(codes.anno, 10) === options.anno) {
                  rows.push({ key: [row.key[0], row.key[2], row.value, codes.gruppo, codes.numero], id: row.id });
                }
              }
            });
            return { rows: rows.sort(function (a, b) {
              var x = a.key[1], y = b.key[1];
              return x < y ? -1 : (x > y ? 1 : 0);
            }) };
          });
        } else {
          SessionInfo.error('ATTENZIONE: RICERCA NON VALIDA (QUESTA FUNZIONALITÀ È ANCORA INCOMPLETA) PER ORA È NECESSARIO SPECIFICARE: o causale1, magazzino1, anno, e numero; o magazzino1, e parte iniziale del codice SMACT (facoltativamente anche l\'anno).');
        }
      },
      pendenti: function (codiceAzienda) {
        var path = couchdb.viewPath('movimentoMagazzinoPendente');
        if (codiceAzienda) {
          path += '?startkey=["' + codiceAzienda + '"]&endkey=["' + codiceAzienda + '",{}]';
        }
        return Doc.load(['PENDENTI'], [path])[0];
      },
      findByRiferimento: function (riferimento) {
        return Doc.find(riferimento, couchdb.viewPath('riferimentiMovimentiMagazzino?key="' + riferimento + '"'));
      },
      nextId: nextId,
      build: function (magazzino1, data, causale1, rows, magazzino2, riferimento) {
        function newMovimentoMagazzino(id) {
          var infoCausale = codici.infoCausale(causale1),
            doc = {
              _id: id,
              data: data,
              causale1: infoCausale.causale1,
              columnNames: codici.COLUMN_NAMES.MovimentoMagazzino,
              rows: rows || []
            };
          if (codici.hasExternalWarehouse(magazzino1)) {
            doc.esterno1 = 1;
          }
          if (infoCausale.causale2) {
            doc.causale2 = infoCausale.causale2;
            if (magazzino2) {
              if (codici.hasExternalWarehouse(magazzino2)) {
                doc.esterno2 = 1;
              }
              doc.magazzino2 = codici.parseIdAzienda(magazzino2._id).codice;
            }
          }
          if (riferimento) {
            doc.riferimento = riferimento;
          }
          return doc;
        }

        SessionInfo.startLoading();
        var done = SessionInfo.doneLoading,
          codiceAzienda = codici.parseIdAzienda(magazzino1._id).codice,
          promise = nextId(codiceAzienda, data, causale1.gruppo);
        promise.then(done, done);
        return promise.then(function (id) {
          return newMovimentoMagazzino(id);
        });
      }
    };
  }]);
}]);
