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
        var oldDoc = oldDocs.rows[0].doc;
        if (errGet) {
          if (errGet.headers && errGet.headers.status !== 404) {
            return callback(errGet);
          }
        } else {
          doc._rev = oldDoc._rev;
        }

        if (errGet || !_.isEqual(doc, oldDoc)) {
          couchdb.save(doc._id, doc, function (errSave, res) {
            callback(errSave, warnsAndDoc[0], res);
          });
        } else {
          callback(null, warnsAndDoc[0]);
        }
      });
    }

  };
});