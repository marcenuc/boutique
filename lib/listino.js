/*global define: false */

define(['csv'], function (csv) {
  'use strict';
  //TODO DRY
  var rexpSMA = /^(\d{12})\s*$/;

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
        var mp, prezzo,
          stagione = data.Stagione,
          modello = data.Modello,
          articolo = data.Articolo,
          codice = stagione + modello + articolo,
          prezzoFloat = data.Listino,
          mc = rexpSMA.exec(codice);
        if (!mc) {
          warns.push('Codice non valido: stagione="' + stagione + '", modello="' + modello + '", articolo="' + articolo + '"');
        } else {
          mp = /^([0-9]+)(?:\.([0-9]{1,2}))?$/.exec(prezzoFloat);
          if (mp) {
            prezzo = parseInt(mp[1] + pad(mp[2]), 10);
            lista.push([mc[1], prezzo]);
          } else {
            warns.push('Prezzo non valido per "' + codice + '": "' + prezzoFloat + '"');
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