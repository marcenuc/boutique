/*global require:false, process:false, console:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['app/js/sha1', 'fs', 'util', 'nano', 'lib/servers'], function (sha1, fs, util, nano, servers) {
  'use strict';

  function buildUser(name, password, role) {
    var salt = String((new Date()).getTime());
    return {
      _id: 'org.couchdb.user:' + name,
      type: 'user',
      name: name,
      roles: role ? [role] : [],
      salt: salt,
      password_sha: sha1.hex(password + salt)
    };
  }

  var users,
    newName = process.argv[2],
    newPassword = process.argv[3],
    newRole = process.argv[4],
    usersDb = nano(servers.couchdb.authUrl()).use('_users');

  if (newName.match(/\.json$/)) {
    users = JSON.parse(fs.readFileSync(newName)).utenti;
  } else {
    users = [{ "name": newName, "password": newPassword, "ruolo": newRole }];
  }

  users.forEach(function (u) {
    var user = buildUser(u.name, u.password, u.ruolo);
    usersDb.insert(user, user._id, function (err, resp) {
      if (err) {
        throw new Error(util.inspect(err));
      }
      console.dir(resp);
    });
  });
});
