# THIS PROJECT IS STALE

# Boutique — The boutique manager

This is a [couchapp][] built for the management of tailor's shops.

It will allow to:

* insert the orders of the clients;
* insert the modifications requested by the clients;
* assign the work to the laboratories;
* track the warehouse;
* sync with AS/400.

# Bootstrap

System configuration is managed through [Puppet][].

You need to boostrap it with the following procedure:

1. create a boutique user (or use your own): `sudo adduser --disabled-login boutique && base="/home/boutique"`
2. compile and install [NodeJS][]: `./configure --prefix="$base/NodeJS" && make && make install`
3. compile and install [CouchDB][] using [build-couchdb][]: `rake install="$base/CouchDB"`
4. create packages folder: `pkgs="$base/packages" && mkdir "$pkgs"`
5. package NodeJS and CouchDB: `cd "$base" && tar -Jcf $pkgs/NodeJS.tar.xz NodeJS && tar -Jcf $pkgs/CouchDB.tar.xz CouchDB`
6. download and run [bootstrap.sh][] (replace upcase with useful info): `bash -ex ./bootstrap.sh "$base" "$pkgs" "Boutique $(hostname)" "boutique" "BOUTIQUEPASSWORD" "ADMIN@MAIL" "AS400USER" "AS400PASSWORD"`

*WARNING*: please read the `bootstrap.sh` script to understand what it does. In short it checks and sets-up a basic environment, then applies a Puppet manifest to configure everything (install dependencies, setup services, create folders, ...).

# Development

JDK is needed only for [As400Querier][], everything else is pure Javascript, HTML5, and CSS. On the server, Javascript runs on [CouchDB][] and [NodeJS][]; on the client you will need latest version of Firefox or Chrome.

Use `./run CMDNAME ARGS` to run scripts in `commands/` directory.

Everything is tested only on Ubuntu.

[couchapp]: http://couchapp.org/
[maven]: http://maven.apache.org/
[nodejs]: http://nodejs.org/
[couchdb]: http://couchdb.apache.org/
[puppet]: http://puppetlabs.com/
[build-couchdb]: https://github.com/iriscouch/build-couchdb
[bootstrap.sh]: https://github.com/marcenuc/boutique/raw/master/bootstrap.sh
[as400querier]: https://github.com/marcenuc/As400Querier
