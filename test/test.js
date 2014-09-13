'use strict';

var assert = require('assert');
var Domain = require('domain');
var RedisClient = require('..');
var sinon = require('sinon');

// TODO add max callback depth test

var client;
var clock;

beforeEach(function (done) {
  client = new RedisClient();
  clock = sinon.useFakeTimers();
  client.once('connect', done);
});

it('should select db 1', function (done) {
  var client = new RedisClient({db: 1});
  client.on('connect', function () {
    assert.equal(client.options.db, 1);
    done();
  });
});

it('should fail on unknown command', function (done) {
 client.call('FOO', 'bar', function (error, result) {
    assert(error instanceof Error);
    assert.equal(result, undefined);
    done();
  });
});

it('should fail to authenticate', function (done) {
 client.call('AUTH', 'foo', function (error, result) {
    assert(error instanceof Error);
    assert.equal(result, undefined);
    done();
  });
});

it('should not catch callback error', function (done) {
  var errorMessage = 'FOO';
  var domain = Domain.create();
  domain.on('error', function (error) {
    assert.equal(error.message, errorMessage);
    done();
  });
  domain.run(function () {
    var client = new RedisClient();
    client.once('connect', function () {
      client.call('PING', function () {
        throw new Error(errorMessage);
      });
    });
  });
});

it('should throw call-error', function (done) {
  var domain = Domain.create();
  domain.on('error', function (error) {
    assert(error instanceof Error);
    done();
  });
  domain.run(function () {
    var client = new RedisClient();
    client.once('connect', function () {
      client.call('FOO');
    });
  });
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

it('should chain calls', function (done) {
  client
    .call('SET', 'foo', 'bar', function (error, result) {
      assert.equal(result, 'OK');
    })
    .call('GET', 'foo', function (error, result) {
      assert.equal(result, 'bar');
      done();
    });
});

it('should multi/exec', function (done) {
  client.call('MULTI');
  client.call('SETEX', 'foo', 5000000, 'bar');
  client.call('RPUSH', 'listfoo', 'bar');
  client.call('SADD', 'setfoo', 'bar');
  client.call('EXEC', function (error, result) {
    assert.equal(result[0], 'OK');
    assert(typeof result[1] === 'number');
    assert(typeof result[2] === 'number');
    done();
  });
});

it('should multi/exec with error in result', function (done) {
  client.call('MULTI');
  client.call('AUTH', 'foo');
  client.call('SET', 'foo', 'bar');
  client.call('GET', 'foo');
  client.call('EXEC', function (error, result) {
    assert(result[0] instanceof Error);
    assert.equal(result[1], 'OK');
    assert.equal(result[2], 'bar');
    done();
  });
});

it('should abort multi/exec', function (done) {
  client.once('call-error', function (error) {
    assert(error instanceof Error);
  });
  client.call('MULTI');
  client.call('FOO');
  client.call('SET', 'foo', 'bar');
  client.call('EXEC', function (error, result) {
    assert(error instanceof Error);
    assert.equal(result, undefined);
    done();
  });
});

it('should emit call-error', function (done) {
  client.on('call-error', function (error) {
    assert(error instanceof Error);
    done();
  });
  client.call('FOO');
});

it('should fail to publish when in subscribe mode', function (done) {
  client.call('SUBSCRIBE', 'foo', function (error, result) {
    assert.equal(result[0], 'subscribe');
    assert.equal(result[1], 'foo');
    assert(typeof result[2] === 'number');
    client.call('PUBLISH', 'foo', 'bar', function (error) {
      assert(error instanceof Error);
      done();
    });
  });
});

it('should return undefined result on blpop timeout', function (done) {
  client.call('BLPOP', 'listbar', 1, function (error, result) {
    assert.equal(error, undefined);
    assert.equal(result, undefined);
    done();
  });
});

it('should quit', function (done) {
  client.on('close', done);
  client.quit();
});

it('should quit on blpop', function (done) {
  client.once('error', function (error) {
    assert(error instanceof Error);
    client.on('error', function (/* ignore */) {});
    done();
  });
  client.call('BLPOP', 'listbar', 0);
  client.quit();
  clock.tick(3000);
});

it('should timeout on quit', function (done) {
  client.once('error', function (error) {
    assert(error instanceof Error);
    assert.equal(error.message, 'Timeout');
    client.on('error', function (/* ignore */) {});
    done();
  });
  client.quit();
  clock.tick(3000);
});

