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

  describe('isYyyyMmDdDate', function () {
    it('should return true for "20110704"', function () {
      expect(codici.isYyyyMmDdDate('20110704')).toBe(true);
    });
  });

  describe('isNumero', function () {
    it('should return true for "40241"', function () {
      expect(codici.isNumero('40241')).toBe(true);
    });

    it('should return true for 40241', function () {
      expect(codici.isNumero(40241)).toBe(true);
    });
  });

  describe('isCode', function () {
    it('should return true for code "10", length 2', function () {
      expect(codici.isCode('10', 2)).toBe(true);
    });
  });

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

  describe('parseIdInventario', function () {
    it('should return codiceAzienda, tipoMagazzino', function () {
      var codiceAzienda = '099999', tipoMagazzino = 3;
      expect(codici.parseIdInventario(codici.idInventario(codiceAzienda, tipoMagazzino))).toEqual({
        codiceAzienda: codiceAzienda,
        tipoMagazzino: tipoMagazzino
      });
    });
  });

  describe('colNamesToColIndexes', function () {
    it('should return an hash with values equal to index of the column in the given array', function () {
      var u = codici.colNamesToColIndexes;
      expect(u(['a', 'b', 'c'])).toEqual({ a: 0, b: 1, c: 2 });
    });
  });

  describe('typeAndCodeFromId', function () {
    it('should return "010101" for id "Azienda_010101', function () {
      var tac = codici.typeAndCodeFromId('Azienda_010101');
      expect(tac[1]).toBe('Azienda');
      expect(tac[2]).toBe('010101');
    });

    it('should return "010101_10" for id "cliente_010101_10', function () {
      var tac = codici.typeAndCodeFromId('Cliente_010101_10');
      expect(tac[1]).toBe('Cliente');
      expect(tac[2]).toBe('010101_10');
    });

    it('should return undefined, null, or "", for undefined, null, or blank id', function () {
      expect(codici.typeAndCodeFromId()).toBeUndefined();
      expect(codici.typeAndCodeFromId(null)).toBe(null);
      expect(codici.typeAndCodeFromId('')).toBe('');
    });
  });


  describe('idAzienda', function () {
    it('should return "Azienda_010101" for codice "010101"', function () {
      expect(codici.idAzienda('010101')).toBe('Azienda_010101');
    });

    it('should return undefined for undefined, null, or blank codice', function () {
      expect(codici.idAzienda()).toBeUndefined();
      expect(codici.idAzienda(null)).toBeUndefined();
      expect(codici.idAzienda('')).toBeUndefined();
    });
  });

  describe('idBollaAs400', function () {
    it('should return "BollaAs400_20110704_40241_Y_10" for data "20110704", numero "40241", enteNumerazione "Y", codiceNumerazione "10"', function () {
      expect(codici.idBollaAs400('20110704', 40241, 'Y', '10')).toBe('BollaAs400_20110704_40241_Y_10');
    });
  });

  describe('parseIdBollaAs400', function () {
    it('should parse "BollaAs400_20110704_40241_Y_10" as data "20110704", numero "40241", enteNumerazione "Y", codiceNumerazione "10"', function () {
      expect(codici.parseIdBollaAs400('BollaAs400_20110704_40241_Y_10')).toEqual({ data: '20110704', numero: '40241', enteNumerazione: 'Y', codiceNumerazione: '10' });
    });
  });
});