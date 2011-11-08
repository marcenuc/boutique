/*global define: false */

define(['csv', 'lib/couchutil', 'app/js/codici'], function (csv, couchutil, codici) {
  'use strict';

  //TODO DRY ripetuto in molte parti.
  var columnNames = ['costo', 'prezzo1', 'prezzo2', 'offerta'];

  function getCurrent(couchdb, versione, callback) {
    var id = codici.idListino(versione);
    couchdb.get(id, callback);
  }

  return {
    getCurrent: getCurrent,

    updateFromCsvFile: function (csvFileName, couchdb, versione, doUpdate, callback) {
      var id = codici.idListino(versione);
      // TODO load old listino only if not doUpdate
      couchdb.get(id, function (errGet, oldDoc) {
        var warns = [], prezzi;

        if (errGet) {
          if (doUpdate || (errGet.headers && errGet.headers.status !== 404)) {
            return callback(errGet);
          }
          prezzi = {};
        } else if (doUpdate) {
          prezzi = oldDoc.prezzi;
        } else {
          prezzi = {};
        }
        csv().fromPath(csvFileName, {
          columns: true
        }).on('data', function (data) {
          if (data.Versione === versione) {
            var row,
              stagione = data.Stagione,
              modello = data.Modello,
              articolo = data.Articolo,
              costo = codici.parseMoney(data.Costo_Listino_1),
              prezzo1 = codici.parseMoney(data.Prezzo1),
              prezzo2 = codici.parseMoney(data.Prezzo2),
              offerta = data.Offerta;

            if (!codici.isCode(stagione, codici.LEN_STAGIONE)) {
              warns.push('Codice non valido: stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '"');
            } else if (!codici.isCode(modello, codici.LEN_MODELLO)) {
              warns.push('Codice non valido: stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '"');
            } else if (!codici.isCode(articolo, codici.LEN_ARTICOLO)) {
              warns.push('Codice non valido: stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '"');
            } else if (data.Costo_Listino_1 && (costo[0] || costo[1] < 0)) {
              warns.push('Costo non valido per stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '": "' + prezzo1 + '"');
            } else if (prezzo1[0] || prezzo1[1] < 0) {
              warns.push('Prezzo1 non valido per stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '": "' + prezzo1 + '"');
            } else if (data.Prezzo2 !== null && (prezzo2[0] || prezzo2[1] < 0)) {
              warns.push('Prezzo2 non valido per stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '": "' + prezzo2 + '"');
            } else {
              row = [costo[1], prezzo1[1], data.Prezzo2 === null ? prezzo1[1] : prezzo2[1]];
              if (offerta) {
                row.push(offerta);
              }
              codici.setProperty(prezzi, stagione, modello, articolo, row);
            }
          }
        }).on('end', function () {
          var newDoc = { _id: id, columnNames: columnNames, prezzi: prezzi };
          couchutil.saveIfChanged(null, couchdb, [warns, newDoc], callback);
        }).on('error', function (err) {
          callback(err);
        });
      });
    }
  };
});
