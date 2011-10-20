// TODO CODICI should be freezed to be guarded against modifications.
var CODICI;

(function () {
  'use strict';
  /*global define: false, exports: false*/
  if (typeof define === 'function') {
    CODICI = {};
    define(function () {
      return CODICI;
    });
  } else if (typeof exports === 'object') {
    CODICI = exports;
  } else {
    CODICI = {};
  }

  CODICI.LEN_STAGIONE = 3;
  CODICI.LEN_MODELLO = 5;
  CODICI.LEN_ARTICOLO = 4;
  CODICI.LEN_COLORE = 4;
  CODICI.LEN_TAGLIA = 2;
  CODICI.LEN_DESCRIZIONE_TAGLIA = 3;
  CODICI.rexpBarcodeAs400 = /^(\d{3})(\d{5})(\d{4})(\d{4})(\d{2})$/;
  CODICI.TIPO_MAGAZZINO_CLIENTI = 1;
  CODICI.TIPO_MAGAZZINO_DISPONIBILE = 2;
  CODICI.TIPO_MAGAZZINO_NEGOZIO = 3;
  CODICI.CAUSALI_MOVIMENTO_MAGAZZINO = [
    ['VENDITA', -1, 0],
    ['ACQUISTO', 1, 0],
    ['RESO SU ACQUISTO', -1, 0],
    ['TRASFERIMENTO', -1, 1],
    ['RETTIFICA INVENTARIO +', 1, 0],
    ['RETTIFICA INVENTARIO -', -1, 0]
  ];

  CODICI.isCode = function (code) {
    return (/^\d+$/).test(code);
  };

  function padZero(code, len) {
    return CODICI.isCode(code) ? new Array(len + 1 - code.length).join('0') + code : null;
  }
  CODICI.padZero = padZero;


  CODICI.typeAndCodeFromId = function (id) {
    return id && /^([A-Z][a-zA-Z0-9]+)(?:_([0-9A-Za-z_]+))?$/.exec(id);
  };

  CODICI.codiceListino = function (stagione, modello, articolo) {
    var s = padZero(stagione, CODICI.LEN_STAGIONE),
      m = padZero(modello, CODICI.LEN_MODELLO),
      a = padZero(articolo, CODICI.LEN_ARTICOLO);
    if (s && m && a) {
      return s + m + a;
    }
  };

  CODICI.codiceAs400 = function (stagione, modello, articolo, colore, taglia) {
    var s = padZero(stagione, CODICI.LEN_STAGIONE),
      m = padZero(modello, CODICI.LEN_MODELLO),
      a = padZero(articolo, CODICI.LEN_ARTICOLO),
      c = padZero(colore, CODICI.LEN_COLORE),
      t = padZero(taglia, CODICI.LEN_TAGLIA);
    if (s && m && a && c && t) {
      return s + m + a + c + t;
    }
  };


  CODICI.idAzienda = function (codice) {
    if (codice) {
      return 'Azienda_' + codice;
    }
  };

  CODICI.idListino = function (versione, dataUso) {
    if (versione && dataUso) {
      return ['Listino', versione, dataUso].join('_');
    }
  };

  CODICI.idInventario = function (azienda) {
    if (azienda) {
      return 'Inventario_' + azienda;
    }
  };

  CODICI.idMovimentoMagazzino = function (azienda, anno, numeroBolla) {
    if (azienda && anno && numeroBolla) {
      return ['MovimentoMagazzino', azienda, anno, numeroBolla].join('_');
    }
  };

  CODICI.parseIdMovimentoMagazzino = function (id) {
    // TODO DRY '\d{6}' è il codice azienda, '\d{4}' l'anno
    var m = /^MovimentoMagazzino_(\d{6})_(\d{4})_(\d+)$/.exec(id);
    if (m) {
      return {
        origine: m[1],
        anno: m[2],
        numero: m[3]
      };
    }
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
    var descrizioniTaglia, descrizioneTaglia,
      desscal = listaModelli[codes.codiceDescrizioneEScalarino];
    if (desscal) {
      descrizioniTaglia = descrizioniTaglie[desscal[1]];
      if (descrizioniTaglia) {
        descrizioneTaglia = descrizioniTaglia[codes.taglia];
        if (descrizioneTaglia) {
          return [null, {
            descrizione: desscal[0],
            scalarino: desscal[1],
            descrizioneTaglia: descrizioneTaglia
          }];
        }
        return ['Codice taglia (' + codes.taglia + ') non valido'];
      }
      return ['Scalarino (' + desscal[1] + ') non trovato'];
    }
    return ['Modello (' + codes.codiceDescrizioneEScalarino + ') non in anagrafe'];
  };

  CODICI.codiceTaglia = function (stagione, modello, codiciTaglie, listaModelli, descrizioneTaglia) {
    var codiciTaglia, scalarino, taglia,
      desscal = listaModelli[stagione + modello];
    if (desscal) {
      scalarino = desscal[1];
      codiciTaglia = codiciTaglie[scalarino];
      if (codiciTaglia) {
        taglia = codiciTaglia[descrizioneTaglia];
        if (taglia) {
          return [null, taglia];
        }
        return ['Descrizione taglia (' + descrizioneTaglia + ') non trovata per scalarino ' + scalarino + ': stagione="' + stagione + '", modello="' + modello + '"'];
      }
      return ['Descrizioni taglia (' + descrizioneTaglia + ') non trovate per scalarino ' + scalarino + ': stagione="' + stagione + '", modello="' + modello + '"'];
    }
    return ['Modello non in anagrafe: stagione="' + stagione + '", modello="' + modello + '"'];
  };


  function padCents(n) {
    return n ? (n.length < 2 ? n + '0' : n) : '00';
  }

  CODICI.parseMoney = function (value) {
    var mp = /^([0-9]+)(?:\.([0-9]{1,2}))?$/.exec(value);
    if (mp) {
      return [null, parseInt(mp[1] + padCents(mp[2]), 10)];
    }
    return ['Invalid amount for money: ' + value];
  };

  CODICI.parseQta = function (value) {
    var mp = /^\s*([1-9][0-9]*)\s*$/.exec(value), qta;
    if (mp) {
      qta = parseInt(mp[1], 10);
      return [null, qta];
    }
    return ['Invalid quantity: ' + value];
  };

  CODICI.colNamesToColIndexes = function (columnNames) {
    var col = {}, i = 0, n = columnNames.length;
    for (; i < n; i += 1) {
      col[columnNames[i]] = i;
    }
    return col;
  };

}());
