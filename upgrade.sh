#!/bin/sh -ex
restartWebserver="${1:-1}"
[ "$restartWebserver" = "1" ] && sudo service boutique-webserver stop
npm update
git submodule update
(cd lib/As400Querier && mvn package)
./jake --trace couchdb:push
./jake --trace webserver:build
[ "$restartWebserver" = "1" ] && sudo service boutique-webserver start
