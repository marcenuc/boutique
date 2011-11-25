/*global describe: false, beforeEach: false, browser: false, it: false,
         expect: false, element: false, repeater: false, binding: false, input: false, select: false */
describe('Boutique', function () {
  'use strict';

  beforeEach(function () {
    browser().navigateTo('../../app/index.html');
  });

  describe('Azienda', function () {
    beforeEach(function () {
      browser().navigateTo('#/Azienda');
    });

    it('should render all aziende when user navigates to /Azienda', function () {
      var r = repeater('ng\\:view table tbody tr', 'row in aziende.rows');
      expect(r.row(0)).toEqual(['<a href="#/Azienda_019996">019996</a>', 'Mag. Camp. L (Capriata)', 'MAGAZZINO', 'L', 'Tricase', 'LE', 'IT', 'false', '', '<a href="#/Listino_019996">Listino</a>']);
    });

    it('should create a new azienda from the input form at /Azienda', function () {
      var codice = input('azienda._id'),
        nome = input('azienda.nome'),
        tipo = select('azienda.tipo'),
        flash = element('.flash'),
        codiceAzienda = '000001';
      expect(flash.text()).toMatch(/^\s*$/);
      expect(codice.val()).toBe('');
      expect(nome.val()).toBe('');
      codice.enter(codiceAzienda);
      nome.enter('Azienda test');
      tipo.option('1');
      element('input[type="submit"]').click();
      expect(codice.val()).toBe(codiceAzienda);
      expect(nome.val()).toBe('Azienda test');
      expect(flash.text()).toMatch(/^\s*Salvato\s*$/);
    });
  });
});
