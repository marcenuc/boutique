for i in *.js lib/*.js config/*.js test/*/*.js test-srv/*/*.js app/js/*.js
do
  jshint "$i" --config .jshintrc
  jslint --indent=2 --es5 --nomen "$i"
done
