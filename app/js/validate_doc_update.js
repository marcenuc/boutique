function validate_doc_update(doc, oldDoc, userCtx, secObj) {
  'use strict';
  var es = [],
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
    if (typeof v === 'string') {
      if (!v.trim()) {
        error('Required: ' + field);
      }
    } else if (!v) {
      error('Required: ' + field);
    }
  }

  function hasValidAziendaCode() {
    if (!/^\d{6}$/.exec(typeAndCode[2])) {
      error('Invalid azienda code');
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
      case 'Azienda':
        hasValidAziendaCode();
        mustHave('nome');
        break;
      case 'Cliente':
        mustHave('nome');
        break;
      case 'Scalarini':
        mustHave('descrizioni');
        mustHave('posizioni_codici');
        mustHave('posizione_codici');
        break;
      case 'ModelliEScalarini':
        mustHave('lista');
        break;
      case 'Inventari':
        mustHave('data');
        mustHave('inventario');
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
