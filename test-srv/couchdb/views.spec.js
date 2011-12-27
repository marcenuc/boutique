/*jslint node: true */
/*jshint node: true */
/*global describe: false, beforeEach: false, afterEach: false, it: false, xit: false, expect: false, jasmine: false */

var requirejs = require('requirejs');
requirejs.config({
  baseUrl: __dirname + '/../..',
  nodeRequire: require,
  // CouchDB requires that modules used in map functions resides in 'views/lib'.
  paths: {
    'views/lib/codici': 'app/js/codici'
  }
});

requirejs(['views'], function (views) {
  'use strict';
  var idMM = 'MovimentoMagazzino_010101_2011_A_1234';

  beforeEach(function () {
    views._resetRows();
  });

  describe('aziende map', function () {
    var map = views.aziende;

    it('should emit (codiceAzienda, codiceAzienda + " " + nome)', function () {
      var a = { _id: 'Azienda_010101', nome: 'Azienda1' };
      map(a);
      expect(views._rows()).toEqual([['010101', '010101 Azienda1']]);
    });
  });

  describe('movimentoMagazzinoAccodato map', function () {
    var map = views.movimentoMagazzinoAccodato;

    describe('MovimentoMagazzino', function () {
      it('should emit split id only if accodato', function () {
        var mm = { _id: idMM };
        map(mm);
        expect(views._rows()).toEqual([]);
        mm.accodato = 1;
        map(mm);
        expect(views._rows()).toEqual([[['010101', 2011, 'A', 1234], 1]]);
      });

      it('should emit one row for a only if defined', function () {
        var mm = { _id: idMM, a: '020202', causaleA: ['ACQUISTO', 1], accodato: 1 };
        map(mm);
        expect(views._rows()).toEqual([
          [['010101', 2011, 'A', 1234], 1],
          [['020202', '010101', 2011, 'A', 1234], 1]
        ]);
      });
    });
  });

  describe('movimentoMagazzinoPendente', function () {
    var map = views.movimentoMagazzinoPendente;

    describe('MovimentoMagazzino', function () {
      it('should emit split id only if not accodato', function () {
        var mm = { _id: idMM, data: '20111230', causale: ['VENDITA A CLIENTI', -1], accodato: 1 };
        map(mm);
        expect(views._rows()).toEqual([]);
        delete mm.accodato;
        map(mm);
        expect(views._rows()).toEqual([[['010101', '20111230', 'VENDITA A CLIENTI', 'A', 1234], 1]]);
      });
    });
  });

  describe('contatori map', function () {
    var map = views.contatori;

    it('should emit [codiceAzienda, anno, gruppo, numero] for MovimentoMagazzino', function () {
      var mm = { _id: idMM };
      map(mm);
      expect(views._rows()).toEqual([
        [['010101', 2011, 'A', 1234], 1]
      ]);
    });
  });

  describe('riferimentiMovimentiMagazzino map', function () {
    var map = views.riferimentiMovimentiMagazzino;

    it('should emit riferimento of MovimentoMagazzino', function () {
      var mm = { _id: idMM, riferimento: 'BollaAs400_2011_1234'};
      map(mm);
      expect(views._rows()).toEqual([['BollaAs400_2011_1234', undefined]]);
    });
  });

  describe('giacenze', function () {
    describe('map', function () {
      var map = views.giacenze.map;

      it('should emit ([macsAzStTm, scalarino, taglia, descrizioneTaglia, descrizione], qta) for MovimentoMagazzino accodato', function () {
        var mm = {
          _id: idMM,
          columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
          causale: ['VENDITA A CLIENTI', -1],
          accodato: 1,
          rows: [
            ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
            ['105982901344800002', 6, '11', 'CALZE', 100, 1]
          ]
        };
        map(mm);
        expect(views._rows()).toEqual([
          [['40912', '4053', '1000', '922', '010101', 0, 3, 1, '41', '41', 'CAMICIA COLLO MODA'], -2],
          [['98290', '1344', '8000', '105', '010101', 0, 3, 6, '02', '11', 'CALZE'], -1]
        ]);
      });

      it('should use inProduzione if present', function () {
        var mm = {
          _id: idMM,
          columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
          tipoMagazzino: 1,
          inProduzione: 1,
          causale: ['RETTIFICA INVENTARIO +', 1],
          accodato: 1,
          rows: [
            ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
            ['105982901344800002', 6, '11', 'CALZE', 100, 1]
          ]
        };
        map(mm);
        expect(views._rows()).toEqual([
          [['40912', '4053', '1000', '922', '010101', 1, 1, 1, '41', '41', 'CAMICIA COLLO MODA'], 2],
          [['98290', '1344', '8000', '105', '010101', 1, 1, 6, '02', '11', 'CALZE'], 1]
        ]);
      });

      it('should emit rows for causaleA if present', function () {
        var mm = {
          _id: idMM,
          columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
          causale: ['SCARICO PER CAMBIO MAGAZZINO', -1],
          causaleA: ['CARICO PER CAMBIO MAGAZZINO', 1],
          a: '020202',
          accodato: 1,
          rows: [
            ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
            ['105982901344800002', 6, '11', 'CALZE', 100, 1]
          ]
        };
        map(mm);
        expect(views._rows()).toEqual([
          [['40912', '4053', '1000', '922', '010101', 0, 3, 1, '41', '41', 'CAMICIA COLLO MODA'], -2],
          [['40912', '4053', '1000', '922', '020202', 0, 3, 1, '41', '41', 'CAMICIA COLLO MODA'], 2],
          [['98290', '1344', '8000', '105', '010101', 0, 3, 6, '02', '11', 'CALZE'], -1],
          [['98290', '1344', '8000', '105', '020202', 0, 3, 6, '02', '11', 'CALZE'], 1]
        ]);
      });

      it('should use tipoMagazzino and tipoMagazzinoA if present', function () {
        var mm = {
          _id: idMM,
          columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
          tipoMagazzino: 1,
          tipoMagazzinoA: 2,
          causale: ['SCARICO PER CAMBIO MAGAZZINO', -1],
          causaleA: ['CARICO PER CAMBIO MAGAZZINO', 1],
          a: '020202',
          accodato: 1,
          rows: [
            ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
            ['105982901344800002', 6, '11', 'CALZE', 100, 1]
          ]
        };
        map(mm);
        expect(views._rows()).toEqual([
          [['40912', '4053', '1000', '922', '010101', 0, 1, 1, '41', '41', 'CAMICIA COLLO MODA'], -2],
          [['40912', '4053', '1000', '922', '020202', 0, 2, 1, '41', '41', 'CAMICIA COLLO MODA'], 2],
          [['98290', '1344', '8000', '105', '010101', 0, 1, 6, '02', '11', 'CALZE'], -1],
          [['98290', '1344', '8000', '105', '020202', 0, 2, 6, '02', '11', 'CALZE'], 1]
        ]);
      });
    });
    describe('reduce', function () {
      var reduce = views.giacenze.reduce;

      it('should sum values', function () {
        expect(reduce).toBe('_sum');
      });
    });
  });
});
