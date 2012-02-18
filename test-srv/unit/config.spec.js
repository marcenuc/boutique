/*global describe:false, beforeEach:false, it:false, expect:false, jasmine:false, require:false, process:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['dbconfig'], function (dbconfig) {
  'use strict';

  describe('viewPath', function () {
    it('should return path of couchdb view', function () {
      expect(dbconfig.viewPath('aziende')).toBe(['', dbconfig.db, '_design', dbconfig.designDoc, '_view', 'aziende'].join('/'));
    });
  });

  describe('docPath', function () {
    it('should return path of couchdb doc', function () {
      expect(dbconfig.docPath('Azienda')).toBe(['', dbconfig.db, 'Azienda'].join('/'));
    });
  });
});
