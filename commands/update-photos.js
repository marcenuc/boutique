/*global require:false, process:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['fs', 'child_process', 'path', 'findit', 'lib/servers'], function (fs, child_process, path, findit, servers) {
  'use strict';
  var doNext, i, ii, src, dst, files = [],
    spawn = child_process.spawn,
    images = servers.couchdb.webserver.images,
    ORIG = '_orig.jpg', IS_ORIG = new RegExp(ORIG + '$');

  function findFiles(inputFolder, pattern, outputFolder) {
    var rexp = new RegExp(pattern, 'i');
    findit.sync(inputFolder, function (file) {
      var m = rexp.exec(file);
      if (m) {
        var outname = m.slice(1).filter(function(e) { return e; }).join('_');
        files.push([file, path.join(outputFolder, outname + '.jpg'), path.join(outputFolder, outname + ORIG)]);
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
    if (code !== 0)
      throw new Error('convert from "' + src + '" to "' + dst + '" failed with: ' + code);
    process.stdout.write(Math.floor((i / ii) * 100) + '%\r');
    doNext();
  }

  doNext = function () {
    i += 1;
    if (i >= ii) return process.stdout.write('Done.\n');

    var f = files[Math.floor(i / 2)];
    src = f[0];
    dst = f[1 + i % 2];
    fs.stat(src, function (err, srcStats) {
      if (err) throw new Error(err);
      if (srcStats.isDirectory()) done(0);

      fs.stat(dst, function (err, dstStats) {
        if (err && err.code !== 'ENOENT') throw new Error(err);
        if (!err && !dstStats.isFile()) throw new Error(dst + ' is not a regular file');
        if (!err && srcStats.mtime.getTime() < dstStats.mtime.getTime()) return done(0);

        //TODO use jpegtrans?
        if (IS_ORIG.test(dst)) {
          spawn('convert', ['-strip', '-interlace', 'Plane', src, dst]).on('exit', done);
        } else {
          spawn('convert', ['-strip', '-interlace', 'Plane', '-resize', '400x800>', src, dst]).on('exit', done);
        }
      });
    });
  };

  i = -1;
  ii = files.length * 2;
  doNext();
});
