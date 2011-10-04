/*global define: false */

define(['underscore', 'lib/taskutil', 'lib/couchutil'], function (_, taskutil, couchutil) {
  'use strict';
  var codeNames = ['stagione', 'modello', 'articolo', 'colore', 'taglia'],
    lengthCodice = { stagione: 3, modello: 5, articolo: 4, colore: 4, taglia: 2 },
    rexp = {};

  lengthCodice.barcode = _.reduce(codeNames, function (sum, cod) {
    return sum + lengthCodice[cod];
  }, 0);

  //TODO DRY use it instead of patterns.js
  rexp.barcode = new RegExp('^(' + _.map(codeNames, function (cod) {
    var len = lengthCodice[cod],
      t = '\\d{' + len + '}';
    rexp[cod] = new RegExp('^' + t + '$');
    return t;
  }).join(')(') + ')$');

  //TODO DRY copied from controllers.js
  function colNamesToColIndexes(columnNames) {
    var col = {}, i = 0, n = columnNames.length;
    for (; i < n; i += 1) {
      col[columnNames[i]] = i;
    }
    return col;
  }

  function buildModelliEScalariniAs400(modelliEScalarini) {
    var r, stagione, modello, descrizione, scalarino,
      col = colNamesToColIndexes(modelliEScalarini[0].columnNames),
      rows = modelliEScalarini[0].rows, i = 0, n = rows.length,
      warns = [], lista = {};
    for (; i < n; i += 1) {
      r = rows[i];
      stagione = r[col.stagione];
      modello = r[col.modello];
      descrizione = (r[col.descrizione] || '').trim();
      scalarino = (r[col.scalarino] || '').trim();
      if (!rexp.stagione.test(stagione || '')) {
        warns.push('Stagione non valida: stagione="' + stagione + '"');
      } else if (!rexp.modello.test(modello || '')) {
        warns.push('Modello non valido: stagione="' + stagione + '", modello="' + modello + '"');
      } else if (!descrizione) {
        warns.push('Manca descrizione: stagione="' + stagione + '", modello="' + modello + '", descrizione="' + descrizione + '"');
      } else if (!/^\d+$/.test(scalarino || '')) {
        warns.push('Manca scalarino: stagione="' + stagione + '", modello="' + modello + '", descrizione="' + descrizione + '", scalarino="' + scalarino + '"');
      } else {
        lista[stagione + modello] = [descrizione, parseInt(scalarino, 10)];
      }
    }

    return [warns, { _id: 'ModelliEScalarini', lista: lista }];
  }

  function buildCausaliAs400(causaliAs400) {
    var csl = { _id: 'CausaliAs400', '1': {}, '2': {} },
      codiceTipo = { 'MC': '1', 'MD': '2' },
      warns = [],
      error = null,
      rexpV = /^([\-+*A-Za-z. \/0-9]{16})([AK])[\d ]{4}[AK]?/,
      rexpK = /^(M[CD])(\d\d)$/;

    _.each(causaliAs400, function (causali, tipoMagazzino) {
      causali.rows.forEach(function (c) {
        var mk = rexpK.exec(c[0]), mv, tm;
        if (!mk) {
          if (c[0] !== 'MC?') {
            warns.push('Chiave non valida: chiave="' + c[0] + '"');
          }
        } else {
          mv = rexpV.exec(c[1]);
          tm = mk[1];
          if (!mv) {
            warns.push('Valore non valido: chiave="' + c[0] + '", valore="' + c[1] + '"');
          } else if (tm !== tipoMagazzino) {
            error = 'TIPO MAGAZZINO ERRATO: "' + tm + '" invece di "' + tipoMagazzino + '"';
          } else {
            csl[codiceTipo[tm]][mk[2]] = [ mv[1].trim(), mv[2] === 'A' ? -1 : 1 ];
          }
        }
      });
    });
    return [warns, error || csl];
  }

  function buildAziendaAs400(azienda, aziendaAs400) {
    var col = colNamesToColIndexes(aziendaAs400.columnNames),
      az = aziendaAs400.rows[0];
    azienda.nome = az[col.nome];
    azienda.indirizzo = az[col.indirizzo];
    azienda.comune = az[col.comune];
    azienda.provincia = az[col.provincia];
    azienda.cap = az[col.cap];
    azienda.note = az[col.note];
    azienda.nazione = az[col.nazione];
    if (!Array.isArray(azienda.contatti)) {
      azienda.contatti = [];
    }
    if (az[col.telefono]) {
      azienda.contatti[0] = { tipo: 'Telefono', valore: az[col.telefono] };
    }
    if (az[col.fax]) {
      azienda.contatti[1] = { tipo: 'Fax', valore: az[col.fax] };
    }
    return [[], azienda];
  }

  /*
   * Data from As400 must be merged with data in Boutique.
   * Then, we need the current data in Boutique to merge it
   * with the data from As400.
   */
  function newBuilderAziendaAs400(azienda) {
    return function (aziendeAs400) {
      return buildAziendaAs400(azienda, aziendeAs400[0]);
    };
  }


  function as400Querier(params, callback) {
    taskutil.execBuffered('java', ['-jar', 'as400-querier.jar'].concat(params), callback);
  }

  function fetchFromAs400(querier, queries, docBuilder, callback) {
    var queryParameters = Array.isArray(queries) ? { 0: queries } : queries,
      queryNames = Object.keys(queryParameters),
      i = 0,
      n = queryNames.length,
      queryName,
      resps = {};

    function doQuery() {
      queryName = queryNames[i];
      querier(queryParameters[queryName], function (err, docAs400) {
        if (err) {
          return callback(err);
        }
        try {
          resps[queryName] = JSON.parse(docAs400);
        } catch (errJSONParse) {
          return callback(errJSONParse);
        }
        i += 1;
        if (i < n) {
          return doQuery();
        }
        var warnsAndDoc = docBuilder.call(null, resps);
        if (typeof warnsAndDoc[1] === 'string') {
          return callback(warnsAndDoc[1]);
        }
        return callback(null, warnsAndDoc);
      });
    }
    doQuery();
  }

  return {
    //TODO exports for unit test. Better options?
    buildModelliEScalariniAs400: buildModelliEScalariniAs400,
    buildCausaliAs400: buildCausaliAs400,
    buildAziendaAs400: buildAziendaAs400,
    fetchFromAs400: fetchFromAs400,

    updateModelliEScalariniAs400: function (couchdb, callback) {
      fetchFromAs400(as400Querier, ['modelli'], buildModelliEScalariniAs400, function (err, warnsAndDoc) {
        couchutil.saveIfChanged(err, couchdb, warnsAndDoc, callback);
      });
    },

    updateCausaliAs400: function (couchdb, callback) {
      fetchFromAs400(as400Querier, { MC: ['codifiche', 'selector=MC'], MD: ['codifiche', 'selector=MD'] },
        buildCausaliAs400,
        function (err, warnsAndDoc) {
          couchutil.saveIfChanged(err, couchdb, warnsAndDoc, callback);
        });
    },
    // TODO DRY: tutta la logica per cercare tutte le aziende
    // e per estrarre il codice azienda, è duplicata in varie parti,
    // per esempio nei controller e service di Angular.
    updateAziendeAs400: function (couchdb, callback) {
      couchdb.all({
        startkey: '"Azienda_"',
        endkey: '"Azienda_\ufff0"',
        include_docs: true
      }, function (errQuery, aziende) {
        if (errQuery) {
          return callback(errQuery);
        }
        var rows = aziende.rows, i = 0, n = rows.length, row, allWarns = [], allResps = [];
        function doSave() {
          row = rows[i];
          var codice = row.id.split('_')[1];
          fetchFromAs400(as400Querier, ['clienti', 'codice=' + codice],
            newBuilderAziendaAs400(row.doc),
            function (err, warnsAndDoc) {
              couchutil.saveIfChanged(err, couchdb, warnsAndDoc, function (errSave, warns, resp) {
                if (errSave) {
                  return callback(errSave);
                }
                allWarns.concat(warns);
                if (resp) {
                  allResps.push(resp);
                }
                i += 1;
                if (i < n) {
                  return doSave();
                }
                callback(null, allWarns, allResps.length ? allResps : null);
              });
            });
        }
        doSave();
      });
    }
  };
});