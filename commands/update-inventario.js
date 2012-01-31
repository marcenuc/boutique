/*global console:false, require:false, process:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['lib/inventario'], function (inventario) {
  'use strict';
  inventario.update(function (err) {
    if (err) {
      return console.dir(err);
    }
  });
});
