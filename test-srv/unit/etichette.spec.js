/*jslint node: true */
/*jshint node: true */
/*global describe: false, beforeEach: false, afterEach: false, it: false, xit: false, expect: false, jasmine: false */

var requirejs = require('requirejs');
requirejs.config({
  baseUrl: __dirname + '/../..',
  nodeRequire: require
});

requirejs(['lib/etichette'], function (etichette) {
  'use strict';

  describe('Comparators', function () {
    var comparators = etichette.comparators;

    describe('TSMAC', function () {
      var tsmac = comparators.TSMAC,
        r1 = { taglia: '01', barcode: '123456789012345601' },
        r2 = { taglia: '02', barcode: '123456789012345602' },
        r3 = { taglia: 'TU', barcode: '123456789012345601' };

      it('should sort by size, then by barcode', function () {
        expect([r1, r2].sort(tsmac)).toEqual([r1, r2]);
        expect([r2, r1].sort(tsmac)).toEqual([r1, r2]);
        expect([r3, r2, r1].sort(tsmac)).toEqual([r1, r2, r3]);
      });
    });
  });
});