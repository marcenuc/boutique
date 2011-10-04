var CODICI = {
  LEN_STAGIONE: 3,
  LEN_MODELLO: 5,
  LEN_ARTICOLO: 4,
  LEN_TAGLIA: 2,
  LEN_DESC_TAGLIE: 3,

  isCode: function (code) {
    'use strict';
    return (/^\d+$/).test(code);
  },

  padZero: function (code, len) {
    'use strict';
    return CODICI.isCode(code) ? new Array(len + 1 - code.length).join('0') + code : null;
  },

  codiceListino: function (stagione, modello, articolo) {
    'use strict';
    var s = CODICI.padZero(stagione, CODICI.LEN_STAGIONE),
      m = CODICI.padZero(modello, CODICI.LEN_MODELLO),
      a = CODICI.padZero(articolo, CODICI.LEN_ARTICOLO);
    if (s && m && a) {
      return s + m + a;
    }
  },

  idListino: function (versione, dataUso) {
    'use strict';
    return ['Listino', versione, dataUso].join('_');
  }
};
/*global define: false*/
if (typeof define !== 'undefined') {
  define(function () {
    'use strict';
    return CODICI;
  });
}
