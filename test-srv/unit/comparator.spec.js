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
  var firstBarcode = '123123456789012345',
    secondBarcode = '124123456789012345';

  function checkAll(rows, doCompare, expectation) {
    var i = 0, n = rows.length - 1, j, l = n + 1;
    for (; i < n; i += 1) {
      for (j = i + 1; j < l; j += 1) {
        expect(doCompare(rows[i], rows[j]))[expectation](0);
      }
    }
  }

  describe('string(a, b)', function () {
    it('should return zero when a==b', function () {
      expect(comparator.string('099999', '099999')).toBe(0);
    });

    it('should return a negative value when a<b according to modello, articolo, colore, taglia, stagione', function () {
      expect(comparator.string('099999', '199999')).toBeLessThan(0);
    });

    it('should return a positive value when a>b according to modello, articolo, colore, taglia, stagione', function () {
      expect(comparator.string('199999', '099999')).toBeGreaterThan(0);
    });
  });

  describe('barcodeMacts(a, b)', function () {
    it('should return zero when a==b', function () {
      expect(comparator.barcodeMacts(firstBarcode, firstBarcode)).toBe(0);
    });

    it('should return a negative value when a<b according to modello, articolo, colore, taglia, stagione', function () {
      expect(comparator.barcodeMacts(firstBarcode, secondBarcode)).toBeLessThan(0);
    });

    it('should return a positive value when a>b according to modello, articolo, colore, taglia, stagione', function () {
      expect(comparator.barcodeMacts(secondBarcode, firstBarcode)).toBeGreaterThan(0);
    });
  });

  describe('rigaGiacenze(a, b)', function () {
    var rows = [
        [firstBarcode, 1, '099999', 0, 1],
        [firstBarcode, 1, '199999', 0, 1],
        [firstBarcode, 1, '199999', 0, 2],
        [firstBarcode, 1, '199999', 1, 2],
        [firstBarcode, 2, '199999', 1, 2],
        [secondBarcode, 1, '099999', 0, 1],
        [secondBarcode, 1, '199999', 0, 1],
        [secondBarcode, 1, '199999', 0, 2],
        [secondBarcode, 1, '199999', 1, 2],
        [secondBarcode, 2, '199999', 1, 2]
      ];
    it('should return zero when a==b', function () {
      rows.forEach(function (row) {
        expect(comparator.rigaGiacenze(row, row)).toBe(0);
      });
    });

    it('should return a negative value when a<b according to modello, articolo, colore, taglia, stagione', function () {
      checkAll(rows, comparator.rigaGiacenze, 'toBeLessThan');
    });

    it('should return a positive value when a>b according to modello, articolo, colore, taglia, stagione', function () {
      checkAll(rows, function (a, b) {
        return comparator.rigaGiacenze(b, a);
      }, 'toBeGreaterThan');
    });
  });
});