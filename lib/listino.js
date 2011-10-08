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

  // TODO this should go in a formatter
  function formatPrezzo(prezzo) {
    var mp = /^([0-9]+)(?:\.([0-9]{1,2}))?$/.exec(prezzo);
    if (mp) {
      return parseInt(mp[1] + padCents(mp[2]), 10);
    }
  }

  return {
    getLatest: getLatest,

    loadFromCsvFile: function (csvFileName, couchdb, versione, dataUso, callback) {
      var warns = [], prezzi = { negozio: {}, outlet: {} };
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
            p = formatPrezzo(prezzo[l]);
            if (typeof p === 'number') {
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
    },


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
              p = formatPrezzo(prezzo[l]);
              if (typeof p === 'number') {
                if (p > 0) {
                  prezzi[l][codice] = p;
                }
              } else {
                warns.push('Prezzo ' + l + ' non valido per "' + codice + '": "' + prezzo[l] + '"');
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