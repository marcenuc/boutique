/*jslint node: true */
/*jshint node: true */
/*global desc: false, task: false, fail: false, complete: false, namespace: false,
         setTimeout: false, console: false */
/*
 * Example "server.js" configuration file:
 *
exports.couchdb = {
  protocol: 'http',
  host: 'localhost',
  port: 12000,
  admin: {
    username: 'user',
    password: 'pass'
  },
  webserver: {
    route: 'boutique_app',
    host: 'localhost',
    port: 8000
  }
};
 */
var requirejs = require('requirejs'),
  exec = require('./lib/taskutil').exec,
  util = require('util'),
  path = require('path'),
  servers = require('./servers'),
  cradle = require('cradle');

requirejs.config({
  baseUrl: __dirname,
  nodeRequire: require
});

function newConnection() {
  'use strict';
  return new (cradle.Connection)(servers.couchdb.host, servers.couchdb.port, {
    auth: {
      username: servers.couchdb.admin.username,
      password: servers.couchdb.admin.password
    }
  });
}

function console_exec(command, args, success) {
  'use strict';
  exec(command, args, function (err, stdout, stderr) {
    if (stdout) {
      process.stdout.write(stdout);
    }
    if (stderr) {
      process.stderr.write(command + ':' + stderr);
    }
    if (err) {
      throw err;
    } else if (err === 0 && success) {
      success();
    }
  });
}


namespace('test', function () {
  'use strict';
  var baseOpts = ['-jar', __dirname + '/test/lib/jstestdriver/JsTestDriver.jar', '--basePath', __dirname, '--config'],
    unitOpts = baseOpts.concat(__dirname + '/config/jsTestDriver.conf'),
    e2eOpts = baseOpts.concat(__dirname + '/config/jsTestDriver-scenario.conf');

  desc('Run server for unit tests');
  task('e2e-server', function () {
    console_exec('java', e2eOpts.concat('--port', '9877', '--browserTimeout', '20000'));
  });

  desc('Run server for unit tests');
  task('unit-server', function () {
    console_exec('java', unitOpts.concat('--port', '9876', '--browserTimeout', '20000'));
    setTimeout(function () {
      console_exec('chromium-browser', ['--incognito', 'http://localhost:9876/capture?strict']);
    }, 1500);
  });

  desc('Run unit tests');
  task('unit', function () {
    console_exec('java', unitOpts.concat('--tests', 'all'));
  });

  desc('Run e2e tests');
  task('e2e', function () {
    console_exec('firefox', [servers.couchdb.webRouteUrl() + '/test/e2e/runner.html']);
  });

  desc('Run server side tests');
  task('srv', function () {
    console_exec('./node_modules/.bin/jasmine-node', ['test-srv']);
  });
});


desc('Check coding style');
task('lint', function () {
  'use strict';
  var glob = require('glob'),
    patterns = arguments.length > 0 ?
      [].slice.apply(arguments) :
      ['*.js', 'lib/*.js', 'config/*.js', 'test/*/*.js', 'test-srv/*/*.js', 'app/js/*.js'];

  function lint(fileName) {
    console_exec('jshint', [fileName, '--config', '.jshintrc'], function () {
      console_exec('jslint', ['--indent=2', '--es5', '--nomen', fileName]);
    });
  }

  patterns.forEach(function (globPattern) {
    glob.glob(globPattern, function (err, fileNames) {
      if (err) {
        fail(util.inspect(err));
      }
      fileNames.forEach(lint);
    });
  });
});


