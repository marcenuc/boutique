port=9877

( sleep 2
  chromium-browser --incognito "http://localhost:${port}/capture?strict" )&

exec java -jar test/lib/jstestdriver/JsTestDriver.jar \
  --basePath "$PWD" \
  --port "$port" \
  --browserTimeout 90000 \
  --config config/jsTestDriver-scenario.conf
