function validate_doc_update(doc, oldDoc, userCtx, secObj) {
  'use strict';
  var es = [], i, n, rows, r,
    typeAndCode = /^([A-Z][a-zA-Z0-9]+)(?:_([0-9A-Z_]+))?$/.exec(doc._id || '');

  /*
   * secObj is used to know the context of execution:
   * if "undefined", it's running in a browser, otherwise on CouchDB.
   */
  function error(message) {
    if (!secObj) {
      es.push({ message: message });
    } else {
      throw { forbidden: message };
    }
  }

  function mustHave(field) {
    var v = doc[field];
    if (!v || (typeof v === 'string' && !v.trim())) {
      error('Required: ' + field);
    }
  }

  function validDate(year, month, day) {
    var y = parseInt(year, 10), m = parseInt(month, 10), d = parseInt(day, 10);
    return m > 0 && m < 13 && y > 0 && y < 32768 && d > 0 && d <= (new Date(y, m, 0)).getDate();
  }

  function hasValidAziendaCode() {
    if (!/^\d{6}$/.exec(typeAndCode[2])) {
      error('Invalid azienda code');
    }
  }

  function hasValidBollaAs400Code() {
    var m = /^(\d\d)(\d\d)(\d\d)_([1-9]\d*)_([A-Z])_(\d+)$/.exec(typeAndCode[2]);
    if (!m || !validDate(m[1], m[2], m[3])) {
      error('Invalid code');
    }
  }

  if (!userCtx.name) {
    error('Non autorizzato');
  }
  if (oldDoc && oldDoc._id !== doc._id) {
    error('Invalid _id');
  }
  if (!doc._deleted) {
    if (!typeAndCode) {
      error('Invalid type');
    } else {
      switch (typeAndCode[1]) {
      case 'BollaAs400':
        hasValidBollaAs400Code();
        mustHave('codiceCliente');
        mustHave('tipoMagazzino');
        mustHave('codiceMagazzino');
        mustHave('causale');
        rows = doc.rows;
        if (!rows || !rows.length) {
          error('Give a row!');
        } else {
          rows = doc.rows;
          for (i = 0, n = rows.length; i < n; i += 1) {
            r = rows[i];
            if (r.length !== 2) {
              error('Invalid row ' + i + ': ' + JSON.stringify(r));
            }
            if (!r[0] || !/^\d{18}$/.test(r[0])) {
              error('Invalid barcode at row ' + i + ': ' + JSON.stringify(r));
            }
            if (typeof r[1] !== 'number') {
              error('Invalid qta at row ' + i + ': ' + JSON.stringify(r));
            }
          }
        }
        break;
      case 'Azienda':
        hasValidAziendaCode();
        mustHave('nome');
        break;
      case 'Cliente':
        mustHave('nome');
        break;
      case 'Scalarini':
        mustHave('descrizioni');
        mustHave('posizioniCodici');
        mustHave('posizioneCodici');
        break;
      case 'ModelliEScalarini':
        mustHave('lista');
        break;
      case 'Inventari':
        mustHave('data');
        mustHave('inventario');
        break;
      case 'Inventario':
        hasValidAziendaCode();
        break;
      case 'CausaliAs400':
        mustHave('1');
        mustHave('2');
        break;
      default:
        error('Unknown type');
        break;
      }
    }
  }

  if (!secObj) {
    return { errors: es };
  }
}
