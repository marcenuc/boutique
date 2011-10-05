/*global define: false */

define(['csv', 'lib/couchutil', 'app/js/codici'], function (csv, couchutil, codici) {
  'use strict';

  function padCents(n) {
    if (n) {
      return n.length < 2 ? n + '0' : n;
    }
    return '00';
  }

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

    loadFromCsvFile: function (csvFileName, couchdb, versione, dataUso, callback) {
      var warns = [], prezzi = { negozio: {}, outlet: {} };
      csv().fromPath(csvFileName, {
        columns: true
      }).on('data', function (data) {
        var mp, p,
          stagione = data.Stagione,
          modello = data.Modello,
          articolo = data.Articolo,
          prezzo = { negozio: data.Listino, outlet: data.Outlet },
          codice = codici.codiceListino(stagione, modello, articolo);

        if (!codice) {
          warns.push('Codice non valido: stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '"');
        } else {
          ['negozio', 'outlet'].forEach(function (l) {
            // TODO this should go in a formatter
            mp = /^([0-9]+)(?:\.([0-9]{1,2}))?$/.exec(prezzo[l]);
            if (mp) {
              p = parseInt(mp[1] + padCents(mp[2]), 10);
              if (p > 0) {
                prezzi[l][codice] = p;
              }
            } else {
              warns.push('Prezzo ' + l + ' non valido per "' + codice + '": "' + prezzo[l] + '"');
            }
          });
        }
      }).on('end', function () {
        var id = codici.idListino(versione, dataUso),
          doc = { _id: id, negozio: prezzi.negozio, outlet: prezzi.outlet };
        couchutil.saveIfChanged(null, couchdb, [warns, doc], callback);
      }).on('error', function (err) {
        callback(err);
      });
    }
  };
});