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

  describe('CAUSALI_MOVIMENTO_MAGAZZINO', function () {
    var causali = codici.CAUSALI_MOVIMENTO_MAGAZZINO;
    it('should be an array', function () {
      expect(Object.prototype.toString.apply(causali)).toBe('[object Array]');
    });

    it('should contain objects with descrizione (unique), segno, gruppo, causaleA', function () {
      var c, i, ii = causali.length, descrizioni = {};
      for (i = 0; i < ii; i += 1) {
        c = causali[i];
        expect(typeof c.descrizione).toBe('string');
        expect(descrizioni.hasOwnProperty(c.descrizione)).toBe(false);
        descrizioni[c.descrizione] = true;
        expect(c.segno === -1 || c.segno === 1).toBe(true);
        expect(c.gruppo).toMatch(/^[A-Z]$/);
        if (c.hasOwnProperty('causaleA')) {
          expect(typeof c.causaleA).toBe('number');
          expect(c.causaleA >= 0 && c.causaleA < ii).toBe(true);
        }
      }
    });
  });

  describe('splitId', function () {
    it('should split id at "_"', function () {
      expect(codici.splitId('abc_12_42')).toEqual(['abc', '12', '42']);
    });
  });

  describe('dotPad', function () {
    it('should pad with dots strings shorter than the given length', function () {
      var u = codici.dotPad;
      expect(u(null, 5)).toBe('.....');
      expect(u('', 5)).toBe('.....');
      expect(u('1', 5)).toBe('1....');
      expect(u('..1', 5)).toBe('..1..');
    });

    it('should left untouched strings longer than pad length', function () {
      expect(codici.dotPad('..1', 2)).toBe('..1');
    });
  });

  describe('setProperty', function () {
    it('should set new property', function () {
      var a = {};
      codici.setProperty(a, 'a', 1);
      expect(a).toEqual({ a: 1 });
    });

    it('should set existing property', function () {
      var a = { a: 3 };
      codici.setProperty(a, 'a', 1);
      expect(a).toEqual({ a: 1 });
    });

    it('should create parent of level 2 property', function () {
      var a = {};
      codici.setProperty(a, 'a', 'b', 1);
      expect(a).toEqual({ a: { b: 1 } });
    });

    it('should create all parents of level 3 property', function () {
      var a = {};
      codici.setProperty(a, 'a', 'b', 'c', 1);
      expect(a).toEqual({ a: { b: { c: 1 } } });
    });

    it('should set new level 3 property with existing parents', function () {
      var a = { a: { b: { d: 4 } } };
      codici.setProperty(a, 'a', 'b', 'c', 1);
      expect(a).toEqual({ a: { b: { c: 1, d: 4 } } });
    });

    it('should set existing level 3 property with existing parents', function () {
      var a = { a: { b: { c: 8, d: 4 } } };
      codici.setProperty(a, 'a', 'b', 'c', 1);
      expect(a).toEqual({ a: { b: { c: 1, d: 4 } } });
    });
  });

  describe('getProperty', function () {
    it('should return undefined for non existent property', function () {
      expect(codici.getProperty({}, 'a')).toBeUndefined();
      expect(codici.getProperty({ b: 1 }, 'a')).toBeUndefined();
    });

    it('should return undefined for non existent level 2 property', function () {
      expect(codici.getProperty({ a: { b: 1 } }, 'c', 'b')).toBeUndefined();
    });

    it('should return value of existing property', function () {
      expect(codici.getProperty({ a: 1 }, 'a')).toBe(1);
    });

    it('should return value of existing level 2 property', function () {
      expect(codici.getProperty({ a: { b: 1 } }, 'a', 'b')).toBe(1);
    });
  });

  describe('findProperties', function () {
    var f = codici.findProperties;

    it('should return empty array with empty obj', function () {
      expect(f({}, /a/)).toEqual([]);
      expect(f({}, /a/, /b/)).toEqual([]);
    });

    it('should return array with found property and path to it', function () {
      expect(f({ a: 1 }, /^a$/)).toEqual([['a', 1]]);
      expect(f({ a: { b: 1 } }, /^\w$/, /b/)).toEqual([['a', 'b', 1]]);
      expect(f({ a: { b: 1 }, c: { b: 'x' }, d: { e: 3 } }, /^\w$/, /b/)).toEqual([['a', 'b', 1], ['c', 'b', 'x']]);
    });
  });

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

  describe('isInt', function () {
    var u = codici.isInt;
    it('should return true for integer values', function () {
      expect(u(123)).toBe(true);
      expect(u(-42)).toBe(true);
    });

    it('should return false for float value', function () {
      expect(u(1.2)).toBe(false);
    });

    it('should return false for string value', function () {
      expect(u("123")).toBe(false);
    });
  });

  describe('isQta', function () {
    var u = codici.isQta;
    it('should return true for integer non negative value', function () {
      expect(u(123)).toBe(true);
    });

    it('should return false for integer negative value', function () {
      expect(u(-1)).toBe(false);
    });

    it('should return false for float value', function () {
      expect(u(1.1)).toBe(false);
    });
  });

  describe('isScalarino', function () {
    var u = codici.isScalarino;
    it('should return true for positive integer less than 10', function () {
      var i;
      for (i = 1; i < 10; i += 1) {
        expect(u(i)).toBe(true);
      }
    });

    it('should return false for 0', function () {
      expect(u(0)).toBe(false);
    });

    it('should return false for 10', function () {
      expect(u(10)).toBe(false);
    });
  });

  describe('isTrimmedString', function () {
    var u = codici.isTrimmedString;
    it('should return true only for trimmed string of 1 to maxLength characters', function () {
      expect(u('10', 3)).toBe(true);
      expect(u('10 ', 3)).toBe(false);
      expect(u('', 3)).toBe(false);
      expect(u('LXL', 3)).toBe(true);
    });
  });

  describe('isDescrizioneTaglia', function () {
    var u = codici.isDescrizioneTaglia;
    it('should return true only for trimmed string of 1 to 3 characters', function () {
      expect(u('10')).toBe(true);
      expect(u('10 ')).toBe(false);
      expect(u('')).toBe(false);
      expect(u('LXL')).toBe(true);
    });
  });

  describe('isDescrizioneArticolo', function () {
    var u = codici.isDescrizioneArticolo;
    // TODO check that 30 is a sensible value
    it('should return true only for trimmed string of one to 1 to 30 characters', function () {
      expect(u('Articolo')).toBe(true);
      expect(u('')).toBe(false);
      expect(u('4234242424 34242423 42342 4242 42 34 234 23 42 34 2 42 342 342')).toBe(false);
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

  describe('isAzienda', function () {
    it('should return true only when ids is valid splitted _id of Azienda', function () {
      var u = codici.isAzienda, s = codici.splitId;
      expect(u(s('Azienda_010101'))).toBe(true);
      expect(u(s('Azienda_A10101'))).toBe(false);
    });
  });

  describe('isMovimentoMagazzino', function () {
    it('should return true only when ids is valid splitted _id of MovimentoMagazzino', function () {
      var u = codici.isMovimentoMagazzino,
        s = codici.splitId;
      expect(u(s('MovimentoMagazzino_010101_2011_A_12345'))).toBe(true);
      expect(u(s('MovimentoMagazzino_010101_2011_a_12345'))).toBe(false);
      expect(u(s('MovimentoMagazzino_010101_2011_12345'))).toBe(false);
    });
  });

  describe('idMovimentoMagazzino', function () {
    var u = codici.idMovimentoMagazzino;
    it('should require in order: codiceAzienda, year, gruppoNumerazione, numero', function () {
      expect(u('010101', '2011', 'A', '22')).toBe('MovimentoMagazzino_010101_2011_A_22');
      expect(u('010101', '2011', '22')).toBeUndefined();
    });
  });

  describe('parseIdMovimentoMagazzino', function () {
    var u = codici.parseIdMovimentoMagazzino;
    it('should return origine, anno, gruppo, and numero', function () {
      expect(u('MovimentoMagazzino_019998_2011_A_22')).toEqual({
        da: '019998',
        anno: '2011',
        gruppo: 'A',
        numero: 22
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

  describe('isGruppoNumerazione', function () {
    var u = codici.isGruppoNumerazione;

    it('should return true for a single uppercase letter', function () {
      expect(u('A')).toBe(true);
    });

    it('should return false for a number', function () {
      expect(u('1')).toBe(false);
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

  describe('descrizioneModello', function () {
    var u = codici.descrizioneModello,
      listaModelli = { '10212345': ['DESCRIZIONE', 3] };
    it('should return descrizione for given (stagione, modello)', function () {
      expect(u('102', '12345', listaModelli)).toBe('DESCRIZIONE');
    });
  });
});