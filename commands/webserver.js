/*global console: false, require: false, process: false*/
process.env.LANG = 'C';
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['path', 'connect', 'connect-exec', 'lib/sendFoto', 'lib/servers'], function (path, connect, connectExec, sendFoto, servers) {
  'use strict';
  var images = servers.couchdb.webserver.images,
    cmdExec = connectExec.exec,
    port = servers.couchdb.webserver.port,
    server = connect.createServer()
      .use(connect.logger())
      .use(connect.basicAuth(function (user, pass) {
        // TODO do authentication against couchdb or use a shared users db
        return user && pass;
      }, 'administrator'));

  if (process.env.BOUTIQUE_ENV === 'production') {
    server.use('/app', connect['static'](path.join(process.cwd(), 'build')));
  } else {
    console.log('Serving tests.');
    server
      .use('/app', connect['static'](path.join(process.cwd(), 'app')))
      .use('/test', connect['static'](path.join(process.cwd(), 'test')));
  }

  server.use('/_session', function (req, res) {
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    res.end(JSON.stringify({ userCtx: { name: req.remoteUser } }));
  })
    .use('/img', sendFoto(path.join(images.rootFolder, images.output), { '11': '12', '10': '12', '92': '12' }))
    .use('/as400',
      cmdExec({ 'Content-Type': 'application/json;charset=utf-8' }, process.cwd(), 'java', ['-jar', 'as400-querier.jar']));

  console.log('Listening on port ' + port + '.');
  server.listen(port);
});
