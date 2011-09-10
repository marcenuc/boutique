/*jslint node: true */
/*global desc: false, task: false, fail: false, complete: false */

/*
 * Example "server.js" configuration file:
 * 
exports.couchdbHost = {
    protocol: 'http',
    host: 'localhost',
    port: 5984,
    admin: {
        username: 'user',
        password: 'pass'
    }
};
 */
var spawn = require('child_process').spawn,
    util = require('util'),
    couchdbHost = require('./servers').couchdbHost;

function exec(command, args, reader) {
    'use strict';
    var cmd = spawn(command, args);
    
    cmd.stdout.on('data', function (data) {
        reader(null, data.toString());
    });
    cmd.stderr.on('data', function (data) {
        reader(null, null, data.toString());
    });
    cmd.on('exit', function (code) {
        reader(code);
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

function lint(fileName) {
    'use strict';
    console_exec('jshint', [ fileName ], function () {
        console_exec('jslint', [ fileName ]);
    });
}


desc('Check coding style');
task('lint', function () {
    'use strict';
    var glob = require('glob'),
        patterns = arguments.length > 0 ? [].slice.apply(arguments) : ['Jakefile.js', 'test/*/*.js', 'app/js/*.js'];
    
    patterns.forEach(function (globPattern) {
        glob.glob(globPattern, function (err, fileNames) {
            if (err) {
                fail("ERROR: " + err);
            }
        
            fileNames.forEach(function (fileName) {
                lint(fileName);
            });        
        });
    });
});

desc('Load couchapp');
task('couchapp', function () {
    'use strict';
    
    var cradle = require('cradle'),
        couchdbs = require('./couchdbs'),
        connection = new (cradle.Connection)(couchdbHost.host, couchdbHost.port, {
            auth: { username: couchdbHost.admin.username, password: couchdbHost.admin.password }
        });
    
    function createDocs(db, docs) {
        Object.keys(docs).forEach(function (docId) {
            db.save(docId, docs[docId], function (err, res) {
                if (err) {
                    throw "Error creating " + docId + ": (" + err + ") " + res;
                }
            });
        });
    }
    
    Object.keys(couchdbs).forEach(function (dbName) {
        var docs = couchdbs[dbName],
            db = connection.database(dbName);
        
        db.exists(function (err, exists) {
            if (err) {
                throw "Error querying " + dbName + ": " + err;
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
    'use strict';
    
    var http = require('http'),
        options = {
            host: couchdbHost.host,
            port: couchdbHost.port,
            path: configPath,
            method: 'PUT',
            headers: {
                'host': couchdbHost.host + ':' + couchdbHost.port,
                'accept': 'application/json',
                'content-type': 'application/json;charset=utf-8'
            }
        },
        req;
    if (typeof configPath === 'string') {
        options.path = configPath;
        options.headers.authorization = 'Basic ' + new Buffer(couchdbHost.admin.username + ':' + couchdbHost.admin.password).toString('base64');
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
    'use strict';
    var cradle = require('cradle'),
        config = new (cradle.Connection)(couchdbHost.host, couchdbHost.port).database('_config');
    
    function creaAdmin() {
        var username = couchdbHost.admin.username,
            password = couchdbHost.admin.password;
        
        couchdbConfig({ path: '/_config/admins/' + username }, password, function (configErr) {
            if (configErr) {
                cbDone(configErr);
                return;
            }
            var users = new (cradle.Connection)(couchdbHost.host, couchdbHost.port, {
                    auth: { username: username, password: password }
                }).database('_users');
            users.save("org.couchdb.user:" + username, { name: username, type: "user", roles: [] }, function (err) {
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
task('setup-couchdb', function () {
    'use strict';
    
    couchdbSetupServerAdmin(function (adminErr) {
        if (adminErr) {
            fail(util.inspect(adminErr));
        }
        couchdbConfig(
            '/_config/httpd_global_handlers/boutique_app',
            '{couch_httpd_proxy, handle_proxy_req, <<"http://localhost:8000">>}',
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