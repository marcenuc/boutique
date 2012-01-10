/*global require:false, process:false, console:false*/
process.env.LANG = 'C';
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require, paths: { 'dbconfig': 'app/js/config' } });

requirejs(['util', 'nano', 'lib/couchutil', 'lib/servers', 'dbconfig'], function (util, nano, couchutil, servers, dbconfig) {
  'use strict';
  var source = nano(process.argv[2]).use(process.argv[3]),
    target = nano(servers.couchdb.authUrl()).use(dbconfig.db);

  function copyDocs(baseId) {
    source.get('_all_docs', {
      startkey: baseId,
      endkey: baseId + '\ufff0',
      include_docs: true
    }, function (err, docs) {
      if (err) {
        throw new Error(util.inspect(err));
      }
      var i, ii, doc, rows = docs.rows;

      function docSaved(err, resp) {
        if (err) {
          throw new Error(util.inspect(err));
        }
        if (resp) {
          console.dir(resp);
        }
      }

      for (i = 0, ii = rows.length; i < ii; i += 1) {
        doc = rows[i].doc;
        couchutil.saveIfChanged2(target, doc, docSaved);
      }
    });
  }
  copyDocs('Azienda_');
  copyDocs('Listino_');
  copyDocs('CausaliAs400');
  copyDocs('Giacenze');
  copyDocs('ModelliEScalarini');
  copyDocs('CausaliAs400');
  copyDocs('TaglieScalarini');
});
