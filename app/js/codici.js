var CODICI;

(function () {
  'use strict';
  CODICI = {
    LEN_STAGIONE: 3,
    LEN_MODELLO: 5,
    LEN_ARTICOLO: 4,
    LEN_COLORE: 4,
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

  CODICI.codiceAs400 = function (stagione, modello, articolo, colore, taglia) {
    var s = CODICI.padZero(stagione, CODICI.LEN_STAGIONE),
      m = CODICI.padZero(modello, CODICI.LEN_MODELLO),
      a = CODICI.padZero(articolo, CODICI.LEN_ARTICOLO),
      c = CODICI.padZero(colore, CODICI.LEN_COLORE),
      t = CODICI.padZero(taglia, CODICI.LEN_TAGLIA);
    if (s && m && a && c && t) {
      return s + m + a + c + t;
    }
  };

  CODICI.idListino = function (versione, dataUso) {
    return ['Listino', versione, dataUso].join('_');
  };

  CODICI.parseBarcodeAs400 = function (code) {
    var m = CODICI.rexpBarcodeAs400.exec(code);
    if (m) {
      return {
        stagione: m[1],
        modello: m[2],
        articolo: m[3],
        colore: m[4],
        taglia: m[5],
        codiceListino: code.substring(0, 12),
        codiceDescrizioneEScalarino: code.substring(0, 8)
      };
    }
  };

  CODICI.barcodeDescs = function (codes, descrizioniTaglie, listaModelli) {
    var descrizioniTaglia,
      desscal = listaModelli[codes.codiceDescrizioneEScalarino];
    if (desscal) {
      descrizioniTaglia = descrizioniTaglie[desscal[1]];
      if (descrizioniTaglia) {
        return {
          descrizione: desscal[0],
          scalarino: desscal[1],
          descrizioneTaglia: descrizioniTaglia[codes.taglia]
        };
      }
    }
  };

  CODICI.codiceTaglia = function (stagione, modello, codiciTaglie, listaModelli, descrizioneTaglia) {
    var codiciTaglia,
      desscal = listaModelli[stagione + modello],
      scalarino;
    if (desscal) {
      scalarino = desscal[1];
      codiciTaglia = codiciTaglie[scalarino];
      if (codiciTaglia) {
        return [null, codiciTaglia[descrizioneTaglia]];
      }
      return ['Descrizione taglia (' + descrizioneTaglia + ') non trovata per scalarino ' + scalarino + ': stagione="' + stagione + '", modello="' + modello + '"'];
    }
    return ['Modello non in anagrafe: stagione="' + stagione + '", modello="' + modello + '"'];
  };
}());

/*global define: false*/
if (typeof define !== 'undefined') {
  define(function () {
    'use strict';
    return CODICI;
  });
}
