port=8080

( sleep 2
  chromium-browser --incognito "http://localhost:${port}/" )&

exec testacular test/unit/testacular.conf
