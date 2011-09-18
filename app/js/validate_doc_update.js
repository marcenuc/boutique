function validate_doc_update(doc, oldDoc, userCtx) {
  'use strict';
  var es = [],
    ids = /^([a-z]+)_([0-9]+)$/.exec(doc._id);

  function error(message) {
    if (userCtx.browser) {
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
  } else if (!ids) {
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
    default:
      error('Invalid type');
      break;
    }
  }
  
  if (userCtx.browser) {
    return { errors: es };
  }
}
