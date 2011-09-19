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