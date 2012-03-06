/*global define:false*/

/*
 * This module contains all lists used in CouchDB.
 * Using a module, allows for easy testing.
 */
define(function () {
  'use strict';
  var startResp, sent, nextRow, rows;

  function resetAll() {
    startResp = null;
    sent = [];
    nextRow = null;
    rows = null;
  }

  function start(obj) {
    if (nextRow > 0) {
      throw new Error("Can't start after getRow()");
    }
    startResp = obj;
  }

  function send(output) {
    sent.push(output);
  }

  function getRow() {
    if (nextRow < rows.length) {
      var row = rows[nextRow];
      nextRow += 1;
      return row;
    }
  }

  // '_*' fields are only used for testing, and never loaded in CouchDB.
  return {
    _setRows: function (newRows) {
      nextRow = 0;
      rows = newRows;
    },

    _reset: resetAll,

    _output: function () {
      return [startResp, sent.join('')];
    },

    giacenzeTSV: function listGiacenzeTSV() {
      var row;
      start({ headers: { 'Content-Type': 'application/excel' } });
      row = getRow();
      if (row) {
        send('MODELLO\tARTICOLO\tCOLORE\tSTAGIONE\tMAGAZZINO\tIN_PRODUZIONE\tTIPO_MAGAZZINO\tSCALARINO\tTAGLIA\tDESCRIZIONE_TAGLIA\tDESCRIZIONE\tCOSTO\tGIACENZA\r\n');
      }
      while (row) {
        send([row.key.join('\t'), '\t', row.value, '\r\n'].join(''));
        row = getRow();
      }
    }
  };
});
