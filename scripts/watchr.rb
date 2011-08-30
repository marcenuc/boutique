#!/usr/bin/env watchr

# config file for watchr http://github.com/mynyml/watchr
# install: gem install watchr
# run: watchr watchr.rb
# note: make sure that you have jstd server running (server.sh) and a browser captured

base_dir = File.expand_path(File.join(File.dirname(__FILE__), '..'))
test_cmd = %W{
  java -jar #{base_dir}/test/lib/jstestdriver/JsTestDriver.jar
       --config #{base_dir}/config/jsTestDriver.conf
       --basePath #{base_dir}
       --tests all
}

require 'open3'

watch '(app/js|test/unit)' do
  Open3.popen3(*test_cmd) do |stdin, stdout, stderr, wait_thr|
    system(*%W{notify-send #{stdout.read} #{stderr.read}})
  end
end
