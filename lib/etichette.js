/*global define: false */

define(['underscore', 'app/js/codici', 'lib/listino', 'text!lib/etichette-template.txt'], function (_, codici, listino, template) {
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
    return rows.map(function (r) {
      var codes = codici.parseBarcodeAs400(r[0]), prezzo, descrizioni;
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
      return {
        descrizione: descrizioni.descrizione,
        barcode: r[0],
        stagione: codes.stagione,
        modello: codes.modello,
        articolo: codes.articolo,
        colore: codes.colore,
        taglia: descrizioni.descrizioneTaglia,
        prezzo: formatPrezzo(prezzo)
      };
    }).sort(comparator);
  }

  return {
    comparators: comparators,
    stampa: function (couchdb, docId, comparator, callback) {
      couchdb.get([docId, 'Scalarini', 'ModelliEScalarini'], function (errDb, docs) {
        if (errDb) {
          return callback(errDb);
        }
        listino.getLatest(couchdb, '1', function (errListino, prezzi) {
          if (errListino) {
            return callback(errListino);
          }
          var rows = docs.rows[0].doc.rows,
            codiciScalarini = docs.rows[1].doc.codici,
            listaModelli = docs.rows[2].doc.lista,
            sort = comparators[comparator],
            dataRows = toSortedLabels(prezzi.negozio, codiciScalarini, listaModelli, rows, sort, callback);

          callback(null, _.template(template, { rows: dataRows }));
        });
      });
    }
  };
});