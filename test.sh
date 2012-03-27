#!/bin/dash
USAGE="$0 -s {unit|couchdb|srv} [-t TEST_FILTER] [-r]"

while getopts s:t:r f
do
  case $f in
  s)  suite="$OPTARG";;
  t)  tests="$OPTARG";;
  \?) echo "$USAGE"; exit 1;;
  esac
done
[ -z "$suite" ] && echo "$USAGE" && exit 2
#FIXME tests=all causes 2 runs for each test. A dummy value workarounds it.
[ -z "$tests" ] && tests=xxx

shift `expr $OPTIND - 1`

export LANG=C

case "$suite" in
e2e)
  while inotifywait -e modify 'test/e2e/scenarios.js'
  do
    java -jar test/lib/jstestdriver/JsTestDriver.jar \
      --basePath "$PWD" \
      --config config/jsTestDriver-scenario.conf \
      --tests "$tests" \
      --reset
  done
  ;;
unit)
  exec testacular-run
  ;;
couchdb)
  exec ./node_modules/.bin/jasmine-node --test-dir "$PWD/test-srv/couchdb" "$@"
  ;;
srv)
  exec ./node_modules/.bin/jasmine-node --test-dir "$PWD/test-srv/unit" "$@"
  ;;
*)
  echo "$USAGE" && exit 2
  ;;
esac
