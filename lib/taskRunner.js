/*jslint node: true */
/*jshint node: true */

(function () {
  'use strict';
  var kv, i, ii,
    exec = require('child_process').exec,
    task = process.argv[2],
    params = {},
    args = [],
    opts = {
      timeout: 60000,
      maxBuffer: 500 * 1024
    };

  if (!task) {
    process.stdout.write('\r\n\r\nWhat task?');
    process.exit(0);
  }
  for (i = 3, ii = process.argv.length; i < ii; i += 1) {
    kv = (/([a-zA-Z]+)=([|a-zA-Z_0-9.]+)?/).exec(process.argv[i]);
    if (kv) {
      params[kv[1]] = kv[2];
    }
  }

  if (task === 'stampaEtichetteFromQueryGiacenze') {
    args = [params.stagione, params.modello, params.articolo, params.colore, params.aziende, params.comparator, params.layout, params.formato];
  } else if (task === 'stampaEtichetteFromMovimentoMagazzino') {
    args = [params.id, params.comparator, params.layout, params.formato];
  }

  exec("./jake -t '" + task + "[" + args.join(',') + "]'", opts, function (error, stdout, stderr) {
    var response;
    if (error !== null || stderr) {
      response = stderr;
    } else {
      process.stdout.write('Content-Disposition: inline;filename="etichette-' + args.join('-') + '.txt"');
      response = stdout;
    }
    process.stdout.write('\r\n\r\n');
    process.stdout.write(response);
  });
}());
