/*jslint node: true */
/*jshint node: true */
/*global describe: false, beforeEach: false, afterEach: false, it: false, xit: false, expect: false, jasmine: false */

var requirejs = require('requirejs');
requirejs.config({
  baseUrl: __dirname + '/../..',
  nodeRequire: require
});

requirejs(['underscore', 'lib/as400'], function (_, as400) {
  'use strict';

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
      aziendaAs400 = {
        columnNames: ['nome', 'indirizzo', 'comune', 'provincia', 'cap', 'note', 'nazione', 'telefono', 'fax'],
        rows: [['Negozio LE', 'via Roma, 3', 'Lecce', 'LE', '73010', 'new', 'IT', '0832575859', '0832123456']]
      };

    describe('buildCausaliAs400', function () {
      it('should use causaliDisponibile and causaliCliente', function () {
        expect(as400.buildCausaliAs400({ MC: causaliCliente, MD: causaliDisponibile })).toEqual([
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
        expect(as400.buildModelliEScalariniAs400([modelliEScalarini])).toEqual([
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