/*global require:false, process:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['child_process'], function (child_process) {
  'use strict';
  var target = process.argv[2],
    cmds = {
      www: ['node', 'node_modules/requirejs/bin/r.js', '-o', 'app.build.js'],
      swf: ['as3compile', 'lib/flash/Save.as', '-M', 'Save', '-T', '10', '-I', 'lib/flash', '-o', 'app/save.swf']
    };

  function spawn(cmd) {
    process.stdout.write("'" + cmd.join("' '") + "'\n");
    var child = child_process.spawn(cmd[0], cmd.slice(1), { cwd: process.cwd() });
    child.stdout.on('data', function (data) {
      process.stdout.write(data);
    });
    child.stderr.on('data', function (data) {
      process.stderr.write(data);
    });
    child.on('exit', function (code) {
      if (code !== 0) {
        throw new Error('Build failed');
      }
    });
  }

  spawn(cmds[target] || cmds.www);
});
