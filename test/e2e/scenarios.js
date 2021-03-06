/*global describe:false, ddescribe:false, beforeEach:false, browser:false, it:false, xit:false, expect:false, element:false, using:false, repeater:false, binding:false, input:false, select:false*/
describe('Boutique', function() {
  'use strict';

  beforeEach(function() {
    browser().navigateTo('/boutique/test-resetdb/test');
    browser().navigateTo('/boutique/app/');
  });

  function click(label) {
    element('input[type="submit"][value="' + label + '"]').click();
  }

  function clickMenu(itemText) {
    element('div.menu a:contains("' + itemText + '")').click();
  }

  describe('/Azienda', function() {
    beforeEach(function() {
      clickMenu('Aziende');
    });

    it('should save new azienda', function() {
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

  describe('/ricerca-giacenza', function() {
    beforeEach(function() {
      clickMenu('Ricerca giacenza');
    });

    it('should find all articles in stock by default', function() {
      click('Cerca');
      var rows = repeater('tbody.giacenze tr', 'row in filtrate');
      expect(rows.count()).toBe(3);
      expect(rows.row(0)).toEqual(["1", "099999 Negozio 099999", "SMOKING", "112", "60456", "5000", "5000", "3", "PRONTO", "2", "3", "", "", "", "", "", "", "", "", "", "", "", "3", "1", "2", "6"]);
      expect(rows.row(1)).toEqual(["2", "099999 Negozio 099999", "SMOKING", "112", "60456", "5000", "8000", "3", "PRONTO", "2", "3", "", "", "", "", "", "", "", "", "", "", "", "3", "1", "2", "6"]);
      expect(rows.row(2)).toEqual(["3", "099999 Negozio 099999", "SMOKING", "112", "60456", "8000", "5000", "3", "PRONTO", "2", "3", "", "", "", "", "", "", "", "", "", "", "", "3", "1", "2*", "6"]);
    });

    it('should find given article if on stock', function() {
      input('articolo').enter('50');
      click('Cerca');
      var rows = repeater('tbody.giacenze tr', 'row in filtrate');
      expect(rows.count()).toBe(2);
      expect(rows.row(0)).toEqual(["1", "099999 Negozio 099999", "SMOKING", "112", "60456", "5000", "5000", "3", "PRONTO", "2", "3", "", "", "", "", "", "", "", "", "", "", "", "3", "1", "2", "6"]);
      expect(rows.row(1)).toEqual(["2", "099999 Negozio 099999", "SMOKING", "112", "60456", "5000", "8000", "3", "PRONTO", "2", "3", "", "", "", "", "", "", "", "", "", "", "", "3", "1", "2", "6"]);
    });

    it('should find by tipo azienda', function() {
      select('quickSearch.tipo').option('MAGAZZINO');
      click('Cerca');
      var rows = repeater('tbody.giacenze tr', 'row in filtrate');
      expect(rows.count()).toBe(0);
      select('quickSearch.tipo').option('NEGOZIO');
      click('Cerca');
      rows = repeater('tbody.giacenze tr', 'row in filtrate');
      expect(rows.count()).toBe(3);
      expect(rows.row(0)).toEqual(["1", "099999 Negozio 099999", "SMOKING", "112", "60456", "5000", "5000", "3", "PRONTO", "2", "3", "", "", "", "", "", "", "", "", "", "", "", "3", "1", "2", "6"]);
      expect(rows.row(1)).toEqual(["2", "099999 Negozio 099999", "SMOKING", "112", "60456", "5000", "8000", "3", "PRONTO", "2", "3", "", "", "", "", "", "", "", "", "", "", "", "3", "1", "2", "6"]);
      expect(rows.row(2)).toEqual(["3", "099999 Negozio 099999", "SMOKING", "112", "60456", "8000", "5000", "3", "PRONTO", "2", "3", "", "", "", "", "", "", "", "", "", "", "", "3", "1", "2*", "6"]);
    });
  });

  function saveMovimentoMagazzino() {
    clickMenu('Movimento magazzino');
    element('a:contains("Nuovo")').click();
    select('form.causale1').option('VENDITA A CLIENTI');
    select('form.magazzino1').option('099994');
    input('form.data').enter('20111213');
    click('Crea');
    expect(browser().location().path()).toBe('/MovimentoMagazzino_099994_2011_C_1');
    // TODO expect(element('ul.notices li').text()).toMatch(/^Salvato\n\s*/);
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
    expect(r.row(0)).toEqual(['1', '112 60456 5000 5000 66', '2', 'SM', 'SMOKING', '1,23']);
  }

  describe('/MovimentoMagazzino_', function() {
    it('should save new movimento magazzino', saveMovimentoMagazzino);
  });

  describe('/MovimentoMagazzino', function() {
    beforeEach(function() {
      saveMovimentoMagazzino();
      clickMenu('Movimento magazzino');
    });

    it('should find movimento magazzino by id', function() {
      select('form.causale1').option('VENDITA A CLIENTI');
      select('form.magazzino1').option('099994');
      input('form.anno').enter('2011');
      input('form.numero').enter('1');
      click('Cerca');
      var a = element('table.results a[href="#/MovimentoMagazzino_099994_2011_C_1"]');
      expect(a.text()).toBe('1');
      a.click();
      expect(browser().location().path()).toBe('/MovimentoMagazzino_099994_2011_C_1');
      expect(binding('model.data')).toBe('20111213');
      expect(binding('codes.numero')).toBe('1');
      expect(binding('codes.gruppo')).toBe('C');
      expect(binding('model.causale1[0]')).toBe('VENDITA A CLIENTI');
      expect(binding('model.causale1[1]')).toBe('-1');
      expect(binding('nomeMagazzino1')).toBe('099994 Negozio 099994');
      expect(binding('nomeMagazzino2')).toBe('');
      var r = using('table.details').repeater('tbody tr', 'row in model.rows');
      expect(r.count()).toBe(2);
      expect(r.row(0)).toEqual(['1', '112 60456 5000 5000 66', '2', 'SM', 'SMOKING', '1,23']);
    });

    it('should list movimenti magazzino by barcode', function() {
      input('form.anno').enter('');
      input('form.smact').enter('112 60456');
      select('form.magazzino1').option('099994');
      click('Cerca');
      var r = using('table.results').repeater('tbody tr', 'row in results.rows');
      expect(r.count()).toBe(1);
      expect(r.row(0)).toEqual(['1', '099994 Negozio 099994', '20111213', 'VENDITA A CLIENTI', 'C', '1']);
    });

    it('should list movimento magazzino non accodato', function() {
      var r = using('table.pendenti').repeater('tbody tr', 'row in pendenti.rows');
      expect(r.count()).toBe(1);
      expect(r.row(0)).toEqual(['1', '099994 Negozio 099994', '20111213', 'VENDITA A CLIENTI', 'C', '1']);
      var a = element('table.pendenti a[href="#/MovimentoMagazzino_099994_2011_C_1"]');
      expect(a.text()).toBe('1');
      a.click();
      expect(browser().location().path()).toBe('/MovimentoMagazzino_099994_2011_C_1');
      expect(element('input[ng-model="model.accodato"]').prop('checked')).toBeFalsy();
      input('model.accodato').check();
      click('Salva');
      expect(element('ul.notices li').text()).toMatch(/^Salvato MovimentoMagazzino_099994_2011_C_1\n\s*/);
      expect(element('input[ng-model="model.accodato"]').prop('checked')).toBeTruthy();
      clickMenu('Movimento magazzino');
      r = using('table.pendenti').repeater('tbody tr', 'row in pendenti.rows');
      expect(r.count()).toBe(0);
    });
  });

  describe('/Foto', function() {
    it('should find foto by rivista, pagina, posizione', function() {
      clickMenu('Foto');
      expect(element('div.foto').css('display')).toBe('none');
      input('idFoto').enter('1  0 1');
      click('Cerca');
      expect(browser().location().path()).toBe('/Foto_1_0_1');
      expect(element('div.foto').css('display')).toBe('block');
      var r = using('table.results').repeater('tbody tr', 'row in results');
      expect(r.count()).toBe(2);
      expect(r.row(0)).toEqual(['1', '125', '98021', '1881', '8000', 'SCARPA CLASSICA FIBBIA', '123,45']);
      expect(r.row(1)).toEqual(['2', '125', '40021', '2109', '5500', 'CAMICIA CLASSICA', '34,21']);
      expect(element('table.results tfoot tr th.n[colspan=6]').text()).toBe('Totale:');
      expect(element('table.results tfoot tr th.n:last-child').text()).toBe('157,66');
    });
  });
});
