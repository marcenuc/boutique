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
      browser().navigateTo('#/azienda/');
    });
  
    it('should render all aziende when user navigates to /azienda', function () {
      var r = repeater('ng\\:view table tbody tr', 'row in aziende.rows');
      expect(r.row(0)).toEqual(['<a href="#/azienda/000001">000001</a>', 'Magazzino Disponibile-Tailor S.r.l.']);
      expect(r.row(1)).toEqual(['<a href="#/azienda/000002">000002</a>', 'Negozio Lecce - Tailor S.r.l.']);
    });
        
    it('should create a new azienda from the input form at /azienda', function () {
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
