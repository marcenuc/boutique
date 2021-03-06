/*global angular:false*/
angular.module('app.shared', []).factory('codici', function () {
  'use strict';
  var codici = {};

  // ### BEGIN ###
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
  codici.TIPI_AZIENDA = ['MAGAZZINO', 'NEGOZIO'];
  // TODO Questo dovrebbe essere un documento in CouchDB
  codici.CAUSALI_MOVIMENTO_MAGAZZINO = [
    { descrizione: 'VENDITA', segno: -1, gruppo: 'A', causale2: 1},
    { descrizione: 'ACQUISTO', segno: 1, gruppo: 'B', causale2: 0},
    { descrizione: 'RESO SU VENDITA', segno: 1, gruppo: 'A', causale2: 3},
    { descrizione: 'RESO SU ACQUISTO', segno: -1, gruppo: 'B', causale2: 2},
    { descrizione: 'C/VENDITA', segno: -1, gruppo: 'A', causale2: 5},
    { descrizione: 'C/ACQUISTO', segno: 1, gruppo: 'B', causale2: 4},
    { descrizione: 'RESO SU C/VENDITA', segno: 1, gruppo: 'A', causale2: 7},
    { descrizione: 'RESO SU C/ACQUISTO', segno: -1, gruppo: 'B', causale2: 6},
    { descrizione: 'SCARICO PER CAMBIO MAGAZZINO', segno: -1, gruppo: 'A', causale2: 9},
    { descrizione: 'CARICO PER CAMBIO MAGAZZINO', segno: 1, gruppo: 'B', causale2: 8},
    { descrizione: 'VENDITA A CLIENTI', segno: -1, gruppo: 'C'},
    { descrizione: 'RETTIFICA INVENTARIO -', segno: -1, gruppo: 'D'},
    { descrizione: 'RETTIFICA INVENTARIO +', segno: 1, gruppo: 'D'}
  ];
  codici.COLUMN_NAMES = {
    MovimentoMagazzino: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
    Listino: ['costo', 'prezzo1', 'prezzo2', 'offerta'],
    Giacenze: ['stagione', 'modello', 'articolo', 'colore', 'codiceAzienda', 'inProduzione', 'tipoMagazzino', 'giacenze']
  };

  codici.splitId = function (id) {
    return id.split('_');
  };

  codici.findCausaleMovimentoMagazzino = function (descrizione, segno) {
    var c, i, ii, causali = codici.CAUSALI_MOVIMENTO_MAGAZZINO;
    for (i = 0, ii = causali.length; i < ii; i += 1) {
      c = causali[i];
      if (c.descrizione === descrizione &&
          (typeof segno === 'undefined' || segno === c.segno)) {
        return c;
      }
    }
  };

  codici.setProperty = function (obj) {
    var arg, i, ii, o = obj;
    for (i = 1, ii = arguments.length - 2; i < ii; i += 1) {
      arg = arguments[i];
      if (!o.hasOwnProperty(arg)) {
        o[arg] = {};
      }
      o = o[arg];
    }
    o[arguments[ii]] = arguments[ii + 1];
  };

  codici.getProperty = function (obj) {
    var arg, i, ii, o = obj;
    for (i = 1, ii = arguments.length - 1; i < ii; i += 1) {
      arg = arguments[i];
      if (!o.hasOwnProperty(arg)) {
        return undefined;
      }
      o = o[arg];
    }
    return o[arguments[ii]];
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

  codici.isQta = function (qta) {
    return codici.isInt(qta) && qta >= 0;
  };

  codici.isScalarino = function (scalarino) {
    return codici.isInt(scalarino) && scalarino > 0 && scalarino < 10;
  };

  codici.isTrimmedString = function (str, maxLength) {
    if (typeof str === 'string') {
      var s = str.trim();
      return s === str && s.length > 0 && s.length <= maxLength;
    }
    return false;
  };

  codici.isDescrizioneTaglia = function (descrizioneTaglia) {
    return codici.isTrimmedString(descrizioneTaglia, 3);
  };

  codici.isDescrizioneArticolo = function (descrizione) {
    return codici.isTrimmedString(descrizione, 30);
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
    //FIXME inject Date for easy testing
    var d = date || new Date();
    return String(d.getUTCFullYear()) + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
  };

  codici.isCodiceAzienda = function (codice) {
    return typeof codice === 'string' && (/^\d{6}$/).test(codice);
  };

  codici.isGruppoNumerazione = function (gruppo) {
    return typeof gruppo === 'string' && (/^[A-Z]$/).test(gruppo);
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

  codici.parseIdAzienda = function (id) {
    //TODO DRY
    var m = /^Azienda_(\d{6})$/.exec(id);
    if (m) {
      return { codice: m[1] };
    }
  };

  codici.parseIdFoto = function (id) {
    var m = /^Foto_(.+)$/.exec(id);
    if (m) return m[1];
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
      return { versione: m[1] };
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

  codici.isAzienda = function (ids) {
    return ids[0] === 'Azienda' && codici.isCodiceAzienda(ids[1]);
  };

  codici.isMovimentoMagazzino = function (ids) {
    return ids[0] === 'MovimentoMagazzino' && codici.isCodiceAzienda(ids[1]) && codici.isYear(ids[2]) &&
      codici.isGruppoNumerazione(ids[3]) && codici.isNumero(ids[4]);
  };

  codici.idMovimentoMagazzino = function (codiceAzienda, anno, gruppoNumerazione, numero) {
    var ids = ['MovimentoMagazzino', codiceAzienda, anno, gruppoNumerazione, numero];
    if (codici.isMovimentoMagazzino(ids)) {
      return ids.join('_');
    }
  };

  codici.parseIdMovimentoMagazzino = function (id) {
    var ids = codici.splitId(id);
    if (codici.isMovimentoMagazzino(ids)) {
      return {
        magazzino1: ids[1],
        anno: ids[2],
        gruppo: ids[3],
        numero: parseInt(ids[4], 10)
      };
    }
  };

  codici.infoCausale = function (causale) {
    var c2, info = {
      gruppo: causale.gruppo,
      causale1: [causale.descrizione, causale.segno]
    };
    if (causale.hasOwnProperty('causale2')) {
      c2 = codici.CAUSALI_MOVIMENTO_MAGAZZINO[causale.causale2];
      info.causale2 = [c2.descrizione, c2.segno];
    }
    return info;
  };

  codici.newMovimentoMagazzino = function (magazzino1, data, numero, causale, magazzino2) {
    //TODO DRY 6 is magic number
    var infoCausale = codici.infoCausale(causale),
      id = codici.idMovimentoMagazzino(magazzino1.substring(0, 6), data.substring(0, 4), infoCausale.gruppo, numero),
      doc = {
        _id: id,
        data: data,
        causale1: infoCausale.causale1,
        columnNames: codici.COLUMN_NAMES.MovimentoMagazzino,
        rows: []
      };
    if (magazzino1[6] === '_') {
      doc.esterno1 = true;
    }
    if (infoCausale.causale2) {
      doc.causale2 = infoCausale.causale2;
      if (magazzino2) {
        if (magazzino2[6] === '_') {
          doc.esterno2 = true;
        }
        doc.magazzino2 = magazzino2.substring(0, 6);
      }
    }
    return doc;
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
        taglia: m[5]
      };
    }
  };

  codici.descrizioneModello = function (stagione, modello, listaModelli) {
    var desscal = listaModelli[stagione + modello];
    if (desscal) {
      return desscal[0];
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
        return ['Codice taglia "' + taglia + '" non valido per scalarino "' + desscal[1] + '": ' + [stagione, modello].join(' ')];
      }
      return ['Scalarino "' + desscal[1] + '" non valido per: ' + [stagione, modello].join(' ')];
    }
    return ['Modello non in anagrafe: ' + [stagione, modello].join(' ')];
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
        return ['Descrizione taglia "' + descrizioneTaglia + '" non trovata per scalarino ' + scalarino + ': ' + [stagione, modello].join(' ')];
      }
      return ['Descrizioni taglia non trovate per scalarino "' + scalarino + '": ' + [stagione, modello].join(' ')];
    }
    return ['Modello non in anagrafe: ' + [stagione, modello].join(' ')];
  };


  function padCents(n) {
    return n ? (n.length < 2 ? n + '0' : n) : '00';
  }

  codici.parseMoney = function (value) {
    var mp = /^([0-9]+)(?:[\.,]([0-9]{1,2}))?$/.exec(value);
    if (mp) {
      return parseInt(mp[1] + padCents(mp[2]), 10);
    }
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
    var col = {}, i, ii;
    for (i = 0, ii = columnNames.length; i < ii; i += 1) {
      col[columnNames[i]] = i;
    }
    return col;
  };

  codici.toSearchableListini = function (viewResponse) {
    var rows = viewResponse.rows, doc, i, ii, codes, listini = {};
    for (i = 0, ii = rows.length; i < ii; i += 1) {
      doc = rows[i].doc;
      codes = codici.parseIdListino(doc._id);
      if (codes) {
        doc.col = codici.colNamesToColIndexes(doc.columnNames);
        listini[codes.versione] = doc;
      }
    }
    return listini;
  };

  codici.typeOf = function(value) {
    return Object.prototype.toString.call(value).slice(8, -1);
  };

  codici.hasExternalWarehouse = function (azienda) {
    return azienda.tipo !== 'NEGOZIO';
  };
  // ### END ###

  return codici;
});
