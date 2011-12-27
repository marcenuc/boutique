# Boutique — The boutique manager

This is a couchapp built for the management of tailor's shops.

It will allow to:

* insert the orders of the clients;
* insert the modifications requested by the clients;
* assign the work to the laboratories;
* track the warehouse.

# Development

To start development:

1. Compile and install NodeJS in a folder named /some/thing/NodeJS
2. Compile and install CouchDB in a folder named /some/thing/CouchDB using [build-couchdb][buildcouch]
3. Archive NodeJS with `tar -Jcf NodeJS.tar.xz /some/thing/NodeJS`
4. Archive CouchDB with `tar -Jcf CouchDB.tar.xz /some/thing/CouchDB`
5. Run `./bootstrap.sh` from the root of the project.

Use `./run CMD_NAME ARGS` to run scripts in `commands/` directory.

Everything is only tested on Ubuntu.

[buildcouch]: https://github.com/iriscouch/build-couchdb
