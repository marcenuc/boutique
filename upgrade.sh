#!/bin/sh -ex
git pull
./jake --trace deps:sync
git submodule update
(cd lib/As400Querier && mvn package)
./jake --trace couchdb:push
./jake --trace webserver:build
sudo service boutique-webserver restart
sudo service boutique-follow restart
