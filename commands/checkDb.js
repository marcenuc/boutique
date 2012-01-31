/*global console:false, require:false, process:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['lib/inventario'], function (inventario) {
  'use strict';
  inventario.verifica(function (err, giacenzeNegative) {
    if (err) {
      return console.dir(err);
    }
    giacenzeNegative.rows.forEach(function (r) {
      console.log(r.key.join(' '), r.value);
    });
  });
});
