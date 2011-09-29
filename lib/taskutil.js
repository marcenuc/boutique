/*jslint node: true */
/*jshint node: true */

(function () {
  'use strict';

  var _ = require('underscore'),
    spawn = require('child_process').spawn,
    path = require('path'),
    defaultCwd = path.dirname(__dirname);

  function exec(command, args, reader, options) {
    var cmd, opts;
    if (options && options.cwd) {
      opts = options;
    } else {
      opts = options ? _.clone(options) : {};
      opts.cwd = defaultCwd;
    }

    cmd = spawn(command, args, opts);

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
  exports.exec = exec;

  exports.execBuffered = function (command, args, callback, options) {
    var data = [], errs = [];
    exec(command, args, function (err, stdout, stderr) {
      if (err) {
        return callback(err);
      }
      if (stderr) {
        return errs.push(stderr);
      }
      if (stdout) {
        return data.push(stdout);
      }
      if (errs.length) {
        return callback(errs.join(''));
      }
      return callback(null, data.join(''));
    }, options);
  };

}());