/*jslint node: true */
/*jshint node: true */

(function () {
  'use strict';
  var kv, i = 3, n = process.argv.length,
    exec = require('child_process').exec,
    task = process.argv[2],
    params = {},
    args = [],
    opts = {
      timeout: 60000,
      maxBuffer: 200 * 1024
    };

  if (!task) {
    process.stdout.write('\r\n\r\nWhat task?');
    process.exit(0);
  }
  for (; i < n; i += 1) {
    kv = (/([a-zA-Z]+)=([%(?:|)$a-zA-Z_0-9.]+)/).exec(process.argv[i]);
    if (kv) {
      params[kv[1]] = kv[2];
    }
  }

  if (task === 'stampaEtichetteFromRicercaGiacenze') {
    args = [params.comparator, params.layout, params.formato];
    opts.env = {
      query: params.query
    };
  } else if (task === 'stampaEtichetteFromMovimentoMagazzino') {
    args = [params.id, params.comparator, params.layout, params.formato];
  }

  exec("./jake '" + task + "[" + args.join(',') + "]'", opts, function (error, stdout, stderr) {
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
