/*global console: false, require: false, process: false*/
process.env.LANG = 'C';
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require, paths: { 'dbconfig': 'app/js/config', 'views/lib/codici': 'app/js/codici' } });

requirejs(['lib/inventario'], function (inventario) {
  'use strict';
  inventario.update(function (err) {
    if (err) {
      return console.dir(err);
    }
  });
});
