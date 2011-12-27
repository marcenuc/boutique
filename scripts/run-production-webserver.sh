#!/bin/dash -e
cd `dirname "$0"`
BOUTIQUE_ENV=production exec ../run webserver
