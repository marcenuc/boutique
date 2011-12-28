/*global define: false */

define(['app/js/codici'], function (codici) {
  'use strict';
  return {
    getAll: function (couchdb, callback) {
      couchdb.get('_all_docs', {
        startkey: 'Listino_',
        endkey: 'Listino_\ufff0',
        include_docs: true
      }, function (err, resp) {
        if (err) {
          return callback(err);
        }
        // TODO DRY codice copiato da services.js.
        var rows = resp.rows, r, i, ii, codes, listini = {};
        for (i = 0, ii = rows.length; i < ii; i += 1) {
          r = rows[i];
          codes = codici.parseIdListino(r.id);
          if (codes) {
            r.doc.col = codici.colNamesToColIndexes(r.doc.columnNames);
            listini[codes.versione] = r.doc;
          }
        }
        callback(null, listini);
      });
    }
  };
});
