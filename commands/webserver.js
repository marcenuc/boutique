/*global console:false, require:false, process:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['path', 'connect', 'http', 'connect-exec', 'lib/sendFoto', 'lib/servers'], function (path, connect, http, connectExec, sendFoto, servers) {
  'use strict';
  var images = servers.couchdb.webserver.images,
    cmdExec = connectExec.exec,
    port = servers.couchdb.webserver.port,
    isProduction = process.env.BOUTIQUE_ENV === 'production',
    app = connect()
      .use(connect.logger(isProduction ? 'default' : 'dev'))
      .use(connect.basicAuth(function (user, pass) {
        // TODO do authentication against couchdb or use a shared users db
        return user && pass;
      }, servers.couchdb.realm))
      .use('/app', connect['static'](path.join(process.cwd(), isProduction ? 'build' : 'app')))
      .use('/_session', function (req, res) {
        res.setHeader('Content-Type', 'application/json;charset=utf-8');
        res.end(JSON.stringify({ userCtx: { name: req.user } }));
      })
      .use('/tessuto', connect['static'](path.join(images.rootFolder, images.output, 'tessuti')))
      .use('/catalogo', connect['static'](path.join(images.rootFolder, images.output, 'catalogo')))
      .use('/foto', sendFoto(path.join(images.rootFolder, images.output, 'foto'), { '11': '12', '10': '12', '92': '12' }))
      .use('/as400', cmdExec({ 'Content-Type': 'application/json;charset=utf-8' }, process.cwd(), 'java', ['-jar', 'as400-querier.jar']))
      .use('/OLD_APP/app', connect['static'](path.join(process.cwd(), 'OLD_APP/app')));

  if (!isProduction) {
    console.log('Serving tests.');
    app
      .use('/test', connect['static'](path.join(process.cwd(), 'test')))
      .use('/test-resetdb',
        cmdExec({ 'Content-Type': 'text/plain;charset=utf-8' }, process.cwd(), './run', ['push', 'test/docs', 'Yes, delete EVERYTHING! I am NOT joking!']));
  }

  console.log('Listening on port ' + port + '.');
  http.createServer(app).listen(port);
});
