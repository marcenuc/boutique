/*global define: false */

define(['csv', 'lib/couchutil', 'app/js/codici'], function (csv, couchutil, codici) {
  'use strict';

  function padCents(n) {
    if (n) {
      return n.length < 2 ? n + '0' : n;
    }
    return '00';
  }

  function getLast(couchdb, versione, callback) {
    var baseId = 'Listino_' + versione + '_';
    couchdb.all({
      startkey: baseId,
      endkey: baseId + '\uFFF0'
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
    getLast: getLast,

    loadFromCsvFile: function (csvFileName, couchdb, versione, dataUso, callback) {
      var warns = [], prezziNegozio = {};
      csv().fromPath(csvFileName, {
        columns: true
      }).on('data', function (data) {
        var mp, prezzo,
          stagione = data.Stagione,
          modello = data.Modello,
          articolo = data.Articolo,
          prezzoFloat = data.Listino,
          codice = codici.codiceListino(stagione, modello, articolo);

        if (!codice) {
          warns.push('Codice non valido: stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '"');
        } else {
          mp = /^([0-9]+)(?:\.([0-9]{1,2}))?$/.exec(prezzoFloat);
          if (mp) {
            prezzo = parseInt(mp[1] + padCents(mp[2]), 10);
            prezziNegozio[codice] = parseInt(prezzo, 10);
          } else {
            warns.push('Prezzo non valido per "' + codice + '": "' + prezzoFloat + '"');
          }
        }
      }).on('end', function () {
        var id = codici.idListino(versione, dataUso),
          doc = { _id: id, negozio: prezziNegozio };
        couchutil.saveIfChanged(null, couchdb, [warns, doc], callback);
      }).on('error', function (err) {
        callback(err);
      });
    }
  };
});