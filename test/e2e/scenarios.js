/*global describe:false, beforeEach:false, browser:false, it:false, expect:false, element:false, repeater:false, binding:false, input:false, select:false*/
describe('Boutique', function () {
  'use strict';

  beforeEach(function () {
    browser().navigateTo('/boutique/test-resetdb/test');
  });

  function click(label) {
    element('input[value="' + label + '"]').click();
  }

  function goTo(path) {
    browser().navigateTo('/boutique/app/#' + path);
  }

  describe('/Azienda', function () {
    beforeEach(function () {
      goTo('/Azienda');
    });

    it('should save new azienda', function () {
      input('azienda._id').enter('010101');
      select('azienda.tipo').option('NEGOZIO');
      input('azienda.nome').enter('Negozio 1');
      click('Salva');
      expect(browser().location().path()).toBe('/Azienda_010101');
      expect(element('ul.notices li').text()).toMatch(/^Salvato\n\s*/);
      expect(input('azienda._id').val()).toBe('010101');
      expect(element('[ng-model="azienda.tipo"] option:selected').text()).toBe('NEGOZIO');
      expect(input('azienda.nome').val()).toBe('Negozio 1');
    });
  });

  describe('/ricerca-giacenza', function () {
    beforeEach(function () {
      goTo('/ricerca-giacenza');
    });

    it('should find given article if on stock', function () {
      click('Cerca');
      var rows = repeater('tbody.giacenze tr', 'row in filtrate');
      expect(rows.count()).toBe(3);
      expect(rows.row(0)).toEqual(["1", "099999 Negozio 099999", "SMOKING", "112", "60456", "5000", "5000", "3", "PRONTO", "2", "3", "", "", "", "", "", "", "", "", "", "", "", "3", "1", "2"]);
      expect(rows.row(1)).toEqual(["2", "099999 Negozio 099999", "SMOKING", "112", "60456", "5000", "8000", "3", "PRONTO", "2", "3", "", "", "", "", "", "", "", "", "", "", "", "3", "1", "2"]);
      expect(rows.row(2)).toEqual(["3", "099999 Negozio 099999", "SMOKING", "112", "60456", "8000", "5000", "3", "PRONTO", "2", "3", "", "", "", "", "", "", "", "", "", "", "", "3", "1", "2*"]);
    });
  });
});
