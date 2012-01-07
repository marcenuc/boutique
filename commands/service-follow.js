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
      include_docs: true,
      since: 'now',
      inactivity_ms: 86400 * 1000,
      filter: function (doc) {
        if (!doc.WORK_IN_PROGRESS && (doc.accodato || doc.verificato)) {
          var ids = doc._id.split('_', 1);
          return ids[0] === 'MovimentoMagazzino';
        }
      }
    }),
    workInProgress = false;

  function done(err) {
    if (err) {
      console.dir(err);
    }
  }

  function doneWork(err) {
    workInProgress = false;
    done(err);
  }

  feed.on('change', function (change) {
    console.dir(change);
    if (change.doc.accodato) {
      inventario.verifica(change.doc, done);
    } else if (!workInProgress) {
      workInProgress = true;
      inventario.update(doneWork);
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
