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
      var row, k, i = 1;
      start({ headers: { 'Content-Type': 'application/excel' } });
      row = getRow();
      if (row) {
        send('ANNO\tMODELLO\tARTICOLO\tCOLORE\tSTAGIONE\tMAGAZZINO\tIN_PRODUZIONE\tTIPO_MAGAZZINO\tSCALARINO\tTAGLIA\tDESCRIZIONE_TAGLIA\tDESCRIZIONE\tCOSTO\tGIACENZA\tTOTALE\r\n');
      }
      while (row) {
        if (row.value !== 0) {
          k = row.key;
          i += 1;
          send(['"', k.slice(0, 7).join('"\t"'), '"\t', k[7], '\t', k[8], '\t"', k.slice(9, 12).join('"\t"'), '"\t', k[12], '\t', row.value, '\t=M', i, '*N', i, '/100\r\n'].join(''));
        }
        row = getRow();
      }
      send('""\t""\t""\t""\t""\t""\t""\t\t\t""\t""\t""\t\t\t=SOMMA(O2:O' + i + ')\r\n');
    }
  };
});
