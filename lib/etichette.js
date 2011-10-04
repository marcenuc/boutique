/*global define: false */

define(['underscore', 'app/js/codici', 'lib/listino', 'text!lib/etichette-template.txt'], function (_, codici, listino, template) {
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
        listino.getLatest(couchdb, '1', function (errListino, prezzi) {
          if (errListino) {
            return callback(errListino);
          }
          couchdb.get('ModelliEScalarini', function (errDb2, modelli) {
            if (errDb2) {
              return callback(errDb2);
            }
            var rows = bolla.rows.map(function (r) {
              var codes = codici.parseBarcodeAs400(r[0]), prezzo, descrizione;
              if (!codes) {
                return callback('Codice a barre errato: "' + r[0] + '"');
              }
              prezzo = prezzi.negozio[codes.codiceListino];
              if (!prezzo) {
                return callback('Articolo non a listino: "' + r[0] + '"');
              }
              descrizione = modelli.lista[codes.codiceDescrizioneEScalarino];
              if (!descrizione) {
                return callback('Articolo non in anagrafe: "' + r[0] + '"');
              }
              return {
                descrizione: descrizione[0],
                barcode: r[0],
                stagione: codes.stagione,
                modello: codes.modello,
                articolo: codes.articolo,
                colore: codes.colore,
                taglia: codes.taglia,
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