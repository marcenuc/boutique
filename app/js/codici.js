var CODICI;

(function () {
  'use strict';
  CODICI = {
    LEN_STAGIONE: 3,
    LEN_MODELLO: 5,
    LEN_ARTICOLO: 4,
    LEN_TAGLIA: 2,
    LEN_DESC_TAGLIE: 3,
    rexpBarcodeAs400: /^(\d{3})(\d{5})(\d{4})(\d{4})(\d{2})$/
  };

  CODICI.isCode = function (code) {
    return (/^\d+$/).test(code);
  };

  CODICI.padZero = function (code, len) {
    return CODICI.isCode(code) ? new Array(len + 1 - code.length).join('0') + code : null;
  };

  CODICI.codiceListino = function (stagione, modello, articolo) {
    var s = CODICI.padZero(stagione, CODICI.LEN_STAGIONE),
      m = CODICI.padZero(modello, CODICI.LEN_MODELLO),
      a = CODICI.padZero(articolo, CODICI.LEN_ARTICOLO);
    if (s && m && a) {
      return s + m + a;
    }
  };

  CODICI.idListino = function (versione, dataUso) {
    return ['Listino', versione, dataUso].join('_');
  };

  CODICI.parseBarcodeAs400 = function (code) {
    return CODICI.rexpBarcodeAs400.exec(code);
  };
}());

/*global define: false*/
if (typeof define !== 'undefined') {
  define(function () {
    'use strict';
    return CODICI;
  });
}
