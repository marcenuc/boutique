/*global define: false */

define(['underscore', 'csv', 'app/js/codici', 'lib/listino', 'text!lib/etichette-template.txt'], function (_, csv, codici, listino, template) {
  'use strict';

  function formatPrezzo(prezzo) {
    var s = String(prezzo);
    return s.slice(0, -2) + ',' + s.slice(-2);
  }

  var comparators = {
    TSMAC: function (a, b) {
      if (a.taglia < b.taglia) {
        return -1;
      }
      if (a.taglia > b.taglia) {
        return 1;
      }
      if (a.barcode < b.barcode) {
        return -1;
      }
      if (a.barcode > b.barcode) {
        return 1;
      }
      return 0;
    },

    SMACT: function (a, b) {
      if (a.barcode < b.barcode) {
        return -1;
      }
      if (a.barcode > b.barcode) {
        return 1;
      }
      return 0;
    }
  };

  function toSortedLabels(prezzi, codiciScalarini, listaModelli, rows, comparator, callback) {
    if (!comparator) {
      return callback('Ordinamento sconosciuto.');
    }
    var codes, prezzo, descrizioni,
      labels = [], i = 0, n = rows.length, r, label, j, qta;
    for (; i < n; i += 1) {
      r = rows[i];
      codes = codici.parseBarcodeAs400(r[0]);
      if (!codes) {
        return callback('Codice a barre errato: "' + r[0] + '"');
      }
      prezzo = prezzi[codes.codiceListino];
      if (typeof prezzo !== 'number') {
        return callback('Articolo non a listino: "' + r[0] + '"');
      }
      descrizioni = codici.barcodeDescs(codes, codiciScalarini, listaModelli);
      if (!descrizioni) {
        return callback('Articolo non in anagrafe: "' + r[0] + '"');
      }
      label = {
        descrizione: descrizioni.descrizione.substring(0, 19),
        barcode: r[0],
        stagione: codes.stagione,
        modello: codes.modello,
        articolo: codes.articolo,
        colore: codes.colore,
        taglia: descrizioni.descrizioneTaglia,
        prezzo: formatPrezzo(prezzo)
      };
      for (j = 0, qta = r[1]; j < qta; j += 1) {
        labels.push(label);
      }
    }
    return labels.sort(comparator);
  }

  function toTxt(couchdb, rows, codiciScalarini, listaModelli, comparator, callback) {
    // TODO Prendere la versione del listino dalla scheda dell'azienda
    listino.getLatest(couchdb, '1', function (err, prezzi) {
      if (err) {
        return callback(err);
      }
      var dataRows = toSortedLabels(prezzi.negozio, codiciScalarini, listaModelli, rows, comparator, callback);

      callback(null, _.template(template, { rows: dataRows }));
    });
  }

  return {
    comparators: comparators,
    stampa: function (couchdb, docId, comparatorName, callback) {
      couchdb.get([docId, 'Scalarini', 'ModelliEScalarini'], function (errDb, docs) {
        if (errDb) {
          return callback(errDb);
        }
        var rows = docs.rows[0].doc.rows,
          codiciScalarini = docs.rows[1].doc.codici,
          listaModelli = docs.rows[2].doc.lista;

        toTxt(couchdb, rows, codiciScalarini, listaModelli, comparators[comparatorName], callback);
      });
    },
    stampaFromCsvFile: function (csvFileName, couchdb, comparatorName, callback) {
      var articoli = [];
      csv().fromPath(csvFileName, {
        columns: true
      }).on('data', function (data) {
        var stagione = data.Stagione,
          modello = data.Modello,
          articolo = data.Articolo,
          colore = data.Colore,
          taglia = data.Taglia,
          giacenza = data.Giacenza,
          codice = codici.codiceAs400(stagione, modello, articolo, colore, taglia);

        if (!codice) {
          return callback('Codice non valido: stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '"');
        } else if (!/^\d+$/.test(giacenza)) {
          return callback('Giacenza non valida: stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '", giacenza="' + giacenza + '"');
        } else {
          return articoli.push([codice, parseInt(giacenza, 10)]);
        }
      }).on('end', function () {
        couchdb.get(['Scalarini', 'ModelliEScalarini'], function (errDb, docs) {
          if (errDb) {
            return callback(errDb);
          }
          var codiciScalarini = docs.rows[0].doc.codici,
            listaModelli = docs.rows[1].doc.lista;

          toTxt(couchdb, articoli, codiciScalarini, listaModelli, comparators[comparatorName], callback);
        });
      }).on('error', function (err) {
        callback(err);
      });
    }
  };
});