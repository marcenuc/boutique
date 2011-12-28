/*!
 * Connect Exec
 * Copyright(c) 2011 nuccio s.a.s.
 * MIT Licensed
 */

/*jslint node: true */
/*jshint node: true */
var spawn = require('child_process').spawn,
  url = require('url'),
  pathMatcher = require('./pathMatcher');

/**
 * Connect middleware providing external command execution.
 *
 * @param {String} headers HTTP headers of the response. Must have 'Content-Type' header.
 *                         The special header '_parseHeadersInOutput', is removed and,
 *                         if true, the first lines of the output of the command are parsed
 *                         as HTTP headers for the response, until '\r\n\r\n' is found.
 * @param {String} cwd     Working directory for the command.
 * @param {String} cmd     Command to be run for this url.
 * @param {Array} baseArgs Static arguments to the command.
 * @returns {function}
 *
 * @api public
 */
module.exports = function (headers, cwd, cmd, baseArgs) {
  'use strict';
  if (!headers || typeof headers !== 'object') {
    throw new Error('headers must be an hash of HTTP headers');
  }
  if (!headers.hasOwnProperty('Content-Type')) {
    throw new Error('headers must have Content-Type');
  }
  if (typeof cwd !== 'string') {
    throw new Error('cwd must be a string');
  }
  if (typeof cmd !== 'string') {
    throw new Error('cmd must be a string');
  }
  if (typeof baseArgs !== 'object' || typeof baseArgs.length !== 'number') {
    throw new Error('baseArgs must be an array');
  }
  //FIXME respCharset should be set from headers['Content-Type']
  var respCharset = 'utf8',
    parseHeadersInOutput = headers._parseHeadersInOutput;

  delete headers._parseHeadersInOutput;

  return function (req, res, next) {
    var process, stderr, header,
      respHead = '', parseHeadersFinished = !parseHeadersInOutput,
      parsedArgs = pathMatcher(url.parse(req.url).pathname);

    if (!parsedArgs) {
      return next();
    }

    for (header in headers) {
      if (headers.hasOwnProperty(header)) {
        res.setHeader(header, headers[header]);
      }
    }

    function setRespHeaders() {
      var lines = respHead.split('\r\n'), i = 0, n = lines.length, l, hv;
      for (; i < n; i += 1) {
        l = lines[i];
        if (!l) {
          // empty line: finished.
          break;
        }
        hv = l.split(': ');
        res.setHeader(hv[0], hv[1]);
      }
    }

    process = spawn(cmd, baseArgs.concat(parsedArgs), { cwd: cwd });
    stderr = [];
    process.stdout.on('data', function (data) {
      var crnlcrnl, d;
      if (parseHeadersFinished) {
        res.write(data);
      } else {
        respHead += data.toString(respCharset);
        crnlcrnl = respHead.indexOf('\r\n\r\n');
        if (crnlcrnl !== -1) {
          parseHeadersFinished = true;
          setRespHeaders();
          d = respHead.substring(crnlcrnl + 4);
          if (d) {
            res.write(new Buffer(d, respCharset));
          }
        }
      }
    });
    process.stderr.on('data', function (data) {
      if (stderr.length < 100) {
        stderr.push(data);
      }
    });
    process.on('exit', function (code) {
      if (code) {
        return next(new Error(cmd + ' exit code ' + code));
      } else if (stderr.length) {
        return next(new Error(stderr.join('')));
      }
      res.end();
    });
  };
};
