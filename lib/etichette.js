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
    },

    MACTS: function (a, b) {
      var mactA = a.barcode.substring(3),
        mactB = b.barcode.substring(3);

      if (mactA < mactB) {
        return -1;
      }
      if (mactA > mactB) {
        return 1;
      }
      return a.barcode < b.barcode ? -1 : a.barcode > b.barcode ? 1 : 0;
    }
  };

  function toLabels(warns, prezzi, descrizioniTaglie, listaModelli, rows) {
    var labels = [];
    rows.forEach(function (r) {
      var p, prezzo, offerta, descrizioni, label, j, qta,
        codes = codici.parseBarcodeAs400(r[0]);
      if (!codes) {
        warns.push('Codice a barre errato: "' + r[0] + '"');
      } else if (prezzi.hasOwnProperty(codes.codiceListino)) {
        p = prezzi[codes.codiceListino];
        prezzo = p[0];
        if (typeof p[p.length - 1] === 'string') {
          offerta = p[p.length - 1];
        } else {
          offerta = '';
        }
        descrizioni = codici.barcodeDescs(codes, descrizioniTaglie, listaModelli);
        if (descrizioni[0]) {
          warns.push(descrizioni[0] + ': "' + r[0] + '"');
        } else {
          label = {
            descrizione: descrizioni[1].descrizione.substring(0, 19),
            barcode: r[0],
            stagione: codes.stagione,
            modello: codes.modello,
            articolo: codes.articolo,
            colore: codes.colore,
            descrizioneTaglia: descrizioni[1].descrizioneTaglia,
            prezzo: formatPrezzo(prezzo),
            offerta: offerta
          };
          //TODO qui si potrebbe sfruttare il campo quantità nella stampa etichette
          for (j = 0, qta = r[1]; j < qta; j += 1) {
            labels.push(label);
          }
        }
      } else {
        warns.push('Articolo non a listino: "' + r[0] + '"');
      }
    });
    return labels;
  }

  function toTxt(warns, couchdb, rows, descrizioniTaglie, listaModelli, comparator, callback) {
    if (!comparator) {
      return callback('Ordinamento sconosciuto.');
    }
    // TODO Prendere la versione del listino dalla scheda dell'azienda
    listino.getLatest(couchdb, '1', function (err, docListino) {
      if (err) {
        return callback(err);
      }
      var dataRows = toLabels(warns, docListino.prezzi, descrizioniTaglie, listaModelli, rows);

      callback(null, warns, _.template(template, { rows: dataRows.sort(comparator) }));
    });
  }

  return {
    comparators: comparators,

    stampa: function (couchdb, azienda, comparatorName, callback) {
      couchdb.get(['Giacenze', 'TaglieScalarini', 'ModelliEScalarini'], function (errDb, docs) {
        if (errDb) {
          return callback(errDb);
        }
        var rows = docs.rows[0].doc.rows.filter(function (r) {
          //TODO usare columnNames
          return r[2] === azienda;
        }),
          descrizioniTaglie = docs.rows[1].doc.descrizioniTaglie,
          listaModelli = docs.rows[2].doc.lista;

        toTxt([], couchdb, rows, descrizioniTaglie, listaModelli, comparators[comparatorName], callback);
      });
    },

    stampaFromCsvFile: function (csvFileName, couchdb, comparatorName, callback) {
      couchdb.get(['TaglieScalarini', 'ModelliEScalarini'], function (errDb, docs) {
        var taglieScalarini = docs.rows[0].doc,
          listaModelli = docs.rows[1].doc.lista,
          descrizioniTaglie = taglieScalarini.descrizioniTaglie,
          taglie = taglieScalarini.taglie,
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