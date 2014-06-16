var assert = require('assert');
var resp = require('../lib/resp');

it('should stringify non-string args', function () {
  assert.equal(resp.stringify('TEST', 3),
               resp.stringify('TEST', '3'));
  assert.equal(resp.stringify('TEST', {}),
               resp.stringify('TEST', '[object Object]'));
  assert.equal(resp.stringify('TEST', []),
               resp.stringify('TEST', ''));
});

