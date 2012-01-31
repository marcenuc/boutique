/*global describe:false, beforeEach:false, it:false, expect:false, module:false, inject:false, jasmine:false*/
describe('inputType', function () {
  'use strict';
  beforeEach(module('app.widgets'));
  beforeEach(module('app.shared'));

  describe('myLinkById', function () {
    it('should create a link to the document with the given id', inject(function (myLinkByIdDirective) {
      var lfunc = myLinkByIdDirective[0].compile(),
        scope = { row: { id: 'Azienda_010101' } },
        element = jasmine.createSpyObj('element', ['attr', 'text']);
      lfunc(scope, element);
      expect(element.attr).toHaveBeenCalledWith('href', '#/Azienda_010101');
      expect(element.text).toHaveBeenCalledWith('010101');
    }));
  });

  describe('myLinkListino', function () {
    it('should create a link to listino of given azienda', inject(function (myLinkListinoDirective) {
      var lfunc = myLinkListinoDirective[0].compile(),
        scope = { row: { id: 'Azienda_010101' } },
        element = jasmine.createSpyObj('element', ['attr', 'text']);
      lfunc(scope, element);
      expect(element.attr).toHaveBeenCalledWith('href', '#/Listino_010101');
      expect(element.text).toHaveBeenCalledWith('Listino');
    }));
  });
});
