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
    return newConnection().database(servers.couchdb.db);
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
              fail('Error creating "' + docId + '": (' + util.inspect(err) + ') ' + res);
            }
            console.log(' - ' + docId);
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
            fail('Error querying "' + dbName + '": ' + util.inspect(err));
          }
          console.log('Pushing to "' + dbName + '":');
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
              return fail(util.inspect(err));
            }
            console.log('Done.');
            complete();
          }
        );
      });
    }, true);

    desc('Stampa barcode in giacenza');
    task('stampaBarcodes', function () {
      var db = newBoutiqueDbConnection();
      db.get('Giacenze', function (err, giacenze) {
        if (err) {
          return fail(util.inspect(err));
        }
        var rows = giacenze.rows, i = 0, n = rows.length;
        for (; i < n; i += 1) {
          console.log(rows[i][0]);
        }
      });
    });

    desc('Stampa giacenze');
    task('stampaGiacenze', function () {
      var codici = requirejs('app/js/codici'),
        db = newBoutiqueDbConnection();
      db.get(['Giacenze', 'Listino_1_20111017'], function (err, docs) {
        if (err) {
          return fail(util.inspect(err));
        }
        var giacenze = docs.rows[0].doc, docListino = docs.rows[1].doc, listino = docListino.prezzi, prezzi,
          colGiacenze = codici.colNamesToColIndexes(giacenze.columnNames), stagione, modello, articolo,
          rows = giacenze.rows, i = 0, n = rows.length, row, taglia, qtas, qta;
        giacenze.columnNames.pop();
        console.log(giacenze.columnNames.concat('codiceTaglia', 'qta', docListino.columnNames).join('\t'));

        function formatPrice(p) {
          return typeof p === 'number' ? String(p / 100).replace('.', ',') : p;
        }

        for (; i < n; i += 1) {
          row = rows[i];
          qtas = row.pop();
          stagione = row[colGiacenze.stagione];
          modello = row[colGiacenze.modello];
          articolo = row[colGiacenze.articolo];
          prezzi = codici.getProperty(listino, stagione, modello, articolo);
          if (!prezzi) {
            console.error('Articolo non a listino ' + stagione + ' ' + modello + ' ' + articolo);
          } else {
            prezzi = prezzi.map(formatPrice);
            for (taglia in qtas) {
              if (qtas.hasOwnProperty(taglia)) {
                qta = qtas[taglia];
                console.log(row.concat(taglia, qta, prezzi).join('\t'));
              }
            }
          }
        }
      });
    });

    desc('Add or update CouchDB user');
    task('setupUser', function (newName, newPassword, newRole) {
      requirejs(['app/js/sha1'], function (sha1) {
        function buildUser(name, password, role) {
          var salt = String((new Date()).getTime());
          return {
            _id: 'org.couchdb.user:' + name,
            type: 'user',
            name: name,
            roles: role ? [role] : [],
            salt: salt,
            password_sha: sha1.hex(password + salt)
          };
        }
        var db = newConnection().database('_users'),
          user = buildUser(newName, newPassword, newRole);
        db.save(user._id, user, function (err, resp) {
          if (err) {
            fail(util.inspect(err));
          }
          console.dir(resp);
        });
      });
    });

    function updateReporter(err, warnsAndDoc, res, callback) {
      if (err) {
        return fail(util.inspect(err));
      }
      if (warnsAndDoc && warnsAndDoc[0].length) {
        console.warn(warnsAndDoc[0].join('\n'));
      }
      if (res) {
        console.log(util.inspect(res));
      }
      if (callback) {
        callback();
      }
    }

    desc('Aggiorna dati da As400');
    task('sync-as400', function () {
      var as400 = requirejs('lib/as400'),
        db = newBoutiqueDbConnection();
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

    desc('Monitor CouchDB for MovimentoMagazzino to keep Giacenze updated');
    task('follow', function () {
      requirejs(['follow', 'lib/as400'], function (follow, as400) {
        var feed = new follow.Feed({
          db: servers.couchdb.authUrl() + '/' + servers.couchdb.db,
          since: 'now',
          inactivity_ms: 86400 * 1000,
          filter: function (doc) {
            var ids = doc._id.split('_');
            return ids[0] === 'MovimentoMagazzino' && doc.accodato;
          }
        });

        feed.on('change', function (change) {
          var db = newBoutiqueDbConnection();
          console.dir(change);
          as400.updateGiacenze(db, updateReporter);
        });

        feed.on('error', function (err) {
          console.error('Since Follow always retries on errors, this must be serious:');
          fail(util.inspect(err));
          throw err;
        });

        console.log('Starting to follow ' + servers.couchdb.url() + '/' + servers.couchdb.db);
        feed.follow();
      });
    });

    desc('Aggiorna listino');
    task('aggiornaListino', function (versione, data, updateNum, sheet) {
      requirejs(['lib/listino'], function (listino) {
        var doUpdate = parseInt(updateNum, 10) > 0,
          update = doUpdate ? '_' + updateNum : '',
          baseName = 'tmp/listino_' + versione + '_' + data + update,
          xlsName = baseName + '.xlsx',
          csvName = baseName + '.csv';
        xlsToCsv(xlsName, csvName, function (errConvert, out) {
          if (errConvert) {
            fail(util.inspect(errConvert));
          }
          if (out) {
            console.log(out);
          }
          var db = newBoutiqueDbConnection(),
            num = typeof sheet === 'undefined' ? '' : '.' + sheet;
          listino.updateFromCsvFile(csvName + num, db, versione, data, doUpdate, function (err, warnsAndDoc, resp) {
            if (err) {
              fail(util.inspect(err));
            }
            if (warnsAndDoc[0] && warnsAndDoc[0].length) {
              console.warn(warnsAndDoc[0].join('\n'));
            }
            if (resp) {
              console.dir(resp);
            }
          });
        });
      });
    });
  });

  desc('Aggiorna inventario');
  task('aggiornaInventario', function (baseName, azienda, doReset, sheet) {
    requirejs(['lib/inventario'], function (inventario) {
      var xlsName = baseName + '.xlsx',
        csvName = baseName + '.csv';
      xlsToCsv(xlsName, csvName, function (errConvert, out) {
        if (errConvert) {
          fail(util.inspect(errConvert));
        }
        if (out) {
          console.log(out);
        }
        var db = newBoutiqueDbConnection(),
          num = typeof sheet === 'undefined' ? '' : '.' + sheet;
        inventario.loadFromCsvFile(csvName + num, azienda, db, doReset === '1', function (err, warnsAndDoc, resp) {
          if (err) {
            return fail(util.inspect(err));
          }
          if (warnsAndDoc[0] && warnsAndDoc[0].length) {
            console.warn(warnsAndDoc[0].join('\n'));
          }
          if (typeof resp !== 'undefined') {
            console.log('Risposta: ' + resp);
          }
        });
      });
    });
  });

  desc('Produce un file di testo con la stampa delle etichette da un movimento magazzino');
  task('stampaEtichetteFromMovimentoMagazzino', function (idMovimentoMagazzino, comparatorName, layout, formato) {
    requirejs(['lib/etichette'], function (etichette) {
      var db = newBoutiqueDbConnection();
      etichette.stampaFromMovimentoMagazzino(idMovimentoMagazzino, db, comparatorName, layout, formato, function (err, warns, stampa) {
        if (err) {
          return fail(util.inspect(err));
        }
        if (warns && warns.length) {
          console.warn(warns.join('\n'));
        }
        process.stdout.write(stampa);
      });
    });
  });

  desc('Produce un file di testo con la stampa delle etichette dalle giacenze');
  task('stampaEtichetteFromGiacenze', function (codiceAzienda, tipoMagazzino, comparatorName, layout, formato) {
    requirejs(['lib/etichette'], function (etichette) {
      var db = newBoutiqueDbConnection();
      etichette.stampaFromGiacenze(db, codiceAzienda, parseInt(tipoMagazzino, 10), comparatorName, layout, formato, function (err, warns, stampa) {
        if (err) {
          return fail(util.inspect(err));
        }
        if (warns && warns.length) {
          console.warn(warns.join('\n'));
        }
        process.stdout.write(stampa);
      });
    });
  });

  desc('Produce una stampa delle etichette dalle giacenze filtrando con una query');
  // FIXME includere query sulle taglie.
  task('stampaEtichetteFromQueryGiacenze', function (stagione, modello, articolo, colore, aziende, comparatorName, layout, formato) {
    requirejs(['lib/etichette'], function (etichette) {
      var db = newBoutiqueDbConnection();
      etichette.stampaFromQueryGiacenze(db, stagione, modello, articolo, colore, aziende, comparatorName, layout, formato, function (err, warns, stampa) {
        if (err) {
          return fail(util.inspect(err));
        }
        if (warns && warns.length) {
          console.warn(warns.join('\n'));
        }
        process.stdout.write(stampa);
      });
    });
  });

  namespace('deps', function () {
    var hashFileName = 'dependencies.sha1sum',
      fs = require('fs'),
      crypto = require('crypto');

    function getCurrentHash() {
      var sha1sum = crypto.createHash('sha1'),
        pkgFileName = 'package.json',
        pkgContents = fs.readFileSync(pkgFileName, 'utf8'),
        deps = Object.keys(JSON.parse(pkgContents).dependencies).sort();
      sha1sum.update(pkgContents);
      deps.forEach(function (dep) {
        try {
          sha1sum.update(fs.readFileSync(path.join('node_modules', dep, pkgFileName), 'utf8'));
        } catch (ex) {
          console.dir(ex);
        }
      });
      return sha1sum.digest('hex');
    }

    desc('Update hash of dependencies');
    task('updateHash', function () {
      fs.writeFileSync(hashFileName, getCurrentHash());
      console.log('Remember to "git commit ' + hashFileName + '"');
    });

    desc('Do update dependencies if saved hash does not match');
    task('sync', function () {
      var savedHash = fs.readFileSync(hashFileName, 'utf8'),
        currentHash = getCurrentHash();
      if (currentHash === savedHash) {
        console.log('Dependencies already up-to-date.');
      } else {
        taskutil.execBuffered('npm', ['update'], function (err, stdout) {
          if (err) {
            return fail(err);
          }
          console.log(stdout);
          var newCurrentHash = getCurrentHash();
          if (newCurrentHash === currentHash) {
            console.log('Dependencies are now up-to-date.');
          } else {
            fail('Update did not produce the expected hash.');
          }
        });
      }
    });
  });

  namespace('webserver', function () {

    desc('Update photos');
    task('updatePhotos', function () {
      var i, n, f, files = [],
        path = require('path'),
        spawn = require('child_process').spawn,
        photoFolder = servers.couchdb.webserver.photoFolder,
        find = require('findit').sync;

      find(path.resolve(photoFolder, '..', 'foto'), function (file) {
        // TODO DRY usare codici
        var m = file.match(/\/(\d{16})\.[a-z]+$/);
        if (m) {
          files.push([file, path.join(photoFolder, m[1] + '.jpg')]);
        }
      });

      find(path.resolve(photoFolder, '..', 'schizzi'), function (file) {
        // TODO DRY usare codici
        var m = file.match(/\/(\d{8})\.[a-z]+$/);
        if (m) {
          files.push([file, path.join(photoFolder, m[1] + '.jpg')]);
        }
      });

      i = 0;
      n = files.length;
      f = files[i];

      function doConvert() {
        return spawn('convert', [f[0], '-resize', '400x800>', f[1]]);
      }

      function doNext(code) {
        if (typeof code !== 'number' || code !== 0) {
          return fail('convert "' + f[0] + '" failed with: ' + code);
        }
        process.stdout.write(Math.floor((i / n) * 100) + '%\r');

        i += 1;
        if (i >= n) {
          return console.log('Done.');
        }

        f = files[i];
        doConvert().on('exit', doNext);
      }

      doConvert().on('exit', doNext);
    });

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
        sendFoto = requirejs('lib/sendFoto'),
        port = servers.couchdb.webserver.port,
        server = connect.createServer()
          .use(connect.logger())
          .use(connect.basicAuth(function (user, pass) {
            // TODO do authentication against couchdb or use a shared users db
            return user && pass;
          }, 'administrator'));

      if (environment === 'test') {
        console.log('Serving tests.');
        server
          .use('/app', connect['static'](path.join(__dirname, 'app')))
          .use('/test', connect['static'](path.join(__dirname, 'test')));
      } else {
        server.use('/app', connect['static'](path.join(__dirname, 'build')));
      }

      server.use('/_session', function (req, res) {
        res.setHeader('Content-Type', 'application/json;charset=utf-8');
        res.end(JSON.stringify({ userCtx: { name: req.remoteUser } }));
      })
        .use('/img', sendFoto(servers.couchdb.webserver.photoFolder, { '11': '12', '10': '12', '92': '12' }))
        .use('/taskRunner',
          cmdExec({ 'Content-Type': 'text/plain;charset=utf-8', '_parseHeadersInOutput': true }, __dirname, 'node', ['lib/taskRunner.js']))
        .use('/as400',
          cmdExec({ 'Content-Type': 'application/json;charset=utf-8' }, __dirname, 'java', ['-jar', 'as400-querier.jar']));

      console.log('Listening on port ' + port + '.');
      server.listen(port);
    });
  });
});
