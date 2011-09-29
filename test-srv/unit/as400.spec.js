describe('As400', function () {
  'use strict';

  var as400 = require('../../lib/as400');

  describe('buildCausaliAs400', function () {
    it('should use causaliDisponibile and causaliCliente', function () {
      var causaliDisponibile = { columnNames: ['key', 'values'], rows: [['MD01', 'CARICO DA PROD. A0050A'], ['MD02', 'RESO A PRODUZ.  K0050A']] },
        causaliCliente = { columnNames: ['key', 'values'], rows: [['MC?', '00'], ['MC01', 'CARICO DA PROD. A  50A'], ['MC02', 'RESO A PRODUZ.  K  50']] };
      expect(as400.buildCausaliAs400(causaliCliente, causaliDisponibile)).toEqual({
        '1': { '01': ['CARICO DA PROD.', -1], '02': ['RESO A PRODUZ.', 1] },
        '2': { '01': ['CARICO DA PROD.', -1], '02': ['RESO A PRODUZ.', 1] }
      });
    });
  });
});