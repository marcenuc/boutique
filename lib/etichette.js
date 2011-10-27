/*global define: false */

define(['underscore', 'fs', 'app/js/codici', 'lib/listino'], function (_, fs, codici, listino) {
  'use strict';

  function formatPrezzo(prezzo) {
    var s = String(prezzo);
    return prezzo ? s.slice(0, -2) + ',' + s.slice(-2) : '0';
  }

  var comparators = {
      TSMAC: function (a, b) {
        if (a.taglia < b.taglia) {
          return -1;
        }
        if (a.taglia > b.taglia) {
          return 1;
        }
        return a.barcode < b.barcode ? -1 : a.barcode > b.barcode ? 1 : 0;
      },

      SMACT: function (a, b) {
        return a.barcode < b.barcode ? -1 : a.barcode > b.barcode ? 1 : 0;
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

  function loadTemplate(layout, formato) {
    var fileName = 'templates/etichette-' + layout + '-' + formato + '.txt';
    return fs.readFileSync(fileName, 'utf8');
  }

  function parseRow(r, col) {
    var codes;
    if (col.hasOwnProperty('barcode')) {
      codes = codici.parseBarcodeAs400(r[col.barcode]);
      codes.giacenze = {};
      codes.giacenze[codes.taglia] = r[col.giacenza || col.qta];
    } else {
      codes = {
        stagione: r[col.stagione],
        modello: r[col.modello],
        articolo: r[col.articolo],
        colore: r[col.colore],
        giacenze: r[col.giacenze]
      };
    }
    return codes;
  }

  function articoliRowsToLabelRows(warns, articoli, listinoAzienda, descrizioniTaglie, modelli) {
    var prezziArticolo, qtas, taglia, qta, descrizioni, label, j,
      prezzi = listinoAzienda.prezzi,
      colListino = codici.colNamesToColIndexes(listinoAzienda.columnNames),
      colArticoli = codici.colNamesToColIndexes(articoli.columnNames),
      labels = [], rows = articoli.rows, i = 0, n = rows.length, r;
    for (; i < n; i += 1) {
      r = parseRow(rows[i], colArticoli);
      prezziArticolo = codici.getProperty(prezzi, r.stagione, r.modello, r.articolo);
      if (!prezziArticolo) {
        warns.push('Articolo non a listino: stagione="' + r.stagione + '", modello="' + r.modello + '", articolo="' + r.articolo + '"');
      } else {
        qtas = r.giacenze;
        for (taglia in qtas) {
          if (qtas.hasOwnProperty(taglia)) {
            descrizioni = codici.descrizioniModello(r.stagione, r.modello, taglia, descrizioniTaglie, modelli);
            if (descrizioni[0]) {
              warns.push(descrizioni[0] + ': stagione="' + r.stagione + '", modello="' + r.modello + '", articolo="' + r.articolo + '", taglia="' + r.taglia + '"');
            } else {
              label = {
                descrizione: descrizioni[1].descrizione.substring(0, 19),
                barcode: codici.codiceAs400(r.stagione, r.modello, r.articolo, r.colore, taglia),
                stagione: r.stagione,
                modello: r.modello,
                articolo: r.articolo,
                colore: r.colore,
                taglia: taglia,
                descrizioneTaglia: descrizioni[1].descrizioneTaglia,
                prezzo1: formatPrezzo(prezziArticolo[colListino.prezzo1]),
                prezzo2: formatPrezzo(prezziArticolo[colListino.prezzo2]),
                offerta: prezziArticolo[colListino.offerta] || ''
              };
              //TODO qui si potrebbe sfruttare il campo quantità nella stampa etichette
              for (j = 0, qta = qtas[taglia]; j < qta; j += 1) {
                labels.push(label);
              }
            }
          }
        }
      }
    }
    return labels;
  }

  return {
    comparators: comparators,

    stampaFromGiacenze: function (couchdb, codiceAzienda, tipoMagazzino, comparatorName, layout, formato, callback) {
      couchdb.get(['Giacenze', 'TaglieScalarini', 'ModelliEScalarini', codici.idAzienda(codiceAzienda)], function (errDb, docs) {
        if (errDb) {
          return callback(errDb);
        }
        var giacenze = docs.rows[0].doc,
          col = codici.colNamesToColIndexes(giacenze.columnNames),
          rows = giacenze.rows.filter(function (r) {
            return r[col.codiceAzienda] === codiceAzienda && r[col.tipoMagazzino] === tipoMagazzino;
          }),
          descrizioniTaglie = docs.rows[1].doc.descrizioniTaglie,
          listaModelli = docs.rows[2].doc.lista,
          azienda = docs.rows[3].doc;

        listino.getLatest(couchdb, azienda.versioneListino, function (err, listinoAzienda) {
          if (err) {
            return callback(err);
          }
          if (!listinoAzienda) {
            return callback('Listino versione ' + azienda.versioneListino + ' non trovato');
          }
          var warns = [],
            articoli = { columnNames: giacenze.columnNames, rows: rows },
            labels = articoliRowsToLabelRows(warns, articoli, listinoAzienda, descrizioniTaglie, listaModelli),
            template = loadTemplate(layout, formato),
            comparator = comparators[comparatorName];
          if (!comparator) {
            return callback('Ordinamento sconosciuto');
          }
          callback(null, warns, _.template(template, { rows: labels.sort(comparator) }));
        });
      });
    },

    stampaFromMovimentoMagazzino: function (idMovimentoMagazzino, couchdb, comparatorName, layout, formato, callback) {
      var idAzienda = codici.idAzienda(codici.parseIdMovimentoMagazzino(idMovimentoMagazzino).origine);
      couchdb.get(['TaglieScalarini', 'ModelliEScalarini', idMovimentoMagazzino, idAzienda], function (errDb, docs) {
        if (errDb) {
          return callback(errDb);
        }
        var taglieScalarini = docs.rows[0].doc,
          listaModelli = docs.rows[1].doc.lista,
          movimentoMagazzino = docs.rows[2].doc,
          azienda = docs.rows[3].doc,
          descrizioniTaglie = taglieScalarini.descrizioniTaglie;

        listino.getLatest(couchdb, azienda.versioneListino, function (err, listinoAzienda) {
          if (err) {
            return callback(err);
          }
          if (!listinoAzienda) {
            return callback('Listino non trovato');
          }
          var warns = [],
            labels = articoliRowsToLabelRows(warns, movimentoMagazzino, listinoAzienda, descrizioniTaglie, listaModelli),
            template = loadTemplate(layout, formato),
            comparator = comparators[comparatorName];
          if (!comparator) {
            return callback('Ordinamento sconosciuto');
          }
          callback(null, warns, _.template(template, { rows: labels.sort(comparator) }));
        });
      });
    }
  };
});