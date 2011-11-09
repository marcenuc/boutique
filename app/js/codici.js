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

  var codici = CODICI;

  codici.LEN_STAGIONE = 3;
  codici.LEN_MODELLO = 5;
  codici.LEN_ARTICOLO = 4;
  codici.LEN_COLORE = 4;
  codici.LEN_TAGLIA = 2;
  codici.LEN_DESCRIZIONE_TAGLIA = 3;
  codici.rexpBarcodeAs400 = /^(\d{3})(\d{5})(\d{4})(\d{4})(\d{2})$/;
  codici.TIPO_MAGAZZINO_CLIENTI = 1;
  codici.TIPO_MAGAZZINO_DISPONIBILE = 2;
  codici.TIPO_MAGAZZINO_NEGOZIO = 3;
  // TODO Questo dovrebbe essere un documento in CouchDB
  codici.CAUSALI_MOVIMENTO_MAGAZZINO = [
    ['VENDITA', -1, 0],
    ['C/VENDITA', 1, 0],
    ['CARICO', 1, 0],
    ['ACQUISTO', 1, 0],
    ['RESO SU ACQUISTO', -1, 0],
    ['TRASFERIMENTO', -1, 1],
    ['RETTIFICA INVENTARIO +', 1, 0],
    ['RETTIFICA INVENTARIO -', -1, 0]
  ];

  codici.setProperty = function (obj) {
    var arg, o = obj, i = 1, n = arguments.length - 2;
    for (; i < n; i += 1) {
      arg = arguments[i];
      if (!o.hasOwnProperty(arg)) {
        o[arg] = {};
      }
      o = o[arg];
    }
    o[arguments[n]] = arguments[n + 1];
  };

  codici.getProperty = function (obj) {
    var arg, o = obj, i = 1, n = arguments.length - 1;
    for (; i < n; i += 1) {
      arg = arguments[i];
      if (!o.hasOwnProperty(arg)) {
        return;
      }
      o = o[arg];
    }
    return o[arguments[n]];
  };

  function doFindProperties(parents, props, obj, filters) {
    var nextFilters, key, filter = filters[0], value;
    if (filters.length > 1) {
      nextFilters = filters.slice(1);
      for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (filter.test(key)) {
            doFindProperties(parents.concat(key), props, obj[key], nextFilters);
          }
        }
      }
    } else {
      for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (filter.test(key)) {
            value = parents.concat(key);
            value.push(obj[key]);
            props.push(value);
          }
        }
      }
    }
  }

  codici.findProperties = function (obj) {
    var props = [];
    doFindProperties([], props, obj, [].slice.call(arguments, 1));
    return props;
  };

  codici.isNumero = function (numero) {
    return numero && (/^\d+$/).test(numero);
  };

  codici.isInt = function (num) {
    return typeof num === 'number' && (/^-?\d+$/).test(num);
  };

  codici.isCode = function (code, len) {
    return typeof code === 'string' && code.length <= len && (/^\d+$/).test(code);
  };

  function dotPad(str, len) {
    var s = str || '', l = len || 2;
    return s + new Array(l + 1 - s.length).join('.');
  }
  codici.dotPad = dotPad;

  function padZero(code, len) {
    if (codici.isCode(code, len)) {
      return new Array(len + 1 - code.length).join('0') + code;
    }
  }
  codici.padZero = padZero;


  codici.typeAndCodeFromId = function (id) {
    return id && /^([A-Z][a-zA-Z0-9]+)(?:_([0-9A-Za-z_]+))?$/.exec(id);
  };

  codici.codiceListino = function (stagione, modello, articolo) {
    var s = padZero(stagione, codici.LEN_STAGIONE),
      m = padZero(modello, codici.LEN_MODELLO),
      a = padZero(articolo, codici.LEN_ARTICOLO);
    if (s && m && a) {
      return s + m + a;
    }
  };

  codici.codiceAs400 = function (stagione, modello, articolo, colore, taglia) {
    var s = padZero(stagione, codici.LEN_STAGIONE),
      m = padZero(modello, codici.LEN_MODELLO),
      a = padZero(articolo, codici.LEN_ARTICOLO),
      c = padZero(colore, codici.LEN_COLORE),
      t = padZero(taglia, codici.LEN_TAGLIA);
    if (s && m && a && c && t) {
      return s + m + a + c + t;
    }
  };

  codici.isYear = function (year, startingFrom) {
    return year && (/^\d{4}$/).test(year) && (!startingFrom || parseInt(year, 10) > startingFrom);
  };

  codici.isDate = function (year, month, day) {
    var y = parseInt(year, 10), m = parseInt(month, 10), d = parseInt(day, 10);
    return m > 0 && m < 13 && y > 0 && y < 32768 && d > 0 && d <= (new Date(y, m, 0)).getDate();
  };

  codici.isYyyyMmDdDate = function (yyyymmdd, validYear) {
    var m = /^(\d{4})(\d\d)(\d\d)$/.exec(yyyymmdd);
    return m && (!validYear || validYear === m[1]) && codici.isDate(m[1], m[2], m[3]);
  };

  codici.newYyyyMmDdDate = function (date) {
    function pad(n) {
      return n < 10 ? '0' + n : n;
    }
    var d = date || new Date();
    return String(d.getUTCFullYear()) + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
  };

  codici.isCodiceAzienda = function (codice) {
    return typeof codice === 'string' && (/^\d{6}$/).test(codice);
  };

  codici.isBarcodeAs400 = function (c) {
    return typeof c === 'string' && codici.rexpBarcodeAs400.test(c);
  };

  codici.isTipoMagazzino = function (tm) {
    return tm && (/^[123]$/).test(tm);
  };

  codici.idAzienda = function (codice) {
    if (codici.isCodiceAzienda(codice)) {
      return ['Azienda', codice].join('_');
    }
  };

  codici.idListino = function (versione) {
    if (codici.isNumero(versione)) {
      return ['Listino', versione].join('_');
    }
  };

  codici.parseIdListino = function (id) {
    // TODO DRY '\d+' è un numero
    var m = /^Listino_(\d+)$/.exec(id);
    if (m) {
      return {
        versione: m[1]
      };
    }
  };

  codici.readListino = function (listini, codiceAzienda, stagione, modello, articolo) {
    var versioneBase, listinoBase, prezziBase,
      listinoAzienda = listini[codiceAzienda],
      prezziAzienda = codici.getProperty(listinoAzienda.prezzi, stagione, modello, articolo);
    if (prezziAzienda) {
      return [listinoAzienda.col, prezziAzienda, codiceAzienda];
    }
    if (listinoAzienda.hasOwnProperty('versioneBase')) {
      versioneBase = listinoAzienda.versioneBase;
      listinoBase = listini[versioneBase];
      prezziBase = codici.getProperty(listinoBase.prezzi, stagione, modello, articolo);
      if (prezziBase) {
        return [listinoBase.col, prezziBase, versioneBase];
      }
    }
  };

  codici.idInventario = function (codiceAzienda, tipoMagazzino) {
    if (codici.isCodiceAzienda(codiceAzienda) && codici.isTipoMagazzino(tipoMagazzino)) {
      return ['Inventario', codiceAzienda, tipoMagazzino].join('_');
    }
  };

  codici.parseIdInventario = function (id) {
    // TODO DRY '\d{6}' è il codice azienda, '[123]' il tipoMagazzino
    var m = /^Inventario_(\d{6})_([123])$/.exec(id);
    if (m) {
      return {
        codiceAzienda: m[1],
        tipoMagazzino: parseInt(m[2], 10)
      };
    }
  };

  codici.idMovimentoMagazzino = function (codiceAzienda, anno, numeroBolla) {
    if (codici.isCodiceAzienda(codiceAzienda) && codici.isYear(anno) && codici.isNumero(numeroBolla)) {
      return ['MovimentoMagazzino', codiceAzienda, anno, numeroBolla].join('_');
    }
  };

  codici.parseIdMovimentoMagazzino = function (id) {
    // TODO DRY '\d{6}' è il codice azienda, '\d{4}' l'anno, '\d+' il numero
    var m = /^MovimentoMagazzino_(\d{6})_(\d{4})_(\d+)$/.exec(id);
    if (m) {
      return {
        origine: m[1],
        anno: m[2],
        numero: m[3]
      };
    }
  };

  codici.idBollaAs400 = function (data, numero, enteNumerazione, codiceNumerazione) {
    if (codici.isYyyyMmDdDate(data) && codici.isNumero(numero) && (/^[A-Z]$/).test(enteNumerazione) && codici.isCode(codiceNumerazione, 2)) {
      return ['BollaAs400', data, numero, enteNumerazione, codiceNumerazione].join('_');
    }
  };

  codici.parseIdBollaAs400 = function (id) {
    // TODO DRY '\d{8}' è la data, '\d+' il numero, '[A-Z]' l'ente numerazione, '\d+' il codice numerazione
    var m = /^BollaAs400_(\d{8})_(\d+)_([A-Z])_(\d+)$/.exec(id);
    if (m) {
      return {
        data: m[1],
        numero: m[2],
        enteNumerazione: m[3],
        codiceNumerazione: m[4]
      };
    }
  };

  codici.parseBarcodeAs400 = function (code) {
    var m = codici.rexpBarcodeAs400.exec(code);
    if (m) {
      return {
        stagione: m[1],
        modello: m[2],
        articolo: m[3],
        colore: m[4],
        taglia: m[5],
        codiceDescrizioneEScalarino: code.substring(0, 8)
      };
    }
  };

  codici.descrizioniModello = function (stagione, modello, taglia, descrizioniTaglie, listaModelli) {
    var descrizioniTaglia, descrizioneTaglia,
      desscal = listaModelli[stagione + modello];
    if (desscal) {
      descrizioniTaglia = descrizioniTaglie[desscal[1]];
      if (descrizioniTaglia) {
        descrizioneTaglia = descrizioniTaglia[taglia];
        if (descrizioneTaglia) {
          return [null, {
            descrizione: desscal[0],
            scalarino: desscal[1],
            descrizioneTaglia: descrizioneTaglia
          }];
        }
        return ['Codice taglia (' + taglia + ') non valido'];
      }
      return ['Scalarino (' + desscal[1] + ') non trovato'];
    }
    return ['Modello (' + stagione + ' ' + modello + ') non in anagrafe'];
  };

  codici.codiceTaglia = function (stagione, modello, codiciTaglie, listaModelli, descrizioneTaglia) {
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

  codici.parseMoney = function (value) {
    var mp = /^([0-9]+)(?:\.([0-9]{1,2}))?$/.exec(value);
    if (mp) {
      return [null, parseInt(mp[1] + padCents(mp[2]), 10)];
    }
    return ['Invalid amount for money: ' + value];
  };

  codici.formatMoney = function (v) {
    return typeof v === 'undefined' ? '' : String(v / 100).replace('.', ',');
  };

  codici.parseQta = function (value) {
    var mp = /^\s*([1-9][0-9]*)\s*$/.exec(value), qta;
    if (mp) {
      qta = parseInt(mp[1], 10);
      return [null, qta];
    }
    return ['Invalid quantity: ' + value];
  };

  codici.colNamesToColIndexes = function (columnNames) {
    var col = {}, i = 0, n = columnNames.length;
    for (; i < n; i += 1) {
      col[columnNames[i]] = i;
    }
    return col;
  };

}());
