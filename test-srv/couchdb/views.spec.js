/*global describe:false, beforeEach:false, it:false, expect:false, jasmine:false, require:false, process:false*/
process.env.LANG = 'C';
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['views', 'views/lib/codici'], function (views, codici) {
  'use strict';
  var idMM = 'MovimentoMagazzino_010101_2011_A_1234';

  beforeEach(function () {
    views._resetRows();
  });

  describe('aziende map', function () {
    var map = views.aziende;
    describe('Azienda', function () {
      it('should emit (codiceAzienda, codiceAzienda + " " + nome) if hasn\'t external warehouse', function () {
        var a = { _id: 'Azienda_010101', nome: 'Azienda1', tipo: 'NEGOZIO' };
        expect(codici.hasExternalWarehouse(a)).toBe(false);
        map(a);
        expect(views._rows()).toEqual([['010101', '010101 Azienda1']]);
      });
      it('should emit (codiceAzienda, codiceAzienda + "_" + nome) if has external warehouse', function () {
        var a = { _id: 'Azienda_010101', nome: 'Azienda1', tipo: 'MAGAZZINO' };
        expect(codici.hasExternalWarehouse(a)).toBe(true);
        map(a);
        expect(views._rows()).toEqual([['010101', '010101_Azienda1']]);
      });
    });
  });

  describe('costo map', function () {
    var map = views.costo;
    describe('CostoArticoli_125', function () {
      it('should emit (sma, costo) for each articolo in articoli', function () {
        var a = { _id: 'CostoArticoli_125', "costi": {
          "98021": { "1881": 12345 },
          "40021": { "2109": 3421 }
        } };
        map(a);
        expect(views._rows()).toEqual([
          ['125400212109', 3421],
          ['125980211881', 12345]
        ]);
      });
    });
  });

  describe('listini map', function () {
    var map = views.listini;
    describe('Listino', function () {
      it('should emit (versione, null)', function () {
        map({ _id: 'Listino_1' });
        map({ _id: 'Listino_010101', versioneBase: '1' });
        expect(views._rows()).toEqual([['1', null], ['010101', null]]);
      });
    });
  });

  describe('movimentoMagazzinoAccodato map', function () {
    var map = views.movimentoMagazzinoAccodato;

    describe('MovimentoMagazzino', function () {
      it('should emit split id only if accodato', function () {
        var mm = { _id: idMM };
        map(mm);
        expect(views._rows()).toEqual([]);
        mm.accodato = true;
        map(mm);
        expect(views._rows()).toEqual([[['010101', 2011, 'A', 1234], 1]]);
      });

      it('should emit one row for a only if defined', function () {
        var mm = { _id: idMM, magazzino2: '020202', causale2: ['ACQUISTO', 1], accodato: true };
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
        var mm = { _id: idMM, data: '20111230', causale1: ['VENDITA A CLIENTI', -1], accodato: true };
        map(mm);
        expect(views._rows()).toEqual([]);
        delete mm.accodato;
        map(mm);
        expect(views._rows()).toEqual([[['010101', '20111230', 'VENDITA A CLIENTI', 'A', 1234], 1]]);
      });
    });
  });

  describe('movimentiArticolo', function () {
    var map = views.movimentiArticolo;

    describe('MovimentoMagazzino', function () {
      it('should emit barcodes in movimenti magazzino', function () {
        var mm = codici.newMovimentoMagazzino('010101', '20111230', 1, codici.findCausaleMovimentoMagazzino('VENDITA A CLIENTI', -1));
        mm.rows = [
          ['112604565000800066', 2, 'XL', 'SMOKING', 100, 1],
          ['112604565000500066', 2, 'XL', 'SMOKING', 100, 2],
          ['112604565000800066', 2, 'XL', 'SMOKING', 100, 2]
        ];
        map(mm);
        expect(views._rows()).toEqual([
          [['010101', '112604565000800066', '20111230'], 'VENDITA A CLIENTI'],
          [['010101', '112604565000500066', '20111230'], 'VENDITA A CLIENTI']
        ]);
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

  describe('oldDoc map', function () {
    var map = views.oldDoc;

    it('should emit MovimentoMagazzino if invalid accodato', function () {
      var mm = { _id: idMM, rows: [], accodato: true };
      map(mm);
      expect(views._rows()).toEqual([]);
      mm.accodato = 1;
      map(mm);
      expect(views._rows()).toEqual([[idMM, 1]]);
    });

    it('should emit MovimentoMagazzino if invalid esterno1', function () {
      var mm = { _id: idMM, rows: [], esterno1: true };
      map(mm);
      expect(views._rows()).toEqual([]);
      mm.esterno1 = 1;
      map(mm);
      expect(views._rows()).toEqual([[idMM, 1]]);
    });

    it('should emit MovimentoMagazzino if invalid esterno2', function () {
      var mm = { _id: idMM, rows: [], esterno2: true };
      map(mm);
      expect(views._rows()).toEqual([]);
      mm.esterno2 = 1;
      map(mm);
      expect(views._rows()).toEqual([[idMM, 1]]);
    });

    it('should emit MovimentoMagazzino if invalid inProduzione', function () {
      var mm = { _id: idMM, rows: [], inProduzione: true };
      map(mm);
      expect(views._rows()).toEqual([]);
      mm.inProduzione = 1;
      map(mm);
      expect(views._rows()).toEqual([[idMM, 1]]);
    });
  });

  describe('giacenzeNegative map Giacenze', function () {
    var map = views.giacenzeNegative,
      columnNames = codici.COLUMN_NAMES.Giacenze,
      col = codici.colNamesToColIndexes(columnNames);

    it('should emit rows with negative values', function () {
      var or = [],
        giacenze = { _id: 'Giacenze', columnNames: columnNames, rows: [or] };
      or[col.stagione] = '123';
      or[col.modello] = '20674';
      or[col.articolo] = '4982';
      or[col.colore] = '5000';
      or[col.codiceAzienda] = '010101';
      or[col.inProduzione] = true;
      or[col.tipoMagazzino] = 3;
      or[col.giacenze] = { '01': 2, '02': -2 };
      map(giacenze);
      expect(views._rows()).toEqual([[['010101', '123', '20674', '4982', '5000', '02', 3], -2]]);
    });
  });

  describe('giacenze', function () {
    describe('map', function () {
      var map = views.giacenze.map;
      describe('MovimentoMagazzino', function () {
        it('should NOT emit ([macsAzStTm, scalarino, taglia, descrizioneTaglia, descrizione], qta) if not accodato', function () {
          var mm = {
            _id: idMM,
            columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
            causale1: ['VENDITA A CLIENTI', -1],
            rows: [
              ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
              ['105982901344800002', 6, '11', 'CALZE', 100, 1]
            ]
          };
          map(mm);
          expect(views._rows()).toEqual([]);
        });

        it('should emit ([macsAzStTm, scalarino, taglia, descrizioneTaglia, descrizione], qta) if accodato', function () {
          var mm = {
            _id: idMM,
            columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
            causale1: ['VENDITA A CLIENTI', -1],
            accodato: true,
            rows: [
              ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
              ['105982901344800002', 6, '11', 'CALZE', 100, 1]
            ]
          };
          map(mm);
          expect(views._rows()).toEqual([
            [['40912', '4053', '1000', '922', '010101', false, 3, 1, '41', '41', 'CAMICIA COLLO MODA'], -2],
            [['98290', '1344', '8000', '105', '010101', false, 3, 6, '02', '11', 'CALZE'], -1]
          ]);
        });

        it('should NOT emit ([macsAzStTm, scalarino, taglia, descrizioneTaglia, descrizione], qta) if esterno1', function () {
          var mm = {
            _id: idMM,
            columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
            causale1: ['VENDITA A CLIENTI', -1],
            esterno1: true,
            rows: [
              ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
              ['105982901344800002', 6, '11', 'CALZE', 100, 1]
            ]
          };
          map(mm);
          expect(views._rows()).toEqual([]);
        });

        it('should use inProduzione if present', function () {
          var mm = {
            _id: idMM,
            columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
            tipoMagazzino: 1,
            inProduzione: true,
            causale1: ['RETTIFICA INVENTARIO +', 1],
            accodato: true,
            rows: [
              ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
              ['105982901344800002', 6, '11', 'CALZE', 100, 1]
            ]
          };
          map(mm);
          expect(views._rows()).toEqual([
            [['40912', '4053', '1000', '922', '010101', true, 1, 1, '41', '41', 'CAMICIA COLLO MODA'], 2],
            [['98290', '1344', '8000', '105', '010101', true, 1, 6, '02', '11', 'CALZE'], 1]
          ]);
        });

        it('should emit rows for causale2 if accodato', function () {
          var mm = {
            _id: idMM,
            columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
            causale1: ['SCARICO PER CAMBIO MAGAZZINO', -1],
            causale2: ['CARICO PER CAMBIO MAGAZZINO', 1],
            magazzino2: '020202',
            accodato: true,
            rows: [
              ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
              ['105982901344800002', 6, '11', 'CALZE', 100, 1]
            ]
          };
          map(mm);
          expect(views._rows()).toEqual([
            [['40912', '4053', '1000', '922', '010101', false, 3, 1, '41', '41', 'CAMICIA COLLO MODA'], -2],
            [['40912', '4053', '1000', '922', '020202', false, 3, 1, '41', '41', 'CAMICIA COLLO MODA'], 2],
            [['98290', '1344', '8000', '105', '010101', false, 3, 6, '02', '11', 'CALZE'], -1],
            [['98290', '1344', '8000', '105', '020202', false, 3, 6, '02', '11', 'CALZE'], 1]
          ]);
        });

        it('should NOT emit rows for causale2 if accodato and esterno2', function () {
          var mm = {
            _id: idMM,
            columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
            causale1: ['SCARICO PER CAMBIO MAGAZZINO', -1],
            causale2: ['CARICO PER CAMBIO MAGAZZINO', 1],
            magazzino2: '020202',
            esterno2: true,
            accodato: true,
            rows: [
              ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
              ['105982901344800002', 6, '11', 'CALZE', 100, 1]
            ]
          };
          map(mm);
          expect(views._rows()).toEqual([
            [['40912', '4053', '1000', '922', '010101', false, 3, 1, '41', '41', 'CAMICIA COLLO MODA'], -2],
            [['98290', '1344', '8000', '105', '010101', false, 3, 6, '02', '11', 'CALZE'], -1]
          ]);
        });

        it('should use tipoMagazzino and tipoMagazzinoA if present', function () {
          var mm = {
            _id: idMM,
            columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
            tipoMagazzino: 1,
            tipoMagazzinoA: 2,
            causale1: ['SCARICO PER CAMBIO MAGAZZINO', -1],
            causale2: ['CARICO PER CAMBIO MAGAZZINO', 1],
            magazzino2: '020202',
            accodato: true,
            rows: [
              ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
              ['105982901344800002', 6, '11', 'CALZE', 100, 1]
            ]
          };
          map(mm);
          expect(views._rows()).toEqual([
            [['40912', '4053', '1000', '922', '010101', false, 1, 1, '41', '41', 'CAMICIA COLLO MODA'], -2],
            [['40912', '4053', '1000', '922', '020202', false, 2, 1, '41', '41', 'CAMICIA COLLO MODA'], 2],
            [['98290', '1344', '8000', '105', '010101', false, 1, 6, '02', '11', 'CALZE'], -1],
            [['98290', '1344', '8000', '105', '020202', false, 2, 6, '02', '11', 'CALZE'], 1]
          ]);
        });
      });
    });
    describe('reduce', function () {
      var reduce = views.giacenze.reduce;

      it('should sum values', function () {
        expect(reduce).toBe('_sum');
      });
    });
  });

  describe('giacenzeAnno', function () {
    describe('map', function () {
      var map = views.giacenzeAnno.map;
      describe('MovimentoMagazzino', function () {
        it('should NOT emit ([anno, macsAzStTm, scalarino, taglia, descrizioneTaglia, descrizione], qta) if not accodato', function () {
          var mm = {
            _id: idMM,
            columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
            causale1: ['VENDITA A CLIENTI', -1],
            rows: [
              ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
              ['105982901344800002', 6, '11', 'CALZE', 100, 1]
            ]
          };
          map(mm);
          expect(views._rows()).toEqual([]);
        });

        it('should emit ([anno, macsAzStTm, scalarino, taglia, descrizioneTaglia, descrizione], qta) if accodato', function () {
          var mm = {
            _id: idMM,
            columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
            causale1: ['VENDITA A CLIENTI', -1],
            accodato: true,
            rows: [
              ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
              ['105982901344800002', 6, '11', 'CALZE', 100, 1]
            ]
          };
          map(mm);
          expect(views._rows()).toEqual([
            [['2011', '40912', '4053', '1000', '922', '010101', false, 3, 1, '41', '41', 'CAMICIA COLLO MODA', 2000], -2],
            [['2011', '98290', '1344', '8000', '105', '010101', false, 3, 6, '02', '11', 'CALZE', 100], -1]
          ]);
        });

        it('should NOT emit ([anno, macsAzStTm, scalarino, taglia, descrizioneTaglia, descrizione], qta) if esterno1', function () {
          var mm = {
            _id: idMM,
            columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
            causale1: ['VENDITA A CLIENTI', -1],
            esterno1: true,
            rows: [
              ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
              ['105982901344800002', 6, '11', 'CALZE', 100, 1]
            ]
          };
          map(mm);
          expect(views._rows()).toEqual([]);
        });

        it('should use inProduzione if present', function () {
          var mm = {
            _id: idMM,
            columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
            tipoMagazzino: 1,
            inProduzione: true,
            causale1: ['RETTIFICA INVENTARIO +', 1],
            accodato: true,
            rows: [
              ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
              ['105982901344800002', 6, '11', 'CALZE', 100, 1]
            ]
          };
          map(mm);
          expect(views._rows()).toEqual([
            [['2011', '40912', '4053', '1000', '922', '010101', true, 1, 1, '41', '41', 'CAMICIA COLLO MODA', 2000], 2],
            [['2011', '98290', '1344', '8000', '105', '010101', true, 1, 6, '02', '11', 'CALZE', 100], 1]
          ]);
        });

        it('should emit rows for causale2 if accodato', function () {
          var mm = {
            _id: idMM,
            columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
            causale1: ['SCARICO PER CAMBIO MAGAZZINO', -1],
            causale2: ['CARICO PER CAMBIO MAGAZZINO', 1],
            magazzino2: '020202',
            accodato: true,
            rows: [
              ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
              ['105982901344800002', 6, '11', 'CALZE', 100, 1]
            ]
          };
          map(mm);
          expect(views._rows()).toEqual([
            [['2011', '40912', '4053', '1000', '922', '010101', false, 3, 1, '41', '41', 'CAMICIA COLLO MODA', 2000], -2],
            [['2011', '40912', '4053', '1000', '922', '020202', false, 3, 1, '41', '41', 'CAMICIA COLLO MODA', 2000], 2],
            [['2011', '98290', '1344', '8000', '105', '010101', false, 3, 6, '02', '11', 'CALZE', 100], -1],
            [['2011', '98290', '1344', '8000', '105', '020202', false, 3, 6, '02', '11', 'CALZE', 100], 1]
          ]);
        });

        it('should NOT emit rows for causale2 if accodato and esterno2', function () {
          var mm = {
            _id: idMM,
            columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
            causale1: ['SCARICO PER CAMBIO MAGAZZINO', -1],
            causale2: ['CARICO PER CAMBIO MAGAZZINO', 1],
            magazzino2: '020202',
            esterno2: true,
            accodato: true,
            rows: [
              ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
              ['105982901344800002', 6, '11', 'CALZE', 100, 1]
            ]
          };
          map(mm);
          expect(views._rows()).toEqual([
            [['2011', '40912', '4053', '1000', '922', '010101', false, 3, 1, '41', '41', 'CAMICIA COLLO MODA', 2000], -2],
            [['2011', '98290', '1344', '8000', '105', '010101', false, 3, 6, '02', '11', 'CALZE', 100], -1]
          ]);
        });

        it('should use tipoMagazzino and tipoMagazzinoA if present', function () {
          var mm = {
            _id: idMM,
            columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
            tipoMagazzino: 1,
            tipoMagazzinoA: 2,
            causale1: ['SCARICO PER CAMBIO MAGAZZINO', -1],
            causale2: ['CARICO PER CAMBIO MAGAZZINO', 1],
            magazzino2: '020202',
            accodato: true,
            rows: [
              ['922409124053100041', 1, '41', 'CAMICIA COLLO MODA', 2000, 2],
              ['105982901344800002', 6, '11', 'CALZE', 100, 1]
            ]
          };
          map(mm);
          expect(views._rows()).toEqual([
            [['2011', '40912', '4053', '1000', '922', '010101', false, 1, 1, '41', '41', 'CAMICIA COLLO MODA', 2000], -2],
            [['2011', '40912', '4053', '1000', '922', '020202', false, 2, 1, '41', '41', 'CAMICIA COLLO MODA', 2000], 2],
            [['2011', '98290', '1344', '8000', '105', '010101', false, 1, 6, '02', '11', 'CALZE', 100], -1],
            [['2011', '98290', '1344', '8000', '105', '020202', false, 2, 6, '02', '11', 'CALZE', 100], 1]
          ]);
        });
      });
    });
    describe('reduce', function () {
      var reduce = views.giacenzeAnno.reduce;

      it('should sum values', function () {
        expect(reduce).toBe('_sum');
      });
    });
  });
});
