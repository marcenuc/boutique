/*global define: false */

define(['app/js/codici'], function (codici) {
  'use strict';

  var lenStagione = codici.LEN_STAGIONE;

  function comparatorString(a, b) {
    return (a < b) ? -1 : (a > b ? 1 : 0);
  }

  function comparatorBarcodeMacts(a, b) {
    var cmpMact = comparatorString(a.substring(lenStagione), b.substring(lenStagione));
    if (cmpMact !== 0) {
      return cmpMact;
    }
    // cmpStagione
    return comparatorString(a.substring(0, lenStagione), b.substring(0, lenStagione));
  }

  return {

    string: comparatorString,
    barcodeMacts: comparatorBarcodeMacts,

    rigaGiacenze: function (a, b) {
      var cmpAzienda, diffTipoMagazzino, diffStato,
        cmpMacts = comparatorBarcodeMacts(a[0], b[0]);
      if (cmpMacts !== 0) {
        return cmpMacts;
      }
      cmpAzienda = comparatorString(a[2], b[2]);
      if (cmpAzienda !== 0) {
        return cmpAzienda;
      }
      diffTipoMagazzino = a[4] - b[4];
      if (diffTipoMagazzino !== 0) {
        return diffTipoMagazzino;
      }
      diffStato = a[3] - b[3];
      if (diffStato !== 0) {
        return diffStato;
      }
      // diffQta
      return a[1] - b[1];
    }
  };
});