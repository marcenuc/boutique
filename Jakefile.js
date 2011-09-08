/*jslint node: true */
/*global desc: false, task: false, fail: false */

var glob = require('glob'),
    spawn = require('child_process').spawn;

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
            process.error.write(stderr);
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
    var patterns = arguments.length > 0 ? [].slice.apply(arguments) : ['Jakefile.js', 'test/*/*.js', 'app/js/*.js'];
    
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
