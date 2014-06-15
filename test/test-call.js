var assert = require('assert');
var RedisClient = require('..');

var client = null;

before(function (done) {
  client = new RedisClient(6379, '127.0.0.1');
  client.on('connect', done);
});

it('should fail to authenticate', function (done) {
 client.call('AUTH', 'test', function (error, result) {
    assert(error instanceof Error);
    assert.equal(result, null);
    done();
  });
});

it('should emit callback-error', function (done) {
  client.call('PING', function (error, result) {
    throw(new Error('POOOONG!'));
  });
  client.once('callback-error', done);
});

it('should set and get value', function (done) {
  client.call('SET', 'foo', 'bar', function (error, result) {
    assert.equal(result, 'OK');
    client.call('GET', 'foo', function (error, result) {
      assert.equal(result, 'bar');
      done();
    });
  });
});

it('should multi/exec', function (done) {
  client.call('MULTI');
  client.call('SETEX', 'foo', '5000000', 'bar');
  client.call('RPUSH', 'listfoo', 'bar');
  client.call('SADD', 'setfoo', 'bar');
  client.call('EXEC', function (error, result) {
    assert.equal(result[0], 'OK');
    assert(typeof result[1] === 'number');
    assert(typeof result[2] === 'number');
    done();
  });
});

it('should multi/exec with error', function (done) {
  client.call('MULTI');
  client.call('AUTH', 'error');
  client.call('SET', 'foo', 'multibar');
  client.call('GET', 'foo');
  client.call('EXEC', function (error, result) {
    assert(result[0] instanceof Error);
    assert.equal(result[1], 'OK');
    assert.equal(result[2], 'multibar');
    done();
  });
});

it('should fail to publish when in subscribe mode', function (done) {
  client.call('SUBSCRIBE', 'foo', function (error, result) {
    assert.equal(result[0], 'subscribe');
    assert.equal(result[1], 'foo');
    assert(typeof result[2] === 'number');
    client.call('PUBLISH', 'foo', 'bar', function (error, result) {
      assert(error instanceof Error);
      done();
    });
  });
});

it('should quit', function (done) {
  client.on('close', done);
  client.quit();
});

