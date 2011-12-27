/*global console: false, require: false, process: false*/
process.env.LANG = 'C';
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require, paths: { 'dbconfig': 'app/js/config', 'views/lib/codici': 'app/js/codici' } });

/*
 * Monitor CouchDB for MovimentoMagazzino to keep Inventario updated
 */
requirejs(['follow', 'lib/inventario', 'lib/servers', 'dbconfig'], function (follow, inventario, servers, dbconfig) {
  'use strict';
  var dbUrl = servers.couchdb.authUrl(),
    feed = new follow.Feed({
      db: dbUrl + '/' + dbconfig.db,
      since: 'now',
      inactivity_ms: 86400 * 1000,
      filter: function (doc) {
        if (doc.accodato && !doc.WORK_IN_PROGRESS) {
          var ids = doc._id.split('_', 1);
          return ids[0] === 'MovimentoMagazzino';
        }
      }
    }),
    workInProgress = false;

  function done() {
    workInProgress = false;
  }

  feed.on('change', function (change) {
    console.dir(change);
    if (!workInProgress) {
      workInProgress = true;
      inventario.update(done);
    }
  });

  feed.on('error', function (err) {
    console.error('Since Follow always retries on errors, this must be serious:');
    console.dir(err);
    throw new Error(err);
  });

  console.log('Following ' + servers.couchdb.url() + '/' + dbconfig.db);
  feed.follow();
});
