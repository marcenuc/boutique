/*jslint node: true */
/*jshint node: true */
var argPattern = "/([a-zA-Z]+=(?:[|a-zA-Z_0-9.]+)?)",
  regexpPath = new RegExp("^/([a-zA-Z\\[\\]_0-9]+)(?:" + argPattern + ")*$"),
  regexpArg = new RegExp(argPattern, 'g');

module.exports = function (pathname) {
  'use strict';
  var m = regexpPath.exec(pathname), args = [];
  while (m) {
    args.push(m[1]);
    m = regexpArg.exec(pathname);
  }
  return args.length ? args : null;
};
