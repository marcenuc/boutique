function validate_doc_update(doc, oldDoc, userCtx, secObj) {
  'use strict';
  var es = [],
    ids = /^([a-z][a-z_]*[a-z])(?:_([0-9]+))?$/.exec(doc._id);

  /*
   * secObj is used by to know the context of execution:
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
    if (!/^\d{6}$/.exec(ids[2])) {
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
    if (!ids || !doc._id) {
      error('Invalid type');
    } else {
      switch (ids[1]) {
      case 'azienda':
        hasValidAziendaCode();
        mustHave('nome');
        break;
      case 'cliente':
        mustHave('nome');
        break;
      case 'scalarini':
        mustHave('descrizioni');
        mustHave('posizioni_codici');
        mustHave('posizione_codici');
        break;
      case 'modelli_e_scalarini':
        mustHave('lista');
        break;
      case 'inventari':
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