namespace('couchdb', function () {
  'use strict';

  desc('Load couchapp');
  task('push', function () {
    var couchdbs = require('./couchdbs'),
      connection = newConnection();

    function createDocs(db, docs) {
      Object.keys(docs).forEach(function (docId) {
        db.save(docId, docs[docId], function (err, res) {
          if (err) {
            fail('Error creating ' + docId + ': (' + util.inspect(err) + ') ' + res);
          }
        });
      });
    }

    Object.keys(couchdbs).forEach(function (dbName) {
      var docs = couchdbs[dbName],
        db = connection.database(dbName);

      db.exists(function (err, exists) {
        if (err) {
          fail('Error querying ' + dbName + ': ' + err);
        }
        if (!exists) {
          db.create(function () {
            createDocs(db, docs);
          });
        } else {
          createDocs(db, docs);
        }
      });
    });
  });


  function couchdbConfig(configPath, configData, cbDone) {
    var http = require('http'),
      options = {
        host: servers.couchdb.host,
        port: servers.couchdb.port,
        path: configPath,
        method: 'PUT',
        headers: {
          host: servers.couchdb.host + ':' + servers.couchdb.port,
          accept: 'application/json',
          'content-type': 'application/json;charset=utf-8'
        }
      },
      req;
    if (typeof configPath === 'string') {
      options.path = configPath;
      options.headers.authorization = 'Basic ' + new Buffer(servers.couchdb.admin.username + ':' + servers.couchdb.admin.password).toString('base64');
    } else {
      options.path = configPath.path;
    }
    req = http.request(options, function (res) {
      res.on('end', function () {
        cbDone(res.statusCode !== 200 ? res.statusCode : null);
      });
    });
    req.on('error', function (e) {
      cbDone(e.message);
    });
    req.write(JSON.stringify(configData));
    req.end();
  }

  function couchdbSetupServerAdmin(cbDone) {
    var config = new (cradle.Connection)(servers.couchdb.host, servers.couchdb.port).database('_config');

    function creaAdmin() {
      var cdb = servers.couchdb,
        username = cdb.admin.username,
        password = cdb.admin.password;

      couchdbConfig({
        path: '/_config/admins/' + username
      }, password, function (configErr) {
        if (configErr) {
          cbDone(configErr);
          return;
        }
        var users = new (cradle.Connection)(cdb.host, cdb.port, {
          auth: {
            username: username,
            password: password
          }
        }).database('_users');
        users.save('org.couchdb.user:' + username, {
          name: username,
          type: 'user',
          roles: []
        }, function (err) {
          cbDone(err);
        });
      });
    }

    config.get('admins', function (checkErr, doc) {
      if (checkErr) {
        cbDone(checkErr.error === 'unauthorized' ? null : checkErr);
        return;
      }
      if (Object.keys(doc).length) {
        cbDone(null);
      } else {
        creaAdmin();
      }
    });
  }

  desc('Setup CouchDB.');
  task('setup', function () {
    couchdbSetupServerAdmin(function (adminErr) {
      if (adminErr) {
        fail(util.inspect(adminErr));
      }

      couchdbConfig(
        '/_config/httpd_global_handlers/' + servers.couchdb.webserver.route,
        '{couch_httpd_proxy, handle_proxy_req, <<"' + servers.couchdb.webserverUrl() + '">>}',
        function (err) {
          if (err) {
            fail(util.inspect(err));
          } else {
            complete();
          }
        }
      );
    });
  }, true);


  desc('Aggiorna dati da As400');
  task('sync-as400', function () {
    var as400 = require('./lib/as400'),
      db = newConnection().database('boutique_db');
    function updateReporter(err, warns, res) {
      if (err) {
        fail(util.inspect(err));
      }
      if (warns && warns.length) {
        console.warn(warns.join('\n'));
      }
      if (res) {
        console.log(util.inspect(res));
      }
    }
    as400.updateCausaliAs400(db, updateReporter);
    as400.updateModelliEScalariniAs400(db, updateReporter);
    as400.updateAziendeAs400(db, updateReporter);
  });
});

desc('Produce un file di testo con la stampa delle etichette');
task('stampaEtichette', function (docId) {
  'use strict';
  requirejs(['lib/etichette'], function (etichette) {
    var db = newConnection().database('boutique_db');
    db.get(docId, function (err, doc) {
      if (err) {
        return fail(err);
      }
      etichette.toTxt(doc, function (err2, txt) {
        if (err2) {
          return fail(err2);
        }
        process.stdout.write(txt);
      });
    });
  });
});

namespace('webserver', function () {
  'use strict';

  desc('Start Web server');
  task('start', function (environment) {
    var connect = require('connect'),
      cmdExec = require('connect-exec').exec,
      server = connect.createServer()
        .use(connect.logger())
        .use('/as400',
          cmdExec('application/json', __dirname, 'java', ['-jar', 'as400-querier.jar']))
        .use('/app', connect['static'](path.join(__dirname, 'app')));

    if (environment === 'test') {
      console.log('Serving tests.');
      server.use('/test', connect['static'](path.join(__dirname, 'test')));
    }

    server.listen(servers.couchdb.webserver.port);
  });
});
