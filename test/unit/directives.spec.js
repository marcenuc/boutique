/*global describe:false, beforeEach:false, afterEach:false, it:false, expect:false, module:false, inject:false*/
describe('Filter', function() {
  'use strict';
  beforeEach(module('app.directives'));

  describe('barcodeAs400', function() {
    it('should format barcode with spaces', inject(function(barcodeAs400Filter) {
      expect(barcodeAs400Filter('101607544000800001')).toBe('101 60754 4000 8000 01');
    }));
  });

  describe('money', function() {
    it('should format money with comma', inject(function(moneyFilter) {
      expect(moneyFilter(1234)).toBe('12,34');
    }));
  });
});

describe('Directive', function() {
  'use strict';
  var $compile, $scope, form;

  beforeEach(module('app.directives'));

  beforeEach(inject(function($injector) {
    $compile = $injector.get('$compile');
    $scope = $injector.get('$rootScope');
  }));

  afterEach(function() {
    form.dealoc();
  });

  function createInput(directive) {
    form = $compile('<form name=form><input name=input ' + directive + ' ng-model=value></form>')($scope);
  }

  function setModelValue(value) {
    $scope.$apply(function() {
      $scope.value = value;
    });
  }

  function modelValue() {
    return $scope.value;
  }

  function setViewValue(value) {
    $scope.form.input.$setViewValue(value);
  }

  function viewValue() {
    return form.find('input').val();
  }

  describe('bqBarcodeAs400', function() {
    beforeEach(function() {
      createInput('bq-barcode-as400');
    });

    it('should format barcode with spaces for readability', function() {
      setModelValue('101607544000800001');
      expect(viewValue()).toBe('101 60754 4000 8000 01');
    });

    it('should remove spaces from input', function() {
      setViewValue('101 60754 4000 8000 01');
      expect(modelValue()).toBe('101607544000800001');
    });

    it('should accept empty values', function() {
      setViewValue('  ');
      expect(modelValue()).toBe('');
    });
  });

  describe('bqCodiceAzienda', function() {
    beforeEach(function() {
      createInput('bq-codice-azienda');
    });

    it('should show only codice from idAzienda', function() {
      setModelValue('Azienda_010203');
      expect(viewValue()).toBe('010203');
    });

    it('should create idAzienda from codiceAzienda', function() {
      setViewValue('020301');
      expect(modelValue()).toBe('Azienda_020301');
    });
  });

  describe('bqIdFoto', function() {
    beforeEach(function() {
      createInput('bq-id-foto');
    });

    it('should show only codice from idFoto', function() {
      setModelValue('Foto_1_0_1');
      expect(viewValue()).toBe('1_0_1');
    });

    it('should create idFoto from codice', function() {
      setViewValue('1 0 1');
      expect(modelValue()).toBe('Foto_1_0_1');
    });
  });

  describe('bqMoney', function() {
    beforeEach(function() {
      createInput('bq-money');
    });

    it('should format from cents to euros', function() {
      setModelValue(1234);
      expect(viewValue()).toBe('12,34');
    });

    it('should parse euros to cents', function() {
      setViewValue('12,3');
      expect(modelValue()).toBe(1230);
    });
  });

  describe('bqData', function() {
    beforeEach(function() {
      createInput('bq-data');
    });

    it('should show model value', function() {
      setModelValue('20121231');
      expect(viewValue()).toBe('20121231');
    });

    it('should accept only valid dates', function() {
      setViewValue('20110229');
      expect(modelValue()).toBeUndefined();
      setViewValue('20120229');
      expect(modelValue()).toBe('20120229');
    });
  });

  describe('bqVersioneListino', function() {
    beforeEach(function() {
      createInput('bq-versione-listino');
    });

    it('should show model value', function() {
      setModelValue('010203');
      expect(viewValue()).toBe('010203');
    });

    it('should accept only valid versioneListino', function() {
      setViewValue('a');
      expect(modelValue()).toBeUndefined();
      setViewValue('123456');
      expect(modelValue()).toBe('123456');
    });
  });

  describe('bqIncompleteSmact', function() {
    beforeEach(function() {
      createInput('bq-incomplete-smact');
    });

    it('should ignore spaces', function() {
      setViewValue('123 12345 1');
      expect(modelValue()).toBe('123123451');
    });
  });

});
