port=9876

( sleep 2
  chromium-browser --incognito "http://localhost:${port}/capture?strict" )&

exec java -jar test/lib/jstestdriver/JsTestDriver.jar \
  --basePath "$PWD" \
  --config config/jsTestDriver.conf \
  --port "$port" \
  --browserTimeout 20000
