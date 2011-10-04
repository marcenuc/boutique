/*global define: false */

define(['underscore', 'fs', 'app/js/codici', 'lib/listino'], function (_, fs, codici, listino) {
  'use strict';

  function formatPrezzo(prezzo) {
    var s = String(prezzo);
    return s.slice(0, -2) + ',' + s.slice(-2);
  }

  return {
    stampa: function (couchdb, docId, callback) {
      couchdb.get(docId, function (errDb, bolla) {
        if (errDb) {
          return callback(errDb);
        }
        fs.readFile('lib/etichette-template.txt', 'utf8', function (errFs, template) {
          if (errFs) {
            return callback(errFs);
          }
          listino.getLatest(couchdb, '1', function (errListino, prezzi) {
            if (errListino) {
              return callback(errListino);
            }
            var rows = bolla.rows.map(function (r) {
              var codes = codici.parseBarcodeAs400(r[0]), prezzo;
              if (!codes) {
                return callback('Codice a barre errato: "' + r[0] + '"');
              }
              prezzo = prezzi.negozio[codes[1] + codes[2] + codes[3]];
              if (!prezzo) {
                return callback('Articolo non a listino: "' + r[0] + '"');
              }
              return {
                descrizione: 'DESCRIZIONE',
                barcode: r[0],
                stagione: codes[1],
                modello: codes[2],
                articolo: codes[3],
                colore: codes[4],
                taglia: codes[5],
                prezzo: formatPrezzo(prezzo)
              };
            });
            callback(null, _.template(template, { rows: rows }));
          });
        });
      });
    }
  };
});