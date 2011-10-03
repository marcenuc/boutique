/*global describe: false, beforeEach: false, browser: false, it: false,
         expect: false, element: false, repeater: false, binding: false, input: false */
describe('Boutique', function () {
  'use strict';

  beforeEach(function () {
    browser().navigateTo('../../app/index.html');
  });

  it('should automatically redirect to / when location hash/fragment is empty', function () {
    expect(browser().location().hash()).toBe('/');
  });


  describe('azienda', function () {
    beforeEach(function () {
      browser().navigateTo('#/Azienda');
    });

    it('should render all aziende when user navigates to /Azienda', function () {
      var r = repeater('ng\\:view table tbody tr', 'row in aziende.rows');
      expect(r.row(0)).toEqual(['<a href="#/Azienda_019997">019997</a>', 'Magazzino Disponibile +1', 'MAGAZZINO', 'K', '', 'LE', 'IT', '', '']);
    });

    it('should create a new azienda from the input form at /Azienda', function () {
      var codice = input('azienda._id'),
        nome = input('azienda.nome'),
        flash = element('.flash');
      expect(flash.text()).toMatch(/^\s*$/);
      expect(codice.val()).toBe('');
      expect(nome.val()).toBe('');
      codice.enter('010102');
      nome.enter('Azienda test');
      element('form.azienda input[type="submit"]').click();
      expect(codice.val()).toBe('010102');
      expect(nome.val()).toBe('Azienda test');
      expect(flash.text()).toMatch(/^\s*Salvato\s*$/);
    });
  });

});
