/*global describe:false, xdescribe:false, beforeEach:false, it:false, expect:false, jasmine:false, require:false, process:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['underscore', 'lib/as400'], function (_, as400) {
  'use strict';

  beforeEach(function () {
    this.addMatchers({
      toHaveSortedRows: function (expected) {
        var obj = this.actual,
          sortedRows = Object.keys(obj).sort().map(function (k) {
            return obj[k];
          });
        return _.isEqual(sortedRows, expected);
      }
    });
  });

  describe('As400', function () {
    var causaliDisponibile = {
        columnNames: ['key', 'values'],
        rows: [['MD01', 'CARICO DA PROD. A0050A'], ['MD02', 'RESO A PRODUZ.  K0050A']]
      },
      causaliCliente = {
        columnNames: ['key', 'values'],
        rows: [['MC?', '00'], ['MC01', 'CARICO DA PROD. A  50A'], ['MC02', 'RESO A PRODUZ.  K  50']]
      },
      modelliEScalarini = {
        columnNames: ['stagione', 'modello', 'descrizione', 'scalarino'],
        rows: [
          ['102', '12345', 'ABC', '1'],
          ['10', '12345', 'ABC', '1'],
          ['102', '1234', 'ABC', '1'],
          ['102', '12345', '', '1'],
          ['102', '12345', 'ABC', '']
        ]
      },
      analis01 = {
        columnNames: ['stagione', 'modello', 'articolo', 'costo'],
        rows: [
          ['102', '60456', '5000', '123.33'],
          ['102', '60457', '5000', '124.44'],
          ['102', '60457', '8000', '125.55'],
          ['112', '60456', '5000', '126.66'],
          ['112', '60457', '5000', '127.77'],
          ['112', '60457', '8000', '128.88'],
          ['122', '60457', '8000', '129.99'],
          ['102', '12345', '1234', '123.02'],
          ['', '12345', '1234', '123.02'],
          ['102', '', '1234', '123.02'],
          ['102', '12345', '', '123.02'],
          ['102', '12345', '1234', '0']
        ]
      },
      aziendaAs400 = {
        columnNames: ['nome', 'indirizzo', 'comune', 'provincia', 'cap', 'note', 'nazione', 'telefono', 'fax'],
        rows: [['Negozio LE', 'via Roma, 3', 'Lecce', 'LE', '73010', 'new', 'IT', '0832575859', '0832123456']]
      };

    describe('buildCausaliAs400', function () {
      it('should use causaliDisponibile and causaliCliente', function () {
        expect(as400.buildCausaliAs400({ MC: causaliCliente, MD: causaliDisponibile })).toEqual([
          [], {
            _id : 'CausaliAs400',
            '1': { '01': ['CARICO DA PROD.', 1], '02': ['RESO A PRODUZ.', -1] },
            '2': { '01': ['CARICO DA PROD.', 1], '02': ['RESO A PRODUZ.', -1] }
          }
        ]);
      });
    });

    describe('buildModelliEScalariniAs400', function () {
      it('should use modelliEScalarini', function () {
        expect(as400.buildModelliEScalariniAs400([modelliEScalarini])).toEqual([
          [
            'Stagione non valida: "10"',
            'Modello non valido: "102" "1234"',
            'Manca descrizione articolo: "102" "12345"',
            'Manca scalarino: "102" "12345" "ABC"'
          ], {
            _id: 'ModelliEScalarini',
            lista: {
              '10212345': ['ABC', 1]
            }
          }
        ]);
      });
    });

    describe('buildCostoArticoli', function () {
      it('should use analis01 and listino1', function () {
        var costi = {
          '102': { '60456': { '5000': 0 }, '60457': { '5000': 0 } },
          '112': { '60456': { '5000': 0 }, '60457': { '5000': 0 } }
        };
        var listini = { '1': { columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'], prezzi: {
          '122': { '60457': { '7000': [1234, 2145, 2000, '*'] } }
        }}};
        expect(as400.buildCostoArticoli(11, costi, [analis01], listini)).toEqual([
          [
            'Riga non valida: "" "12345" "1234" "123.02"',
            'Riga non valida: "102" "" "1234" "123.02"',
            'Riga non valida: "102" "12345" "" "123.02"',
            'Riga non valida: "102" "12345" "1234" "0"'
          ], [
            // it should purge old years
            // it should save only in-stock items for old years
            {
              _id: 'CostoArticoli_102',
              costi: { '60456': { '5000': 12333 }, '60457': { '5000': 12444 } }
            },
            // it should save all items for current years
            {
              _id: 'CostoArticoli_112',
              costi: { '60456': { '5000': 12666 }, '60457': { '5000': 12777, '8000': 12888 } }
            },
            {
              _id: 'CostoArticoli_122',
              costi: { '60457': { '8000': 12999 } }
            }
          ]
        ]);
      });
    });

    describe('buildAziendaAs400', function () {
      it('should use data from existing azienda', function () {
        var azienda = { _id: 'Azienda_123456', nome: 'azienda1', indirizzo: 'via Silva, 2', comune: 'Scandiano', provincia: 'RE',
          cap: '42019', note: 'some notes', nazione: 'CH', versioneListino: '1', tipo: 'MAGAZZINO', codiceMagazzino: 'K' };
        expect(as400.buildAziendaAs400(azienda, aziendaAs400)).toEqual([[], {
          _id: 'Azienda_123456',
          versioneListino: '1',
          tipo: 'MAGAZZINO',
          codiceMagazzino: 'K',
          nome: 'Negozio LE',
          indirizzo: 'via Roma, 3',
          comune: 'Lecce',
          provincia: 'LE',
          cap: '73010',
          note: 'new',
          nazione: 'IT',
          contatti: [
            { tipo: 'Telefono', valore: '0832575859' },
            { tipo: 'Fax', valore: '0832123456' }
          ]
        }]);
      });
    });

    describe('fetchFromAs400', function () {
      function as400Querier(params, callback) {
        if (_.isEqual(['modelli'], params)) {
          return callback(null, JSON.stringify(modelliEScalarini));
        }
      }

      it('should accept single query parameters', function () {
        var docBuilder = jasmine.createSpy(),
          callback = jasmine.createSpy(),
          warnsAndDoc = [['a waring'], { _id: 'fakedoc' }];
        docBuilder.andReturn(warnsAndDoc);
        as400.fetchFromAs400(as400Querier, ['modelli'], docBuilder, callback);
        expect(docBuilder.callCount).toBe(1);
        expect(docBuilder).toHaveBeenCalledWith({ 0: modelliEScalarini });
        expect(callback.callCount).toBe(1);
        expect(callback).toHaveBeenCalledWith(null, warnsAndDoc);
      });
    });
  });
});
