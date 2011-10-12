/*jslint node: true */
/*jshint node: true */
/*global describe: false, beforeEach: false, afterEach: false, it: false, xit: false, expect: false, jasmine: false */

var requirejs = require('requirejs');
requirejs.config({
  baseUrl: __dirname + '/../..',
  nodeRequire: require
});

requirejs(['lib/comparator'], function (comparator) {
  'use strict';
  var sortedBarcodes = ['123123456789012345', '124123456789012345'];

  function checkAll(rows, doCompare, expectation) {
    var i = 0, n = rows.length - 1, j, l = n + 1;
    for (; i < n; i += 1) {
      for (j = i + 1; j < l; j += 1) {
        expect(doCompare(rows[i], rows[j]))[expectation](0);
      }
    }
  }

  describe('string(a, b)', function () {
    var sortedStrings = ['099999', '199999', 'x'];
    it('should return zero when a==b', function () {
      sortedStrings.forEach(function (a) {
        expect(comparator.string(a, a)).toBe(0);
      });
    });

    it('should return a negative value when a<b according to modello, articolo, colore, taglia, stagione', function () {
      checkAll(sortedStrings, comparator.string, 'toBeLessThan');
    });

    it('should return a positive value when a>b according to modello, articolo, colore, taglia, stagione', function () {
      checkAll(sortedStrings, function (a, b) {
        return comparator.string(b, a);
      }, 'toBeGreaterThan');
    });
  });

  describe('barcodeMacts(a, b)', function () {
    it('should return zero when a==b', function () {
      sortedBarcodes.forEach(function (a) {
        expect(comparator.barcodeMacts(a, a)).toBe(0);
      });
    });

    it('should return a negative value when a<b according to modello, articolo, colore, taglia, stagione', function () {
      checkAll(sortedBarcodes, comparator.barcodeMacts, 'toBeLessThan');
    });

    it('should return a positive value when a>b according to modello, articolo, colore, taglia, stagione', function () {
      checkAll(sortedBarcodes, function (a, b) {
        return comparator.barcodeMacts(b, a);
      }, 'toBeGreaterThan');
    });
  });

  describe('rigaGiacenze(a, b)', function () {
    var sortedRows = [
        [sortedBarcodes[0], 1, '099999', 0, 1],
        [sortedBarcodes[0], 1, '199999', 0, 1],
        [sortedBarcodes[0], 1, '199999', 0, 2],
        [sortedBarcodes[0], 1, '199999', 1, 2],
        [sortedBarcodes[0], 2, '199999', 1, 2],
        [sortedBarcodes[1], 1, '099999', 0, 1],
        [sortedBarcodes[1], 1, '199999', 0, 1],
        [sortedBarcodes[1], 1, '199999', 0, 2],
        [sortedBarcodes[1], 1, '199999', 1, 2],
        [sortedBarcodes[1], 2, '199999', 1, 2]
      ];
    it('should return zero when a==b', function () {
      sortedRows.forEach(function (a) {
        expect(comparator.rigaGiacenze(a, a)).toBe(0);
      });
    });

    it('should return a negative value when a<b according to modello, articolo, colore, taglia, stagione', function () {
      checkAll(sortedRows, comparator.rigaGiacenze, 'toBeLessThan');
    });

    it('should return a positive value when a>b according to modello, articolo, colore, taglia, stagione', function () {
      checkAll(sortedRows, function (a, b) {
        return comparator.rigaGiacenze(b, a);
      }, 'toBeGreaterThan');
    });
  });
});