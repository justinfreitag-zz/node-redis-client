var assert = require('assert');
var resp = require('../lib/resp');

var parser = new resp.ResponseParser();

it('should respond with error', function (done) {
  parser.once('response', function (response) {
    assert(response instanceof Error);
    done();
  });
  parser.parse(new Buffer('-Error message\r\n'));
});

it('should respond with number', function (done) {
  parser.once('response', function (response) {
    assert.equal(response, 4);
    done();
  });
  parser.parse(new Buffer(':4\r\n'));
});

it('should respond with array', function (done) {
  parser.once('response', function (response) {
    assert.equal(response[0], 'OK');
    assert.equal(response[1], null);
    assert.equal(response[2], 'FOO');
    done();
  });
  parser.parse(new Buffer('*3\r\n+OK\r\n*-1\r\n$3\r\nFOO\r\n'));
});

