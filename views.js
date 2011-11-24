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

  return {
    _resetRows: function () {
      rows = [];
    },

    _rows: function () {
      return rows;
    },

    movimentiMagazzinoAccodati: function map(doc) {
      var codici = require('views/lib/codici'),
        ids = codici.splitId(doc._id);
      if (codici.isMovimentoMagazzino(ids) && doc.accodato) {
        // TODO DRY centralize parsing of ids
        emit([ids[1], parseInt(ids[2], 10), ids[3], parseInt(ids[4], 10)], 1);
        if (doc.causaleDestinazione) {
          emit([doc.destinazione, ids[1], parseInt(ids[2], 10), ids[3], parseInt(ids[4], 10)], 1);
        }
      }
    },

    contatoriMovimentiMagazzino: function map(doc) {
      var codici = require('views/lib/codici'),
        ids = codici.splitId(doc._id);
      // TODO DRY centralize parsing of ids
      if (codici.isMovimentoMagazzino(ids)) {
        emit([ids[1], parseInt(ids[2], 10), ids[3], parseInt(ids[4], 10)], 1);
      }
    },

    riferimentiMovimentiMagazzino: function map(doc) {
      var codici = require('views/lib/codici'),
        ids = codici.splitId(doc._id);
      if (codici.isMovimentoMagazzino(ids) && doc.riferimento) {
        emit(doc.riferimento, doc.accodato);
      }
    }
  };
});
