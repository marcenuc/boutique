#!/bin/sh -ex
git pull
git submodule update
(cd lib/As400Querier && mvn package)
./run push
./run build
sudo service boutique-webserver stop
sudo service boutique-follow stop
sudo service boutique-follow start
sudo service boutique-webserver start
