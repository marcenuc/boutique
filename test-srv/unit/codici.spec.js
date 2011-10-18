/*jslint node: true */
/*jshint node: true */
/*global describe: false, beforeEach: false, afterEach: false, it: false, xit: false, expect: false, jasmine: false */

var requirejs = require('requirejs');
requirejs.config({
  baseUrl: __dirname + '/../..',
  nodeRequire: require
});

requirejs(['app/js/codici'], function (codici) {
  'use strict';

  describe('parseMoney', function () {
    it('should add cents to integer values', function () {
      expect(codici.parseMoney('12')).toEqual([null, 1200]);
    });

    it('should add cents to float values with one digit after dot', function () {
      expect(codici.parseMoney('12.3')).toEqual([null, 1230]);
    });

    it('should convert to cents integer value', function () {
      expect(codici.parseMoney('12.34')).toEqual([null, 1234]);
    });

    it('should return error for more than two digits after dot', function () {
      expect(codici.parseMoney('12.345')).toEqual(['Invalid amount for money: 12.345']);
    });
  });

  describe('parseQta', function () {
    it('should ignore starting and trailing spaces', function () {
      expect(codici.parseQta(' 12  ')).toEqual([null, 12]);
    });
  });

  describe('parseIdMovimentoMagazzino', function () {
    it('should return origine, anno, and numero', function () {
      expect(codici.parseIdMovimentoMagazzino('MovimentoMagazzino_019998_2011_22')).toEqual({
        origine: '019998',
        anno: '2011',
        numero: '22'
      });
    });
  });

  describe('colNamesToColIndexes', function () {
    it('should return an hash with values equal to index of the column in the given array', function () {
      var u = codici.colNamesToColIndexes;
      expect(u(['a', 'b', 'c'])).toEqual({ a: 0, b: 1, c: 2 });
    });
  });
});