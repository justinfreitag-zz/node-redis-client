var assert = require('assert');
var resp = require('../lib/resp');

var parser = new resp.ResponseParser();

it('should complete parsing in less than a second', function (done) {
  var responses = 0;
  var COUNT = 1000000;
  var CHUNK_SIZE = 10000;

  parser.on('response', function (response) {
    if (response instanceof Error) {
      throw response;
    }
    ++responses;
    if (responses === COUNT) {
      assert((Date.now() - start) < 1000);
      done();
    }
  });

  var requests = '';
  for (var i = 0; i < CHUNK_SIZE; i++) {
    requests += '*3\r\n+OK\r\n*-1\r\n$3\r\nFOO\r\n';
  }
  var requestsBuffer = new Buffer(requests);
  var start = Date.now();
  var chunks = COUNT / CHUNK_SIZE;
  for (i = 0; i < chunks; i++) {
    parser.parse(requestsBuffer);
  }
});

