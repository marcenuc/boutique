#!/bin/sh -ex
npm update --dev
git submodule init
git submodule update
ln -s ../lib/connect-exec node_modules/
