/*global console: false, require: false, process: false*/
process.env.LANG = 'C';
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require, paths: { 'dbconfig': 'app/js/config' } });

requirejs(['util', 'nano', 'lib/servers', 'lib/as400', 'dbconfig'], function (util, nano, servers, as400, dbconfig) {
  'use strict';

  function updateReporter(err, warnsAndDoc, res, callback) {
    if (err) {
      throw new Error(util.inspect(err));
    }
    if (warnsAndDoc && warnsAndDoc[0].length) {
      console.warn(warnsAndDoc[0].join('\n'));
    }
    if (res) {
      console.dir(res);
    }
    if (callback) {
      callback();
    }
  }

  var db = nano(servers.couchdb.authUrl()).use(dbconfig.db);
  // TODO Make this code smarter.
  as400.updateCausaliAs400(db, function (err1, warnsAndDoc1, res1) {
    updateReporter(err1, warnsAndDoc1, res1, function () {
      as400.updateTaglieScalariniAs400(db, function (err2, warnsAndDoc2, res2) {
        updateReporter(err2, warnsAndDoc2, res2, function () {
          as400.updateModelliEScalariniAs400(db, function (err3, warnsAndDoc3, res3) {
            updateReporter(err3, warnsAndDoc3, res3, function () {
              as400.updateAziendeAs400(db, function (err4, warnsAndDoc4, res4) {
                updateReporter(err4, warnsAndDoc4, res4, function () {
                  as400.updateGiacenze(db, updateReporter);
                });
              });
            });
          });
        });
      });
    });
  });
});
