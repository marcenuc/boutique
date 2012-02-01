/*global require:false, process:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['assert', 'child_process', 'fs', 'path', 'uglify-js', 'less', 'q'], function (assert, child_process, fs, path, uglifyJs, less, Q) {
  'use strict';
  var readFile = Q.node(fs.readFile, fs),
    writeFile = Q.node(fs.writeFile, fs),
    target = process.argv[2],
    appFolder = 'app',
    buildFolder = 'build',
    cmds = {
      swf: ['as3compile', 'lib/flash/Save.as', '-M', 'Save', '-T', '10', '-I', 'lib/flash', '-o', path.join(appFolder, 'save.swf')]
    },
    cmd = cmds[target];

  function minifyJs(src) {
    var pro = uglifyJs.uglify;
    return pro.gen_code(pro.ast_squeeze(pro.ast_mangle(uglifyJs.parser.parse(src))));
  }

  function concatFiles(fileNames) {
    return Q.all(fileNames.map(function (fileName) {
      return readFile(fileName, 'utf8');
    })).then(function (contents) {
      return Q.call(function () {
        return contents.join('');
      });
    });
  }

  function minifyJsFilesTo(jsFiles, destination) {
    concatFiles(jsFiles)
      .then(function (bigJs) {
        return Q.call(minifyJs, null, bigJs);
      })
      .then(function (minifiedJs) {
        return writeFile(destination, minifiedJs, 'utf8');
      })
      .end();
  }

  function fromLessToCss(lessFile, cssFile) {
    var parser = new (less.Parser)({
      paths: [appFolder],
      filename: lessFile
    });

    readFile(lessFile, 'utf8')
      .then(function (lessSrc) {
        return Q.ncall(parser.parse, parser, lessSrc);
      })
      .then(function (tree) {
        return writeFile(cssFile, tree.toCSS({ compress: true }), 'utf8');
      })
      .end();
  }

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

  function compileSection(txt, sectionName, compiler) {
    var pattern = ['^([\\s\\S]*)<!-- BEGIN ', sectionName, ' -->([\\s\\S]*)<!-- END ', sectionName, ' -->([\\s\\S]*)$'];
    return txt.replace(new RegExp(pattern.join('')), function (str, before, section, after) {
      assert.equal(str, txt);
      return [before, compiler(section), after].join('');
    });
  }

  function copyFile(src, dst) {
    return readFile(src).then(function (data) {
      return writeFile(dst, data);
    });
  }

  function copyDirectory(src, dst) {
    var copyFiles = Q.ncall(fs.readdir, fs, src)
      .then(function (files) {
        return Q.all(files.map(function (file) {
          return copyFile(path.join(src, file), path.join(dst, file));
        }));
      });
    return Q.ncall(fs.stat, fs, dst)
      .then(function (stats) {
        if (stats.isDirectory()) {
          return copyFiles;
        }
        return Q.call(function () {
          throw new Error(dst + ' is not a directory');
        });
      }, function () {
        return Q.ncall(fs.mkdir, fs, dst, '0755').then(function () {
          return copyFiles;
        });
      });
  }

  function buildApp() {
    readFile(path.join(appFolder, 'index.html'), 'utf8')
      .then(function (indexHtml) {
        var compiledHtml = compileSection(indexHtml, 'JS', function (section) {
          var targetJs = 'app.js',
            files = [],
            rexp = / src="(js\/[a-z]+\.js)"/g,
            m = rexp.exec(section);
          while (m) {
            files.push(path.join(appFolder, m[1]));
            m = rexp.exec(section);
          }
          minifyJsFilesTo(files, path.join(buildFolder, targetJs));
          return '<script src="' + targetJs + '"></script>';
        });
        compiledHtml = compileSection(compiledHtml, 'CSS', function (section) {
          var targetCss = 'app.css',
            rexp = /<link[a-z="\/ ]* href="([a-z]+\.less)"/,
            m = rexp.exec(section);
          if (m) {
            fromLessToCss(path.join(appFolder, m[1]), path.join(buildFolder, targetCss));
          }
          return '<link rel=stylesheet href="' + targetCss + '">';
        });
        return writeFile(path.join(buildFolder, 'index.html'), compiledHtml, 'utf8');
      })
      .end();

    Q.all(['spinner.gif', 'save.swf', 'partials', 'templates'].map(function (baseName) {
      var src = path.join(appFolder, baseName);
      return Q.ncall(fs.stat, fs, src)
        .then(function (stats) {
          var copy = stats.isDirectory() ? copyDirectory : copyFile;
          return copy(src, path.join(buildFolder, baseName));
        });
    })).end();
  }

  if (cmd) {
    spawn(cmd);
  } else {
    buildApp();
  }
});
