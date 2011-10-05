/*jslint node: true */
/*jshint node: true */
/*global desc: false, task: false, fail: false, complete: false, namespace: false,
         setTimeout: false, console: false */

var requirejs = require('requirejs');
requirejs.config({
  baseUrl: __dirname,
  nodeRequire: require
});
process.env.LANG = 'C';

requirejs(['require', 'lib/taskutil', 'util', 'path', 'cradle', 'lib/servers'], function (require, taskutil, util, path, cradle, servers) {
  'use strict';

  function newConnection() {
    return new (cradle.Connection)(servers.couchdb.host, servers.couchdb.port, {
      auth: {
        username: servers.couchdb.admin.username,
        password: servers.couchdb.admin.password
      }
    });
  }

  function newBoutiqueDbConnection() {
    return newConnection().database('boutique_db');
  }

  function console_exec(command, args, success) {
    taskutil.exec(command, args, function (err, stdout, stderr) {
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
    var baseOpts = ['-jar', 'test/lib/jstestdriver/JsTestDriver.jar', '--basePath', __dirname, '--config'],
      unitOpts = baseOpts.concat('config/jsTestDriver.conf'),
      e2eOpts = baseOpts.concat('config/jsTestDriver-scenario.conf');

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


  function xlsToCsv(xlsName, csvName, callback) {
    taskutil.execBuffered('ssconvert', ['-T', 'Gnumeric_stf:stf_csv', '-S', xlsName, csvName], callback);
  }

  namespace('couchdb', function () {

    desc('Load couchapp');
    task('push', function (docsFolder) {
      var couchdbs = requirejs('couchdbs'),
        fs = requirejs('fs'),
        connection = newConnection();

      function createDocs(db, docs) {
        Object.keys(docs).forEach(function (docId) {
          db.save(docId, docs[docId], function (err, res) {
            if (err) {
              fail('Error creating ' + docId + ': (' + util.inspect(err) + ') ' + res);
            }
            console.log('Pushed "' + docId + '"');
          });
        });
      }

      Object.keys(couchdbs).forEach(function (dbName) {
        var docs = couchdbs[dbName],
          db = connection.database(dbName);

        if (docsFolder) {
          fs.readdirSync(docsFolder).forEach(function (f) {
            var m = f.match(/^([A-Za-z0-9_]+)\.json$/);
            if (m) {
              docs[m[1]] = JSON.parse(fs.readFileSync(path.join(docsFolder, f), 'utf8'));
            }
          });
        }
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
      var as400 = requirejs('lib/as400'),
        db = newBoutiqueDbConnection();
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

    desc('Carica listino');
    task('carica-listino', function (versione, data) {
      requirejs(['lib/listino'], function (listino) {
        var baseName = 'tmp/listino_' + versione + '_' + data,
          xlsName = baseName + '.xlsx',
          csvName = baseName + '.csv';
        xlsToCsv(xlsName, csvName, function (errConvert, out) {
          if (errConvert) {
            fail(util.inspect(errConvert));
          }
          if (out) {
            console.log(out);
          }
          var db = newBoutiqueDbConnection();
          listino.loadFromCsvFile(csvName + '.0', db, versione, data, function (err, warns, resp) {
            if (err) {
              fail(util.inspect(err));
            }
            if (warns && warns.length) {
              console.warn(warns.join('\n'));
            }
            if (resp) {
              console.log(resp);
            }
          });
        });
      });
    });
  });

  desc('Produce un file di testo con la stampa delle etichette da un inventario XLS');
  task('stampaEtichetteFromXLS', function (baseName, comparator) {
    requirejs(['lib/etichette'], function (etichette) {
      var xlsName = baseName + '.xlsx',
        csvName = baseName + '.csv';
      xlsToCsv(xlsName, csvName, function (errConvert, out) {
        if (errConvert) {
          fail(util.inspect(errConvert));
        }
        if (out) {
          console.log(out);
        }
        var db = newBoutiqueDbConnection();
        etichette.stampaFromCsvFile(csvName, db, comparator, function (err, stampa) {
          if (err) {
            return fail(err);
          }
          process.stdout.write(stampa);
        });
      });
    });
  });

  desc('Produce un file di testo con la stampa delle etichette');
  task('stampaEtichette', function (docId, comparator) {
    requirejs(['lib/etichette'], function (etichette) {
      var db = newBoutiqueDbConnection();
      etichette.stampa(db, docId, comparator, function (err, stampa) {
        if (err) {
          return fail(err);
        }
        process.stdout.write(stampa);
      });
    });
  });

  namespace('webserver', function () {

    desc('Build optimized files for production');
    task('build', function () {
      taskutil.execBuffered('node', ['node_modules/requirejs/bin/r.js', '-o', 'app.build.js'], function (err, out) {
        if (err) {
          fail(util.inspect(err));
        }
        console.log(out);
      });
    });

    desc('Start Web server');
    task('start', function (environment) {
      var connect = require('connect'),
        cmdExec = require('connect-exec').exec,
        server = connect.createServer()
          .use(connect.logger())
          .use('/as400',
            cmdExec('application/json', __dirname, 'java', ['-jar', 'as400-querier.jar']));

      if (environment === 'test') {
        console.log('Serving tests.');
        server
          .use('/app', connect['static'](path.join(__dirname, 'app')))
          .use('/test', connect['static'](path.join(__dirname, 'test')));
      } else {
        server.use('/app', connect['static'](path.join(__dirname, 'build')));
      }

      server.listen(servers.couchdb.webserver.port);
    });
  });
});
