/*global describe:false, beforeEach:false, it:false, expect:false, jasmine:false, require:false, process:false*/
process.env.LANG = 'C';
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['lists'], function (lists) {
  'use strict';

  beforeEach(function () {
    lists._reset();
  });

  describe('giacenzeTSV list', function () {
    var list = lists.giacenzeTSV,
      start = { headers: { 'Content-Type': 'application/excel' } };
    it('do something', function () {
      var rows = [
        { key: ['2011', '10102', '1444', '7300', '922', '099994', 0, 3, 3, '01', 'TU', 'CRAVATTA CM 8,5', 100], value: 1 },
        { key: ['2011', '10102', '1699', '6100', '132', '019996', 0, 2, 3, '01', 'TU', 'CRAVATTA CM 8,5', 200], value: 1 },
        { key: ['2011', '10102', '1699', '6100', '132', '019998', 0, 2, 3, '01', 'TU', 'CRAVATTA CM 8,5', 300], value: 1 }
      ];
      lists._setRows(rows);
      list();
      expect(lists._output()).toEqual([start,
        'ANNO\tMODELLO\tARTICOLO\tCOLORE\tSTAGIONE\tMAGAZZINO\tIN_PRODUZIONE\tTIPO_MAGAZZINO\tSCALARINO\tTAGLIA\tDESCRIZIONE_TAGLIA\tDESCRIZIONE\tCOSTO\tGIACENZA\r\n' +
        '2011\t10102\t1444\t7300\t922\t099994\t0\t3\t3\t01\tTU\tCRAVATTA CM 8,5\t100\t1\r\n' +
        '2011\t10102\t1699\t6100\t132\t019996\t0\t2\t3\t01\tTU\tCRAVATTA CM 8,5\t200\t1\r\n' +
        '2011\t10102\t1699\t6100\t132\t019998\t0\t2\t3\t01\tTU\tCRAVATTA CM 8,5\t300\t1\r\n'
        ]);
    });
  });
});
