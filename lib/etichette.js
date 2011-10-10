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

  function toLabels(warns, prezzi, descrizioniTaglie, listaModelli, rows) {
    var labels = [];
    rows.forEach(function (r) {
      var prezzo, descrizioni, label, j, qta,
        codes = codici.parseBarcodeAs400(r[0]);
      if (!codes) {
        warns.push('Codice a barre errato: "' + r[0] + '"');
      } else {
        prezzo = prezzi[codes.codiceListino];
        if (typeof prezzo !== 'number') {
          warns.push('Articolo non a listino: "' + r[0] + '"');
        } else {
          descrizioni = codici.barcodeDescs(codes, descrizioniTaglie, listaModelli);
          if (!descrizioni) {
            warns.push('Articolo non in anagrafe: "' + r[0] + '"');
          } else {
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
        }
      }
    });
    return labels;
  }

  function toTxt(warns, couchdb, rows, descrizioniTaglie, listaModelli, comparator, callback) {
    if (!comparator) {
      return callback('Ordinamento sconosciuto.');
    }
    // TODO Prendere la versione del listino dalla scheda dell'azienda
    listino.getLatest(couchdb, '1', function (err, prezzi) {
      if (err) {
        return callback(err);
      }
      var dataRows = toLabels(warns, prezzi.negozio, descrizioniTaglie, listaModelli, rows);

      callback(null, warns, _.template(template, { rows: dataRows.sort(comparator) }));
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
          //TODO rinominare codici in descrizioni
          descrizioniTaglie = docs.rows[1].doc.codici,
          listaModelli = docs.rows[2].doc.lista;

        toTxt([], couchdb, rows, descrizioniTaglie, listaModelli, comparators[comparatorName], callback);
      });
    },

    stampaFromCsvFile: function (csvFileName, couchdb, comparatorName, callback) {
      couchdb.get(['Scalarini', 'ModelliEScalarini'], function (errDb, docs) {
        var scalarini = docs.rows[0].doc,
          // TODO rinominare codici in descrizioni.
          descrizioniTaglie = scalarini.codici,
          // TODO rinominare descrizioni in codici.
          codiciTaglie = scalarini.descrizioni,
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
            taglia = codici.codiceTaglia(stagione, modello, codiciTaglie, listaModelli, descrizioneTaglia),
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
          articoli.push([codice, parseInt(giacenza, 10)]);
        }).on('end', function () {
          var e = errs.join('\n');
          if (errDb) {
            return callback(e + '\n' + errDb);
          }
          if (errs.length) {
            return callback(e);
          }
          toTxt([], couchdb, articoli, descrizioniTaglie, listaModelli, comparators[comparatorName], callback);
        }).on('error', function (err) {
          callback(err);
        });
      });
    }
  };
});