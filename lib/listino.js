/*global define: false */

define(['csv', 'lib/couchutil', 'app/js/codici'], function (csv, couchutil, codici) {
  'use strict';
  return {
    getCurrent: function (couchdb, versione, callback) {
      var id = codici.idListino(versione), resp = {};
      couchdb.get(id, function (err, listino) {
        if (err) {
          return callback(err);
        }
        listino.col = codici.colNamesToColIndexes(listino.columnNames);
        resp[versione] = listino;
        if (!listino.versioneBase) {
          return callback(null, resp);
        }
        couchdb.get(codici.idListino(listino.versioneBase), function (err, listinoBase) {
          if (err) {
            return callback(err);
          }
          listinoBase.col = codici.colNamesToColIndexes(listinoBase.columnNames);
          resp[listino.versioneBase] = listinoBase;
          callback(null, resp);
        });
      });
    },

    getAll: function (couchdb, callback) {
      couchdb.get('_all_docs', {
        startkey: 'Listino_',
        endkey: 'Listino_\ufff0',
        include_docs: true
      }, function (err, resp) {
        if (err) {
          return callback(err);
        }
        // TODO DRY codice copiato da services.js.
        var rows = resp.rows, r, i, ii, codes, listini = {};
        for (i = 0, ii = rows.length; i < ii; i += 1) {
          r = rows[i];
          codes = codici.parseIdListino(r.id);
          if (codes) {
            r.doc.col = codici.colNamesToColIndexes(r.doc.columnNames);
            listini[codes.versione] = r.doc;
          }
        }
        callback(null, listini);
      });
    },

    updateFromCsvFile: function (csvFileName, couchdb, versione, doUpdate, callback) {
      var id = codici.idListino(versione);
      // TODO load old listino only if not doUpdate
      couchdb.get(id, function (err, oldDoc) {
        var warns = [], prezzi;

        if (err) {
          if (doUpdate || err['status-code'] !== 404) {
            return callback(err);
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
          var newDoc = { _id: id, columnNames: codici.COLUMN_NAMES.Listino, prezzi: prezzi };
          couchutil.saveIfChanged(null, couchdb, [warns, newDoc], callback);
        }).on('error', function (err) {
          callback(err);
        });
      });
    }
  };
});
