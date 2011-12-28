# connect-exec

Exec middleware for [Connect](http://senchalabs.github.com/connect/) on [Node.js](http://nodejs.org). Runs a configured command for a given path.


## Installation

Clone this repository into your `node_modules` folder.

To run the tests use [jasmine-node](https://github.com/mhevery/jasmine-node):

    jasmine-node test


## Usage

    var connect = require('connect'),
      path = require('path'),
      cmdExec = require('connect-exec').exec;

    connect.createServer()
      .use(connect.logger())
      .use('/taskRunner',
        cmdExec({ 'Content-Type': 'text/plain;charset=utf-8', '_parseHeadersInOutput': true }, __dirname, './taskRunner.sh', []))
      .use('/run',
        cmdExec({ 'Content-Type': 'application/json;charset=utf-8' }, __dirname, 'java', ['-jar', 'json-querier.jar']));
      .use('/app', connect['static'](path.join(__dirname, 'app')))
      .listen(3000);

This will run the command

    java -jar json-querier.jar foo a=b c=1

for the following pathname in the url `/run/foo/a=b/c=1`, while serving static content at `/app/...`.

The pathname MUST follow the given pattern:

    /something/var1=val1/var2=val2


### connectExec.exec()

Arguments to exec():

 - `contentType` Content-Type for the output of the command
 - `cwd`         Working directory for the command
 - `cmd`         Command to be run for this url
 - `baseArgs`    Static arguments to the command

## License

(The MIT License)

Copyright (c) 2011 Marcello Nuccio &lt;marcello.nuccio@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
