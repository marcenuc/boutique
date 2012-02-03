/*global describe:false, beforeEach:false, browser:false, it:false, expect:false, element:false, repeater:false, binding:false, input:false, select:false*/
describe('Boutique', function () {
  'use strict';

  beforeEach(function () {
    browser().navigateTo('/boutique/app/');
  });

  describe('Azienda', function () {
    beforeEach(function () {
      browser().navigateTo('#/ricerca-giacenza');
    });

    it('should find rows', function () {
      expect(element('input[ng-model="modello"]').val()).toBe('');
    });
  });
});
