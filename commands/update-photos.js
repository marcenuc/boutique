/*global require: false, process: false*/
process.env.LANG = 'C';
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require, paths: { 'dbconfig': 'app/js/config' } });

requirejs(['child_process', 'path', 'findit', 'lib/servers'], function (child_process, path, findit, servers) {
  'use strict';
  var doNext, i, ii, f, files = [],
    spawn = child_process.spawn,
    inputFolder, images = servers.couchdb.webserver.images;

  function append(file, pattern) {
    var m = file.match(new RegExp(pattern));
    if (m) {
      files.push([file, path.join(images.rootFolder, images.output, m[1] + '.jpg')]);
    }
  }

  function findFiles(inputFolder) {
    findit.sync(path.join(images.rootFolder, inputFolder), function (file) {
      append(file, images.inputs[inputFolder]);
    });
  }

  for (inputFolder in images.inputs) {
    if (images.inputs.hasOwnProperty(inputFolder)) {
      findFiles(inputFolder);
    }
  }

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
    spawn('convert', [f[0], '-resize', '400x800>', f[1]]).on('exit', done);
  };

  i = -1;
  ii = files.length;
  doNext();
});
