/*global describe:false, beforeEach:false, it:false, expect:false, jasmine:false, require:false, process:false*/
process.env.LANG = 'C';
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['lists'], function (lists) {
  'use strict';
  var cols;

  beforeEach(function () {
    cols = 'ANNO\tMODELLO\tARTICOLO\tCOLORE\tSTAGIONE\tMAGAZZINO\tIN_PRODUZIONE\tTIPO_MAGAZZINO\tSCALARINO\tTAGLIA\tDESCRIZIONE_TAGLIA\tDESCRIZIONE\tCOSTO\tGIACENZA\tTOTALE';
    lists._reset();
  });

  describe('giacenzeTSV list', function () {
    var list = lists.giacenzeTSV,
      start = { headers: { 'Content-Type': 'application/excel' } };
    it('should send TSV output', function () {
      var rows = [
        { key: ['2011', '10102', '1444', '7300', '922', '099994', false, 3, 3, '01', 'TU', 'CRAVATTA CM 8,5', 123], value: 1 },
        { key: ['2011', '10102', '1699', '6100', '132', '019996', false, 2, 3, '01', 'TU', 'CRAVATTA CM 8,5', 234], value: 1 },
        { key: ['2011', '10102', '1699', '6100', '132', '019998', false, 2, 3, '01', 'TU', 'CRAVATTA CM 8,5', 345], value: 1 }
      ];
      lists._setRows(rows);
      list();
      expect(lists._output()).toEqual([start, [
        cols,
        '"2011"\t"10102"\t"1444"\t"7300"\t"922"\t"099994"\t"false"\t3\t3\t"01"\t"TU"\t"CRAVATTA CM 8,5"\t123\t1\t=M2*N2/100',
        '"2011"\t"10102"\t"1699"\t"6100"\t"132"\t"019996"\t"false"\t2\t3\t"01"\t"TU"\t"CRAVATTA CM 8,5"\t234\t1\t=M3*N3/100',
        '"2011"\t"10102"\t"1699"\t"6100"\t"132"\t"019998"\t"false"\t2\t3\t"01"\t"TU"\t"CRAVATTA CM 8,5"\t345\t1\t=M4*N4/100',
        '""\t""\t""\t""\t""\t""\t""\t\t\t""\t""\t""\t\t\t=SOMMA(O2:O4)',
        ''
      ].join('\r\n')]);
    });

    it('should exclude rows with value=0', function () {
      var rows = [
        { key: ['2011', '10102', '1444', '7300', '922', '099994', false, 3, 3, '01', 'TU', 'CRAVATTA CM 8,5', 123], value: 1 },
        { key: ['2011', '10102', '1699', '6100', '132', '019996', false, 2, 3, '01', 'TU', 'CRAVATTA CM 8,5', 234], value: 0 },
        { key: ['2011', '10102', '1699', '6100', '132', '019998', false, 2, 3, '01', 'TU', 'CRAVATTA CM 8,5', 345], value: 1 }
      ];
      lists._setRows(rows);
      list();
      expect(lists._output()).toEqual([start, [
        cols,
        '"2011"\t"10102"\t"1444"\t"7300"\t"922"\t"099994"\t"false"\t3\t3\t"01"\t"TU"\t"CRAVATTA CM 8,5"\t123\t1\t=M2*N2/100',
        '"2011"\t"10102"\t"1699"\t"6100"\t"132"\t"019998"\t"false"\t2\t3\t"01"\t"TU"\t"CRAVATTA CM 8,5"\t345\t1\t=M3*N3/100',
        '""\t""\t""\t""\t""\t""\t""\t\t\t""\t""\t""\t\t\t=SOMMA(O2:O3)',
        ''
      ].join('\r\n')]);
    });
  });
});
