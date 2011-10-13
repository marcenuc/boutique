/*global define: false */

define(['csv', 'lib/couchutil', 'app/js/codici'], function (csv, couchutil, codici) {
  'use strict';

  function getLatest(couchdb, versione, callback) {
    var baseId = 'Listino_' + versione + '_';
    couchdb.all({
      startkey: JSON.stringify(baseId),
      endkey: JSON.stringify(baseId + '\uFFF0')
    }, function (err, allIds) {
      if (err) {
        return callback(err);
      }
      var lastRow = allIds.rows.slice(-1)[0],
        lastId = lastRow ? lastRow.id : null;
      if (lastId) {
        couchdb.get(lastId, function (errGet, doc) {
          if (errGet) {
            return callback(errGet);
          }
          callback(null, doc);
        });
      } else {
        callback(null, null);
      }
    });
  }

  return {
    getLatest: getLatest,

    updateFromCsvFile: function (csvFileName, couchdb, versione, dataUso, doUpdate, callback) {
      var id = codici.idListino(versione, dataUso);
      couchdb.get(id, function (errGet, oldDoc) {
        var warns = [], prezzi;

        if (errGet) {
          if (doUpdate || (errGet.headers && errGet.headers.status !== 404)) {
            return callback(errGet);
          }
          prezzi = { negozio: {}, outlet: {} };
        } else {
          prezzi = { negozio: oldDoc.negozio, outlet: oldDoc.outlet };
        }
        csv().fromPath(csvFileName, {
          columns: true
        }).on('data', function (data) {
          var p,
            stagione = data.Stagione,
            modello = data.Modello,
            articolo = data.Articolo,
            prezzo = { negozio: data.Listino, outlet: data.Outlet },
            codice = codici.codiceListino(stagione, modello, articolo);

          if (!codice) {
            warns.push('Codice non valido: stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '"');
          } else {
            ['negozio', 'outlet'].forEach(function (l) {
              p = codici.parseMoney(prezzo[l]);
              if (p[0] || (p[1] <= 0 && l === 'negozio') || (p[1] < 0 && l === 'outlet')) {
                warns.push('Prezzo ' + l + ' non valido per "' + codice + '": "' + (p[0] || p[1]) + '"');
              } else if (p[1] > 0) {
                prezzi[l][codice] = p[1];
              } else if (p[1] === 0) {
                delete prezzi[l][codice];
              }
            });
          }
        }).on('end', function () {
          var newDoc = { _id: id, negozio: prezzi.negozio, outlet: prezzi.outlet };
          couchutil.saveIfChanged(null, couchdb, [warns, newDoc], callback);
        }).on('error', function (err) {
          callback(err);
        });
      });
    }
  };
});