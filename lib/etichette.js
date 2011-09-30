/*global define: false */

define(['require', '../app/js/patterns'], function (require, patterns) {
  'use strict';
  var _ = require('underscore'),
    fs = require('fs');

  return {
    toTxt: function (bolla, callback) {
     fs.readFile('lib/etichette-template.txt', 'utf8', function (err, template) {
       if (err) {
         return callback(err);
       }
       var rows = bolla.rows.map(function (r) {
         var codes = patterns.rexpBarcodeAs400.exec(r[0]);
         return {
             descrizione: 'DESCRIZIONE',
             barcode: r[0],
             stagione: codes[1],
             modello: codes[2],
             articolo: codes[3],
             colore: codes[4],
             taglia: codes[5],
             prezzo: '999,99'
           };
       });
       callback(null, _.template(template, { rows: rows }));
      });
    }
  };
});