/*global define:false*/

/*
 * This module contains all views used in CouchDB.
 * Using a module, allows for easy testing.
 */
define(function (require) {
  'use strict';
  var rows = [];

  function emit(k, v) {
    rows.push([k, v]);
  }

  // '_*' fields are only used for testing, and never loaded in CouchDB.
  return {
    _resetRows: function () {
      rows = [];
    },

    _rows: function () {
      return rows;
    },

    aziende: function mapAziende(doc) {
      var sep, codici = require('views/lib/codici'),
        ids = codici.splitId(doc._id);
      if (codici.isAzienda(ids)) {
        sep = codici.hasExternalWarehouse(doc) ? '_' : ' ';
        emit(ids[1], ids[1] + sep + doc.nome);
      }
    },

    costo: function mapCosto(doc) {
      var costi = doc.costi,
        codici = require('views/lib/codici'),
        ids = codici.splitId(doc._id);
      if (ids[0] === 'CostoArticoli' && costi && codici.isCode(ids[1], codici.LEN_STAGIONE)) {
        Object.keys(costi).forEach(function(modello) {
          var costoModelli = costi[modello], sm = ids[1] + modello;
          Object.keys(costoModelli).forEach(function(articolo) {
            emit(sm + articolo, costoModelli[articolo]);
          });
        });
      }
    },

    listini: function mapListini(doc) {
      var codici = require('views/lib/codici'),
        codes = codici.parseIdListino(doc._id);
      if (codes) {
        emit(codes.versione, null);
      }
    },

    movimentoMagazzinoAccodato: function mapMovimentoMagazzinoAccodato(doc) {
      if (doc.accodato) {
        var year, codici = require('views/lib/codici'),
          codes = codici.parseIdMovimentoMagazzino(doc._id);
        if (codes) {
          year = parseInt(codes.anno, 10);
          emit([codes.magazzino1, year, codes.gruppo, codes.numero], 1);
          if (doc.magazzino2) {
            emit([doc.magazzino2, codes.magazzino1, year, codes.gruppo, codes.numero], 1);
          }
        }
      }
    },

    movimentoMagazzinoPendente: function mapMovimentoMagazzinoPendente(doc) {
      if (!doc.accodato) {
        var codici = require('views/lib/codici'),
          codes = codici.parseIdMovimentoMagazzino(doc._id);
        if (codes) {
          emit([codes.magazzino1, doc.data, doc.causale1[0], codes.gruppo, codes.numero], 1);
        }
      }
    },

    movimentiArticolo: function mapMovimentiArticolo(doc) {
      if (doc.rows && doc.causale1 && doc.data) {
        var colBarcode, emitted, codici = require('views/lib/codici'),
          codes = codici.parseIdMovimentoMagazzino(doc._id);
        if (codes) {
          colBarcode = codici.colNamesToColIndexes(doc.columnNames).barcode;
          emitted = {};
          doc.rows.forEach(function (row) {
            var smact = row[colBarcode];
            if (!emitted[smact]) {
              emit([codes.magazzino1, row[colBarcode], doc.data], doc.causale1[0]);
              emitted[smact] = 1;
            }
          });
        }
      }
    },

    contatori: function mapContatori(doc) {
      var codici = require('views/lib/codici'),
        codes = codici.parseIdMovimentoMagazzino(doc._id);
      if (codes) {
        emit([codes.magazzino1, parseInt(codes.anno, 10), codes.gruppo, codes.numero], 1);
      }
    },

    riferimentiMovimentiMagazzino: function mapRiferimentiMovimentiMagazzino(doc) {
      var codici = require('views/lib/codici'),
        ids = codici.splitId(doc._id);
      if (codici.isMovimentoMagazzino(ids) && doc.riferimento) {
        emit(doc.riferimento, doc.accodato);
      }
    },

    oldDoc: function mapOldDoc(doc) {
      var colCosto, codici = require('views/lib/codici'),
        ids = codici.splitId(doc._id);

      function isFlag(field) {
        return !doc.hasOwnProperty(field) || [true, false].indexOf(doc[field]) >= 0;
      }

      if (codici.isMovimentoMagazzino(ids)) {
        if (!isFlag('accodato') || !isFlag('esterno1') || !isFlag('esterno2') || !isFlag('inProduzione')) {
          emit(doc._id, 1);
        } else if (doc.rows.length) {
          colCosto = codici.colNamesToColIndexes(doc.columnNames).costo;
          if (doc.rows.every(function (row) {
              return row[colCosto] === 0;
            })) {
            emit(doc._id, 1);
          }
        }
      }
    },

    giacenzeNegative: function mapGiacenzeNegative(doc) {
      var codici, col;
      if (doc._id === 'Giacenze' && doc.rows) {
        codici = require('views/lib/codici');
        col = codici.colNamesToColIndexes(codici.COLUMN_NAMES.Giacenze);
        doc.rows.forEach(function (r) {
          var giacenze = r[col.giacenze];
          Object.keys(giacenze).forEach(function (taglia) {
            var g = giacenze[taglia];
            if (g < 0) {
              emit([r[col.codiceAzienda], r[col.stagione], r[col.modello], r[col.articolo], r[col.colore], taglia, r[col.tipoMagazzino]], g);
            }
          });
        });
      }
    },

    giacenze: {
      map: function mapGiacenze(doc) {
        if (doc.accodato) {
          var smact, inProduzione, tipoMagazzino, tipoMagazzinoA, segno1, segno2,
            col, r, i, ii, rows = doc.rows,
            codici = require('views/lib/codici'),
            codes = codici.parseIdMovimentoMagazzino(doc._id);
          if (codes && rows) {
            col = codici.colNamesToColIndexes(doc.columnNames);
            inProduzione = !!doc.inProduzione;
            tipoMagazzino = doc.tipoMagazzino || codici.TIPO_MAGAZZINO_NEGOZIO;
            segno1 = doc.causale1[1];
            if (doc.magazzino2 && !doc.esterno2) {
              segno2 = doc.causale2[1];
              tipoMagazzinoA = doc.tipoMagazzinoA || codici.TIPO_MAGAZZINO_NEGOZIO;
            }
            for (i = 0, ii = rows.length; i < ii; i += 1) {
              r = rows[i];
              smact = codici.parseBarcodeAs400(r[col.barcode]);
              if (!doc.esterno1) {
                emit([smact.modello, smact.articolo, smact.colore, smact.stagione, codes.magazzino1, inProduzione, tipoMagazzino,
                      r[col.scalarino], smact.taglia, r[col.descrizioneTaglia], r[col.descrizione]], segno1 * r[col.qta]);
              }
              if (doc.magazzino2 && !doc.esterno2) {
                emit([smact.modello, smact.articolo, smact.colore, smact.stagione, doc.magazzino2, inProduzione, tipoMagazzinoA,
                      r[col.scalarino], smact.taglia, r[col.descrizioneTaglia], r[col.descrizione]], segno2 * r[col.qta]);
              }
            }
          }
        }
      },
      reduce: '_sum'
    },

    giacenzeAnno: {
      map: function mapGiacenze(doc) {
        if (doc.accodato) {
          var smact, inProduzione, tipoMagazzino, tipoMagazzinoA, segno1, segno2,
            col, r, i, ii, rows = doc.rows,
            codici = require('views/lib/codici'),
            codes = codici.parseIdMovimentoMagazzino(doc._id);
          if (codes && rows) {
            col = codici.colNamesToColIndexes(doc.columnNames);
            inProduzione = !!doc.inProduzione;
            tipoMagazzino = doc.tipoMagazzino || codici.TIPO_MAGAZZINO_NEGOZIO;
            segno1 = doc.causale1[1];
            if (doc.magazzino2 && !doc.esterno2) {
              segno2 = doc.causale2[1];
              tipoMagazzinoA = doc.tipoMagazzinoA || codici.TIPO_MAGAZZINO_NEGOZIO;
            }
            for (i = 0, ii = rows.length; i < ii; i += 1) {
              r = rows[i];
              smact = codici.parseBarcodeAs400(r[col.barcode]);
              if (!doc.esterno1) {
                emit([codes.anno, smact.modello, smact.articolo, smact.colore, smact.stagione, codes.magazzino1, inProduzione, tipoMagazzino,
                      r[col.scalarino], smact.taglia, r[col.descrizioneTaglia], r[col.descrizione], r[col.costo]], segno1 * r[col.qta]);
              }
              if (doc.magazzino2 && !doc.esterno2) {
                emit([codes.anno, smact.modello, smact.articolo, smact.colore, smact.stagione, doc.magazzino2, inProduzione, tipoMagazzinoA,
                      r[col.scalarino], smact.taglia, r[col.descrizioneTaglia], r[col.descrizione], r[col.costo]], segno2 * r[col.qta]);
              }
            }
          }
        }
      },
      reduce: '_sum'
    }
  };
});
