/*global require:false, process:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['fs', 'child_process', 'path', 'findit', 'lib/servers'], function (fs, child_process, path, findit, servers) {
  'use strict';
  var doNext, i, ii, f, files = [],
    spawn = child_process.spawn,
    images = servers.couchdb.webserver.images,
    fotoFolder = path.join(images.rootFolder, images.output, 'foto'),
    tessutiFolder = path.join(images.rootFolder, images.output, 'tessuti');

  function append(file, pattern, outputFolder) {
    var m = file.match(new RegExp(pattern));
    if (m) {
      files.push([file, path.join(images.rootFolder, outputFolder, m[1] + '.jpg')]);
    }
  }

  function findFiles(inputFolder, outputFolder) {
    var pattern = images.inputs[inputFolder];
    findit.sync(path.join(images.rootFolder, inputFolder), function (file) {
      append(file, pattern, outputFolder);
    });
  }

  //TODO should be done by Puppet (to ensure proper file permissions)?
  fs.mkdirSync(fotoFolder);
  fs.mkdirSync(tessutiFolder);

  //TODO DRY ripetuto in commands/webserver.js e config/server-configs.js
  findFiles('foto', fotoFolder);
  findFiles('schizzi', fotoFolder);
  findFiles('tessuti', tessutiFolder);

  function done(code) {
    if (typeof code !== 'number' || code !== 0) {
      throw new Error('convert of "' + f[0] + '" failed with: ' + code);
    }
    process.stdout.write(Math.floor((i / ii) * 100) + '%\r');
    doNext();
  }

  doNext = function () {
    i += 1;
    if (i >= ii) {
      return process.stdout.write('Done.\n');
    }
    f = files[i];
    fs.stat(f[0], function (err, stats0) {
      if (err) {
        throw new Error(err);
      }
      fs.stat(f[1], function (err, stats1) {
        if (err && err.code !== 'ENOENT') {
          throw new Error(err);
        }
        if (err || stats0.mtime.getTime() >= stats1.mtime.getTime()) {
          spawn('convert', [f[0], '-resize', '400x800>', f[1]]).on('exit', done);
        } else {
          done();
        }
      });
    });
  };

  i = -1;
  ii = files.length;
  doNext();
});
