/*global define: false*/

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

  // '_*' fields are only used for testing, and never loaded in CouchDB.'
  return {
    _resetRows: function () {
      rows = [];
    },

    _rows: function () {
      return rows;
    },

    aziende: function mapAziende(doc) {
      var codici = require('views/lib/codici'),
        ids = codici.splitId(doc._id);
      if (codici.isAzienda(ids)) {
        emit(ids[1], ids[1] + ' ' + doc.nome);
      }
    },

    movimentoMagazzinoAccodato: function mapMovimentoMagazzinoAccodato(doc) {
      if (doc.accodato) {
        var year, codici = require('views/lib/codici'),
          codes = codici.parseIdMovimentoMagazzino(doc._id);
        if (codes) {
          year = parseInt(codes.anno, 10);
          emit([codes.da, year, codes.gruppo, codes.numero], 1);
          if (doc.a) {
            emit([doc.a, codes.da, year, codes.gruppo, codes.numero], 1);
          }
        }
      }
    },

    movimentoMagazzinoPendente: function mapMovimentoMagazzinoPendente(doc) {
      if (!doc.accodato) {
        var codici = require('views/lib/codici'),
          codes = codici.parseIdMovimentoMagazzino(doc._id);
        if (codes) {
          emit([codes.da, doc.data, doc.causale[0], codes.gruppo, codes.numero], 1);
        }
      }
    },

    contatori: function mapContatori(doc) {
      var codici = require('views/lib/codici'),
        codes = codici.parseIdMovimentoMagazzino(doc._id);
      if (codes) {
        emit([codes.da, parseInt(codes.anno, 10), codes.gruppo, codes.numero], 1);
      }
    },

    riferimentiMovimentiMagazzino: function mapRiferimentiMovimentiMagazzino(doc) {
      var codici = require('views/lib/codici'),
        ids = codici.splitId(doc._id);
      if (codici.isMovimentoMagazzino(ids) && doc.riferimento) {
        emit(doc.riferimento, doc.accodato);
      }
    },

    giacenze: {
      map: function mapGiacenze(doc) {
        if (doc.verificato) {
          var smact, inProduzione, tipoMagazzino, tipoMagazzinoA, segnoDa, segnoA,
            col, r, i, ii, rows = doc.rows,
            codici = require('views/lib/codici'),
            codes = codici.parseIdMovimentoMagazzino(doc._id);
          if (codes && rows) {
            col = codici.colNamesToColIndexes(doc.columnNames);
            inProduzione = doc.inProduzione || 0;
            tipoMagazzino = doc.tipoMagazzino || codici.TIPO_MAGAZZINO_NEGOZIO;
            segnoDa = doc.causale[1];
            if (doc.a && !doc.aEsterno) {
              segnoA = doc.causaleA[1];
              tipoMagazzinoA = doc.tipoMagazzinoA || codici.TIPO_MAGAZZINO_NEGOZIO;
            }
            for (i = 0, ii = rows.length; i < ii; i += 1) {
              r = rows[i];
              smact = codici.parseBarcodeAs400(r[col.barcode]);
              if (!doc.daEsterno) {
                emit([smact.modello, smact.articolo, smact.colore, smact.stagione, codes.da, inProduzione, tipoMagazzino,
                      r[col.scalarino], smact.taglia, r[col.descrizioneTaglia], r[col.descrizione]], segnoDa * r[col.qta]);
              }
              if (doc.a && !doc.aEsterno) {
                emit([smact.modello, smact.articolo, smact.colore, smact.stagione, doc.a, inProduzione, tipoMagazzinoA,
                      r[col.scalarino], smact.taglia, r[col.descrizioneTaglia], r[col.descrizione]], segnoA * r[col.qta]);
              }
            }
          }
        }
      },
      reduce: '_sum'
    }
  };
});
