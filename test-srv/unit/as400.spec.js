/*jslint node: true */
/*jshint node: true */
/*global describe: false, beforeEach: false, afterEach: false, it: false, xit: false, expect: false */

describe('As400', function () {
  'use strict';

  var as400 = require('../../lib/as400');

  describe('buildCausaliAs400', function () {
    it('should use causaliDisponibile and causaliCliente', function () {
      var causaliDisponibile = { columnNames: ['key', 'values'], rows: [['MD01', 'CARICO DA PROD. A0050A'], ['MD02', 'RESO A PRODUZ.  K0050A']] },
        causaliCliente = { columnNames: ['key', 'values'], rows: [['MC?', '00'], ['MC01', 'CARICO DA PROD. A  50A'], ['MC02', 'RESO A PRODUZ.  K  50']] };
      expect(as400.buildCausaliAs400(causaliCliente, causaliDisponibile)).toEqual([
        [], {
          _id : 'CausaliAs400',
          '1': { '01': ['CARICO DA PROD.', -1], '02': ['RESO A PRODUZ.', 1] },
          '2': { '01': ['CARICO DA PROD.', -1], '02': ['RESO A PRODUZ.', 1] }
        }
      ]);
    });
  });

  describe('buildModelliEScalariniAs400', function () {
    it('should use modelliEScalarini', function () {
      var modelliEScalarini = {
        columnNames: ['stagione', 'modello', 'descrizione', 'scalarino'],
        rows: [
          ['102', '12345', 'ABC', '1'],
          ['10', '12345', 'ABC', '1'],
          ['102', '1234', 'ABC', '1'],
          ['102', '12345', '', '1'],
          ['102', '12345', 'ABC', '']
        ]
      };
      expect(as400.buildModelliEScalariniAs400(modelliEScalarini)).toEqual([
        [
          'Stagione non valida: stagione="10"',
          'Modello non valido: stagione="102", modello="1234"',
          'Manca descrizione: stagione="102", modello="12345", descrizione=""',
          'Manca scalarino: stagione="102", modello="12345", descrizione="ABC", scalarino=""'
        ], {
          _id: 'ModelliEScalarini',
          lista: {
            '10212345': ['ABC', 1]
          }
        }
      ]);
    });
  });
});