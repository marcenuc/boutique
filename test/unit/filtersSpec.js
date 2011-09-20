/*global describe: false, beforeEach: false, it: false, expect: false, angular: false,
  binding: false */

describe('Filters', function () {
  'use strict';
  
  describe('linkById', function () {
    var linkById = angular.filter.linkById;
    
    it('should create a link to the document with the given id', function () {
      var link = linkById('azienda_010101');
      expect(link.attr('href')).toBe('#/azienda/010101');
      expect(link.text()).toBe('010101');
    });
  });
});

describe('Formatters', function () {
  'use strict';
  
  describe('codiceAzienda', function () {
    var codiceAzienda = angular.formatter.codiceAzienda;
    
    it('should format "azienda_010101" to "010101"', function () {
      expect(codiceAzienda.format('azienda_010101')).toEqual('010101');
    });
    
    it('should parse "010101" as "azienda_010101"', function () {
      expect(codiceAzienda.parse('010101')).toEqual('azienda_010101');
    });
  });
});