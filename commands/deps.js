/*global console: false, require: false, process: false*/
process.env.LANG = 'C';
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require, paths: { 'dbconfig': 'app/js/config' } });

requirejs(['fs', 'path', 'crypto', 'lib/taskutil'], function (fs, path, crypto, taskutil) {
  'use strict';
  var hashFileName = 'dependencies.sha1sum',
    task = process.argv[2],
    savedHash,
    currentHash;

  function getCurrentHash() {
    var sha1sum = crypto.createHash('sha1'),
      pkgFileName = 'package.json',
      pkgContents = fs.readFileSync(pkgFileName, 'utf8'),
      deps = Object.keys(JSON.parse(pkgContents).dependencies).sort();
    sha1sum.update(pkgContents);
    deps.forEach(function (dep) {
      try {
        sha1sum.update(fs.readFileSync(path.join(process.cwd(), 'node_modules', dep, pkgFileName), 'utf8'));
      } catch (ex) {
        console.dir(ex);
      }
    });
    return sha1sum.digest('hex');
  }

  switch (task) {
  case 'updateHash':
    process.stdout.write('Updating hash of dependencies...');
    fs.writeFileSync(hashFileName, getCurrentHash());
    process.stdout.write('done.\nRemember to "git commit ' + hashFileName + '"\n');
    break;

  case 'sync':
    savedHash = fs.readFileSync(hashFileName, 'utf8');
    currentHash = getCurrentHash();
    if (currentHash === savedHash) {
      console.log('Dependencies are already up-to-date.');
    } else {
      taskutil.execBuffered('npm', ['update'], function (err, stdout) {
        if (err) {
          throw new Error(err);
        }
        console.log(stdout);
        var newCurrentHash = getCurrentHash();
        if (newCurrentHash === currentHash) {
          console.log('Dependencies are now up-to-date.');
        } else {
          throw new Error('Update did not produce the expected hash.');
        }
      });
    }
    break;

  default:
    console.log('Uknown task');
    break;
  }
});
