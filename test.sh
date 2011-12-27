#!/bin/dash
USAGE="$0 -s {unit|couchdb|srv} [-t TEST_FILTER]"

while getopts s:t: f
do
  case $f in
  s)  suite="$OPTARG";;
  t)  tests="$OPTARG";;
  \?) echo "$USAGE"; exit 1;;
  esac
done
[ -z "$suite" ] && echo "$USAGE" && exit 2
[ -z "$tests" ] && tests=all

shift `expr $OPTIND - 1`

case "$suite" in
unit)
  exec java -jar test/lib/jstestdriver/JsTestDriver.jar \
    --basePath "$PWD" \
    --config config/jsTestDriver.conf \
    --tests "$tests" \
    "$@"
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
