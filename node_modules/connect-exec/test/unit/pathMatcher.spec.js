/*jslint node: true */
/*jshint node: true */
/*global describe: false, it: false, expect: false */

describe('pathMatcher', function () {
  'use strict';

  var pathMatcher = require('../../lib/pathMatcher'),
    validUrls = [
      '/scalarini',
      '/stampaEtichette[BollaAs400_110704_40241_Y_10]',
      '/bolla/data=110704/numero=40241/enteNumerazione=Y/codiceNumerazione=10',
      '/stampaEtichette/id=MovimentoMagazzino_410427_2011_40344/comparator=MACTS/layout=standard/formato=strette',
      '/stampaEtichette/stagione=/modello=/articolo=/colore=/taglia=/aziende=110427|210427/comparator=MACTS/layout=standard/formato=strette'
    ],
    invalidUrls = [
      '/foo/scalarini',
      ' /scalarini',
      '/scalarini/',
      '/bolla/data=110704/numero=40241/enteNumerazione=Y/codiceNumerazione:10'
    ];

  invalidUrls.forEach(function (invalidUrl) {
    it('should not match "' + invalidUrl + '"', function () {
      expect(pathMatcher(invalidUrl)).toBe(null);
    });
  });

  it('should return no arguments from "' + validUrls[0] + '"', function () {
    expect(pathMatcher(validUrls[0])).toEqual(['scalarini']);
  });

  it('should return no arguments from "' + validUrls[1] + '"', function () {
    expect(pathMatcher(validUrls[1])).toEqual(['stampaEtichette[BollaAs400_110704_40241_Y_10]']);
  });

  it('should extract arguments from "' + validUrls[2] + '"', function () {
    expect(pathMatcher(validUrls[2])).toEqual([
      'bolla',
      'data=110704',
      'numero=40241',
      'enteNumerazione=Y',
      'codiceNumerazione=10'
    ]);
  });

  it('should extract arguments from "' + validUrls[3] + '"', function () {
    expect(pathMatcher(validUrls[3])).toEqual([
      'stampaEtichette',
      'id=MovimentoMagazzino_410427_2011_40344',
      'comparator=MACTS',
      'layout=standard',
      'formato=strette'
    ]);
  });

  it('should extract arguments from "' + validUrls[4] + '"', function () {
    expect(pathMatcher(validUrls[4])).toEqual([
      'stampaEtichette',
      'stagione=',
      'modello=',
      'articolo=',
      'colore=',
      'taglia=',
      'aziende=110427|210427',
      'comparator=MACTS',
      'layout=standard',
      'formato=strette'
    ]);
  });
});
