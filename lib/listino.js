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
          prezzi = {};
        } else {
          prezzi = oldDoc.prezzi;
        }
        csv().fromPath(csvFileName, {
          columns: true
        }).on('data', function (data) {
          var p,
            stagione = data.Stagione,
            modello = data.Modello,
            articolo = data.Articolo,
            prezzo1 = data.Prezzo1,
            prezzo2 = data.Prezzo2,
            offerta = data.Offerta,
            codice = codici.codiceListino(stagione, modello, articolo);

          if (!codice) {
            warns.push('Codice non valido: stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '"');
          } else {
            p = codici.parseMoney(prezzo1);
            if (p[0] || p[1] < 0) {
              warns.push('Prezzo1 non valido per stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '": "' + prezzo1 + '"');
            } else if (p[1] > 0) {
              prezzi[codice] = [p[1]];
            } else if (p[1] === 0) {
              delete prezzi[codice];
            }
            p = codici.parseMoney(prezzo2);
            if (prezzo2 && (p[0] || p[1] < 0)) {
              warns.push('Prezzo2 non valido per stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '": "' + prezzo2 + '"');
            } else if (p[1] > 0 && p[1] !== prezzi[codice][0]) {
              prezzi[codice].unshift(p[1]);
            }
            if (offerta) {
              prezzi[codice].push(offerta);
            }
          }
        }).on('end', function () {
          var newDoc = { _id: id, prezzi: prezzi };
          couchutil.saveIfChanged(null, couchdb, [warns, newDoc], callback);
        }).on('error', function (err) {
          callback(err);
        });
      });
    }
  };
});