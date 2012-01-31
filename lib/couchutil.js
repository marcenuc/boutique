/*global define:false*/
define(['underscore'], function (_) {
  'use strict';
  return {
    // TODO WRITE TESTS!!!
    saveIfChanged: function (err, couchdb, warnsAndDoc, callback) {
      if (err) {
        return callback(err);
      }
      var doc = warnsAndDoc[1];
      couchdb.get(doc._id, function (errGet, oldDoc) {
        if (errGet && errGet['status-code'] !== 404) {
          return callback(errGet);
        }
        if (oldDoc) {
          doc._rev = oldDoc._rev;
        }
        if (_.isEqual(doc, oldDoc)) {
          return callback(null, warnsAndDoc);
        }
        couchdb.insert(doc, doc._id, function (errSave, res) {
          callback(errSave, warnsAndDoc, res);
        });
      });
    },

    saveIfChanged2: function (couchdb, doc, callback) {
      couchdb.get(doc._id, function (err, oldDoc) {
        if (err && err['status-code'] !== 404) {
          return callback(err);
        }
        if (oldDoc) {
          doc._rev = oldDoc._rev;
        }
        if (_.isEqual(doc, oldDoc)) {
          return callback(null);
        }
        couchdb.insert(doc, doc._id, callback);
      });
    },

    setDocRev: function (couchdb, doc, callback) {
      couchdb.get(doc._id, function (err, oldDoc) {
        if (err && err['status-code'] !== 404) {
          return callback(err);
        }
        if (oldDoc) {
          doc._rev = oldDoc._rev;
        }
        if (_.isEqual(doc, oldDoc)) {
          return callback(null, null);
        }
        callback(null, doc);
      });
    }
  };
});
