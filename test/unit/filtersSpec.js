/*global describe:false, beforeEach:false, it:false, expect:false, module:false, inject:false*/
describe('Filter', function () {
  'use strict';
  beforeEach(module('app.filters'));

  describe('barcodeAs400', function () {
    it('should format barcode with spaces', inject(function (barcodeAs400Filter) {
      expect(barcodeAs400Filter('101607544000800001')).toBe('101 60754 4000 8000 01');
    }));
  });

  describe('input', function () {
    describe('barcodeAs400', function () {
      it('should format barcode with spaces for readability', function () {
        inject(function ($compile, $rootScope) {
          $rootScope.barcode = '101607544000800001';
          var element = $compile('<input type=barcodeAs400 ng:model=barcode>')($rootScope);
          $rootScope.$digest();
          expect(element.val()).toEqual('101 60754 4000 8000 01');
        });
      });
    });

    describe('codiceAzienda', function () {
      it('should show only codice from idAzienda', function () {
        inject(function ($compile, $rootScope) {
          $rootScope.id = 'Azienda_010203';
          var element = $compile('<input type=codiceAzienda ng:model=id>')($rootScope);
          $rootScope.$digest();
          expect(element.val()).toEqual('010203');
        });
      });
    });

    describe('money', function () {
      it('should format money', function () {
        inject(function ($compile, $rootScope) {
          $rootScope.amount = '100';
          var element = $compile('<input type=money ng:model=amount>')($rootScope);
          $rootScope.$digest();
          expect(element.val()).toEqual('1');
        });
      });
    });
  });
});
