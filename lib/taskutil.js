/*global define: false */

define(['child_process'], function (child_process) {
  'use strict';

  function exec(command, args, reader, options) {
    var cmd = child_process.spawn(command, args, options);

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

  return {
    exec: exec,
    execBuffered: function (command, args, callback, options) {
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
    }
  };
});