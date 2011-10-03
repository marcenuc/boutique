#!/bin/sh -ex
npm update
git submodule init
git submodule update
ln -s ../lib/connect-exec node_modules/

echo 'Maybe you need to "cd lib/As400Querier && mvn package" to start.'
