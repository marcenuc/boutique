/*global define: false */

define(['app/js/codici'], function (codici) {
  'use strict';
  return {
    getAll: function (couchdb, callback) {
      couchdb.get('_all_docs', {
        startkey: 'Listino_',
        endkey: 'Listino_\ufff0',
        include_docs: true
      }, function (err, response) {
        if (err) {
          return callback(err);
        }
        var listini = codici.toSearchableListini(response);
        callback(null, listini);
      });
    }
  };
});
