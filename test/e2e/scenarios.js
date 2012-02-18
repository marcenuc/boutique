/*global describe:false, xdescribe:false, beforeEach:false, browser:false, it:false, expect:false, element:false, using:false, repeater:false, binding:false, input:false, select:false*/
describe('Boutique', function () {
  'use strict';

  beforeEach(function () {
    browser().navigateTo('/boutique/test-resetdb/test');
  });

  function click(label) {
    element('input[type="submit"][value="' + label + '"]').click();
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
      var r = repeater('table.results tbody tr', 'results');
      expect(r.count()).toBe(5);
      expect(r.column('row.doc.nome')).toEqual(['Negozio 1', 'Magazzino 099991', 'Negozio 099994', 'Negozio 099999', 'Negozio 110427']);
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

  describe('/MovimentoMagazzino_', function () {
    beforeEach(function () {
      goTo('/MovimentoMagazzino_');
    });

    it('should save new movimento magazzino', function () {
      select('form.causale1').option('VENDITA A CLIENTI');
      select('form.magazzino1').option('099994');
      input('form.data').enter('20111213');
      click('Crea');
      expect(browser().location().path()).toBe('/MovimentoMagazzino_099994_2011_C_1');
      expect(binding('model.data')).toBe('20111213');
      expect(binding('codes.numero')).toBe('1');
      expect(binding('codes.gruppo')).toBe('C');
      expect(binding('model.causale1[0]')).toBe('VENDITA A CLIENTI');
      expect(binding('model.causale1[1]')).toBe('-1');
      expect(binding('nomeMagazzino1')).toBe('099994 Negozio 099994');
      expect(binding('nomeMagazzino2')).toBe('');
      var r = using('table.details').repeater('tbody tr', 'row in model.rows');
      expect(r.count()).toBe(1);
      expect(r.row(0)).toEqual([]);
      input('newBarcode').enter('112 60456 5000 5000 66');
      click('Salva');
      expect(r.count()).toBe(2);
      expect(r.row(0)).toEqual(['1', '112 60456 5000 5000 66', '2', 'SM', 'SMOKING', '0']);
    });
  });
});
