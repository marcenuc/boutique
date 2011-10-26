/*jslint node: true */
/*jshint node: true */
/*global describe: false, beforeEach: false, afterEach: false, it: false, xit: false, expect: false, jasmine: false */

var requirejs = require('requirejs');
requirejs.config({
  baseUrl: __dirname + '/../..',
  nodeRequire: require
});

requirejs(['underscore', 'lib/as400', 'app/js/codici'], function (_, as400, codici) {
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

    describe('updateGiacenzeWithInventarioAndMovimentiMagazzino', function () {
      var inProduzione = 0, codiceAzienda = '099999', tipoMagazzino = codici.TIPO_MAGAZZINO_NEGOZIO,
        idInventario = codici.idInventario(codiceAzienda, tipoMagazzino),
        idMm1 = codici.idMovimentoMagazzino(codiceAzienda, 2011, 1),
        idMm2 = codici.idMovimentoMagazzino(codiceAzienda, 2011, 2),
        warns = null, giacenze = null, inventario = null, movimenti = null;

      beforeEach(function () {
        warns = [];
        giacenze = {};
        inventario = {
          _id: idInventario,
          columnNames: ['barcode', 'giacenza', 'costo'],
          rows: []
        };
        movimenti = { rows: [] };
      });

      function doUpdateGiacenze() {
        as400.updateGiacenzeWithInventarioAndMovimentiMagazzino(warns, giacenze, inventario, movimenti);
      }

      describe('empty giacenze', function () {
        it('should append inventario to giacenze', function () {
          inventario.rows = [['123123451234123401', 12]];
          doUpdateGiacenze();
          expect(giacenze).toHaveSortedRows([['123', '12345', '1234', '1234', codiceAzienda, inProduzione, tipoMagazzino, { '01': 12 }]]);
        });

        it('should update inventario with movimenti magazzino +', function () {
          inventario.rows = [['123123451234123401', 12]];
          movimenti.rows = [{ doc: { _id: idMm1, causale: ['c', 1, 0], rows: [['123123451234123401', 3]] } }];
          doUpdateGiacenze();
          expect(giacenze).toHaveSortedRows([['123', '12345', '1234', '1234', codiceAzienda, inProduzione, tipoMagazzino, { '01': 15 }]]);
        });

        it('should update inventario with movimenti magazzino -', function () {
          inventario.rows = [['123123451234123401', 12]];
          movimenti.rows = [{ doc: { _id: idMm1, causale: ['c', -1, 0], rows: [['123123451234123401', 3]] } }];
          doUpdateGiacenze();
          expect(giacenze).toHaveSortedRows([['123', '12345', '1234', '1234', codiceAzienda, inProduzione, tipoMagazzino, { '01': 9 }]]);
        });

        it('should remove from inventario when movimenti magazzino - greater than inventario and issue warning', function () {
          inventario.rows = [['123123451234123401', 2]];
          movimenti.rows = [{ doc: { _id: idMm1, causale: ['c', -1, 0], rows: [['123123451234123401', 3]] } }];
          doUpdateGiacenze();
          expect(giacenze).toHaveSortedRows([]);
          expect(warns).toEqual(['Giacenza negativa (-1) per "123123451234123401" di "' + codiceAzienda + '"']);
        });

        it('should remove from inventario when movimenti magazzino - equal to inventario', function () {
          inventario.rows = [['123123451234123401', 2], ['123123451234123402', 2]];
          movimenti.rows = [{ doc: { _id: idMm1, causale: ['c', -1, 0], rows: [['123123451234123402', 2]] } }];
          doUpdateGiacenze();
          expect(giacenze).toHaveSortedRows([['123', '12345', '1234', '1234', codiceAzienda, inProduzione, tipoMagazzino, { '01': 2 }]]);
          expect(warns).toEqual([]);
        });

        it('should ignore movimenti that results to 0', function () {
          movimenti.rows = [
            { doc: { _id: idMm1, causale: ['c', 1, 0], rows: [['123123451234123401', 4]] } },
            { doc: { _id: idMm2, causale: ['c', -1, 0], rows: [['123123451234123401', 4]] } }
          ];
          doUpdateGiacenze();
          expect(giacenze).toHaveSortedRows([]);
          expect(warns).toEqual([]);
        });

        it('should append movimenti magazzino to giacenze', function () {
          movimenti.rows = [{ doc: { _id: idMm1, causale: ['c', 1, 0], rows: [['123123451234123401', 4]] } }];
          doUpdateGiacenze();
          expect(giacenze).toHaveSortedRows([['123', '12345', '1234', '1234', codiceAzienda, inProduzione, tipoMagazzino, { '01': 4 }]]);
        });

        it('should warn on negative values', function () {
          movimenti.rows = [{ doc: { _id: idMm1, causale: ['c', 1, 0], rows: [['123123451234123401', -4]] } }];
          doUpdateGiacenze();
          expect(giacenze).toHaveSortedRows([]);
          expect(warns).toEqual(['Giacenza negativa (-4) per "123123451234123401" di "' + codiceAzienda + '"']);
        });

        describe('when an article has multiple entries in inventario', function () {
          it('should merge data when different costo', function () {
            inventario.rows = [['123123451234123401', 2, 100], ['123123451234123401', 3, 200]];
            movimenti.rows = [{ doc: { _id: idMm1, causale: ['c', 1, 0], rows: [['123123451234123401', 4]] } }];
            doUpdateGiacenze();
            expect(giacenze).toHaveSortedRows([['123', '12345', '1234', '1234', codiceAzienda, inProduzione, tipoMagazzino, { '01': 9 }]]);
          });

          it('should merge data when different taglia', function () {
            inventario.rows = [['123123451234123401', 2, 100], ['123123451234123402', 3, 200]];
            movimenti.rows = [{ doc: { _id: idMm1, causale: ['c', 1, 0], rows: [['123123451234123401', 4], ['123123451234123403', 5]] } }];
            doUpdateGiacenze();
            expect(giacenze).toHaveSortedRows([['123', '12345', '1234', '1234', codiceAzienda, inProduzione, tipoMagazzino, { '01': 6, '02': 3, '03': 5 }]]);
          });
        });
      });

      describe('NOT empty giacenze', function () {
        function setGiacenza(r) {
          var macsAzStTm = [r[1], r[2], r[3], r[0], r[4], r[5], r[6]].join('');
          giacenze[macsAzStTm] = r;
        }

        it('should append inventario to giacenze', function () {
          var otherAzienda = '010101';
          setGiacenza(['123', '12345', '1234', '1234', otherAzienda, inProduzione, tipoMagazzino, { '01': 12 }]);
          inventario.rows = [['123123451234123401', 12]];
          doUpdateGiacenze();
          expect(giacenze).toHaveSortedRows([
            ['123', '12345', '1234', '1234', otherAzienda, inProduzione, tipoMagazzino, { '01': 12 }],
            ['123', '12345', '1234', '1234', codiceAzienda, inProduzione, tipoMagazzino, { '01': 12 }]
          ]);
        });

        it('should update giacenze with inventario', function () {
          setGiacenza(['123', '12345', '1234', '1234', codiceAzienda, inProduzione, tipoMagazzino, { '01': 12 }]);
          inventario.rows = [['123123451234123401', 12]];
          doUpdateGiacenze();
          expect(giacenze).toHaveSortedRows([
            ['123', '12345', '1234', '1234', codiceAzienda, inProduzione, tipoMagazzino, { '01': 24 }]
          ]);
        });

        it('should update giacenze with movimenti magazzino', function () {
          setGiacenza(['123', '12345', '1234', '1234', codiceAzienda, inProduzione, tipoMagazzino, { '01': 12 }]);
          movimenti.rows = [{ doc: { _id: idMm1, causale: ['c', 1, 0], rows: [['123123451234123401', 3]] } }];
          doUpdateGiacenze();
          expect(giacenze).toHaveSortedRows([
            ['123', '12345', '1234', '1234', codiceAzienda, inProduzione, tipoMagazzino, { '01': 15 }]
          ]);
        });

        describe('when an article has multiple entries in inventario', function () {
          it('should merge data when different costo', function () {
            setGiacenza(['123', '12345', '1234', '1234', codiceAzienda, inProduzione, tipoMagazzino, { '01': 12 }]);
            inventario.rows = [['123123451234123401', 2, 100], ['123123451234123401', 3, 200]];
            movimenti.rows = [{ doc: { _id: idMm1, causale: ['c', 1, 0], rows: [['123123451234123401', 4]] } }];
            doUpdateGiacenze();
            expect(giacenze).toHaveSortedRows([
              ['123', '12345', '1234', '1234', codiceAzienda, inProduzione, tipoMagazzino, { '01': 21 }]
            ]);
          });

          it('should merge data when different taglia', function () {
            setGiacenza(['123', '12345', '1234', '1234', codiceAzienda, inProduzione, tipoMagazzino, { '01': 12 }]);
            inventario.rows = [['123123451234123401', 2, 100], ['123123451234123402', 3, 200]];
            movimenti.rows = [{ doc: { _id: idMm1, causale: ['c', 1, 0], rows: [['123123451234123401', 4], ['123123451234123403', 5]] } }];
            doUpdateGiacenze();
            expect(giacenze).toHaveSortedRows([
              ['123', '12345', '1234', '1234', codiceAzienda, inProduzione, tipoMagazzino, { '01': 18, '02': 3, '03': 5 }]
            ]);
          });
        });
      });

      describe('destinazione with causale[2] === 0', function () {
        it('should NOT update giacenza destinazione', function () {
          movimenti.rows = [{ doc: { _id: idMm1, causale: ['c', 1, 0], destinazione: '010101', rows: [['123123451234123401', 4]] } }];
          doUpdateGiacenze();
          expect(giacenze).toHaveSortedRows([
            ['123', '12345', '1234', '1234', codiceAzienda, inProduzione, tipoMagazzino, { '01': 4 }]
          ]);
        });
      });

      describe('destinazione with causale[2] !== 0', function () {
        it('should update giacenza destinazione', function () {
          var codiceDestinazione = '010101';
          inventario._id = codici.idInventario(codiceDestinazione, tipoMagazzino);
          movimenti.rows = [{ doc: { _id: idMm1, causale: ['c', -1, 1], destinazione: codiceDestinazione, rows: [['123123451234123401', 4]] } }];
          doUpdateGiacenze();
          expect(giacenze).toHaveSortedRows([
            ['123', '12345', '1234', '1234', codiceDestinazione, inProduzione, tipoMagazzino, { '01': 4 }]
          ]);
        });
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