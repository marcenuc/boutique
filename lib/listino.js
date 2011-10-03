/*global define: false */

define(['csv'], function (csv) {
  'use strict';
  //TODO DRY
  var rexpSMA = /^\d{12}$/;

  function pad(n) {
    if (n) {
      return n.length < 2 ? n + '0' : n;
    }
    return '00';
  }

  return {
    readFromCsvFile: function (csvFileName, callback) {
      var warns = [], lista = [];
      csv().fromPath(csvFileName, {
        columns: true
      }).on('data', function (data) {
        var codice = data.Stagione + data.Modello + data.Articolo,
          prezzoFloat = data.Listino_1,
          m,
          prezzo;
        if (!rexpSMA.test(codice)) {
          warns.push('Codice non valido: ' + codice);
        } else {
          m = /^([0-9]+)(?:\.([0-9]{1,2}))?$/.exec(prezzoFloat);
          if (m) {
            prezzo = parseInt(m[1] + pad(m[2]), 10);
            lista.push([codice, prezzo]);
          } else {
            warns.push('Prezzo non valido per ' + codice + ': "' + prezzoFloat + '"');
          }
        }
      }).on('end', function () {
        callback(null, warns, lista);
      }).on('error', function (err) {
        callback(err);
      });
    }
  };
});