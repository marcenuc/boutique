/*global require:false, process:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['fs', 'child_process', 'path', 'findit', 'lib/servers'], function (fs, child_process, path, findit, servers) {
  'use strict';
  var doNext, i, ii, f, files = [],
    spawn = child_process.spawn,
    images = servers.couchdb.webserver.images;

  function findFiles(inputFolder, pattern, outputFolder) {
    var rexp = new RegExp(pattern, 'i');
    findit.sync(inputFolder, function (file) {
      var m = rexp.exec(file);
      if (m) {
        files.push([file, path.join(outputFolder, m.slice(1).join('_') + '.jpg')]);
      }
    });
  }

  Object.keys(images.inputs).forEach(function (outputFolder) {
    var inputs = images.inputs[outputFolder];
    Object.keys(inputs).forEach(function (inputFolder) {
      var pattern = inputs[inputFolder];
      findFiles(path.join(images.rootFolder, inputFolder), pattern, path.join(images.rootFolder, images.output, outputFolder));
    });
  });

  function done(code) {
    if (code !== 0) {
      throw new Error('convert from "' + f[0] + '" to "' + f[1] + '" failed with: ' + code);
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
      if (stats0.isDirectory()) {
        done(0);
      }
      fs.stat(f[1], function (err, stats1) {
        if (err && err.code !== 'ENOENT') {
          throw new Error(err);
        }
        if (!err && !stats1.isFile()) {
          throw new Error(f[1] + ' is not a regular file');
        }
        if (err || stats0.mtime.getTime() >= stats1.mtime.getTime()) {
          spawn('convert', [f[0], '-resize', '400x800>', f[1]]).on('exit', done);
        } else {
          done(0);
        }
      });
    });
  };

  i = -1;
  ii = files.length;
  doNext();
});
