/*jslint node: true */
/*jshint node: true */
/*global describe: false, beforeEach: false, afterEach: false, it: false, xit: false, expect: false, jasmine: false */

var requirejs = require('requirejs');
requirejs.config({
  baseUrl: __dirname + '/../..',
  nodeRequire: require,
  // CouchDB requires that modules used in map functions resides in 'views/lib'.
  paths: {
    'views/lib/codici': 'app/js/codici'
  }
});

requirejs(['views'], function (views) {
  'use strict';
  var id = 'MovimentoMagazzino_010101_2011_A_1234';

  beforeEach(function () {
    views._resetRows();
  });

  describe('movimentiMagazzinoAccodati map', function () {
    var map = views.movimentiMagazzinoAccodati;

    it('should emit split id of movimento magazzino if accodato', function () {
      var mm = { _id: id };
      map(mm);
      expect(views._rows()).toEqual([]);
      mm.accodato = 1;
      map(mm);
      expect(views._rows()).toEqual([[['010101', 2011, 'A', 1234], 1]]);
    });

    it('should emit one row for destinazione if causaleDestinazione is defined', function () {
      var mm = { _id: id, destinazione: '020202', causaleDestinazione: ['ACQUISTO', 1], accodato: 1 };
      map(mm);
      expect(views._rows()).toEqual([
        [['010101', 2011, 'A', 1234], 1],
        [['020202', '010101', 2011, 'A', 1234], 1]
      ]);
    });
  });

  describe('serialiMovimentiMagazzino map', function () {
    var map = views.contatoriMovimentiMagazzino;

    it('should emit [codiceAzienda, anno, gruppo, numero]', function () {
      var mm = { _id: id };
      map(mm);
      expect(views._rows()).toEqual([
        [['010101', 2011, 'A', 1234], 1]
      ]);
    });
  });

  describe('riferimentiMovimentiMagazzino map', function () {
    var map = views.riferimentiMovimentiMagazzino;

    it('should emit riferimento of MovimentoMagazzino', function () {
      var mm = { _id: id, riferimento: 'BollaAs400_2011_1234'};
      map(mm);
      expect(views._rows()).toEqual([['BollaAs400_2011_1234', undefined]]);
    });
  });
});