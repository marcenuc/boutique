/*global define: false */

define(['csv', 'lib/comparator', 'lib/couchutil', 'app/js/codici'], function (csv, comparator, couchutil, codici) {
  'use strict';

  var columnNames = ['barcode', 'giacenza', 'costo'];

  function comparatoreRigaInventario(a, b) {
    return comparator.barcodeMacts(a[0], b[0]);
  }


  return {
    loadFromCsvFile: function (csvFileName, azienda, couchdb, doReset, callback) {
      couchdb.get(['TaglieScalarini', 'ModelliEScalarini'], function (errDb, docs) {
        var taglie = docs.rows[0].doc.taglie,
          listaModelli = docs.rows[1].doc.lista,
          errs = [],
          articoli = [];

        csv().fromPath(csvFileName, {
          columns: true
        }).on('data', function (data) {
          var stagione = data.Stagione,
            modello = data.Modello,
            articolo = data.Articolo,
            colore = data.Colore,
            descrizioneTaglia = data.Taglia,
            giacenza = data.Giacenza,
            costo = codici.parseMoney(data['Costo Acquisto']),
            taglia = codici.codiceTaglia(stagione, modello, taglie, listaModelli, descrizioneTaglia),
            codice;

          if (taglia[0]) {
            return errs.push(taglia[0]);
          }
          codice = codici.codiceAs400(stagione, modello, articolo, colore, taglia[1]);
          if (!codice) {
            return errs.push('Codice "' + codice + '" non valido: stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '", colore="' + colore + '", taglia="' + descrizioneTaglia + '"(' + taglia[1] + ')');
          }
          if (!/^\d+$/.test(giacenza)) {
            return errs.push('Giacenza non valida: stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '", giacenza="' + giacenza + '"');
          }
          if (costo[0]) {
            return errs.push('Costo di acquisto non valido: stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '", giacenza="' + giacenza + '": "' + costo[0] + '"');
          }
          articoli.push([codice, parseInt(giacenza, 10), costo[1]]);
        }).on('end', function () {
          var e = errs.join('\n'), id = 'Inventario_' + azienda, inventario = { _id: id, columnNames: columnNames };
          if (errDb) {
            return callback(e + '\n' + errDb);
          }
          if (errs.length) {
            return callback(e);
          }
          if (doReset) {
            inventario.rows = articoli.sort(comparatoreRigaInventario);
            couchutil.saveIfChanged(null, couchdb, [[], inventario], callback);
          } else {
            couchdb.get([id], function (errGet, oldDocs) {
              if (errGet) {
                return callback(errGet);
              }
              var row = oldDocs.rows[0], oldDoc = row.doc;
              if (row.error && row.error !== 'not_found') {
                return callback(errGet);
              }
              if (oldDoc) {
                inventario._rev = oldDoc._rev;
                inventario.rows = articoli.concat(oldDoc.rows).sort(comparatoreRigaInventario);
              } else {
                inventario.rows = articoli.sort(comparatoreRigaInventario);
              }
              couchutil.saveIfChanged(null, couchdb, [[], inventario], callback);
            });
          }
        }).on('error', function (err) {
          callback(err);
        });
      });
    }
  };
});