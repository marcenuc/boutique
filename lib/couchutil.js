/*global define: false */

define(['underscore'], function (_) {
  'use strict';

  return {

    saveIfChanged: function (err, couchdb, warnsAndDoc, callback) {
      if (err) {
        return callback(err);
      }
      var doc = warnsAndDoc[1];
      // TODO Here I use `[id]` to disable caching and make couchutil.saveIfChanged() work.
      // It would be nice to explore the use of `nano` which does not have caching and is more simple.
      couchdb.get([doc._id], function (errGet, oldDocs) {
        if (errGet) {
          return callback(errGet);
        }
        var row = oldDocs.rows[0], oldDoc = row.doc;
        if (row.error && row.error !== 'not_found') {
          return callback(errGet);
        }
        if (oldDoc) {
          doc._rev = oldDoc._rev;
        }

        if (_.isEqual(doc, oldDoc)) {
          callback(null, warnsAndDoc[0]);
        } else {
          couchdb.save(doc._id, doc, function (errSave, res) {
            callback(errSave, warnsAndDoc[0], res);
          });
        }
      });
    }

  };
});