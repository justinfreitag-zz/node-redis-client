'use strict';

var merge = require('merge');
var net = require('net');
var events = require('node-events');
var redisProtocol = require('node-redis-protocol');
var util = require('util');

function handleResponse(response) {
  /* jshint validthis: true */
  var callback = this.callbacks[this.callbacksBegin];
  this.callbacksBegin = (this.callbacksBegin + 1) % this.callbacks.length;
  if (callback !== undefined) {
    var error;
    if (response instanceof Error) {
      error = response;
      response = undefined;
    }
    callback(error, response);
    return;
  }

  if (response instanceof Error) {
    if (!this.emit('call-error', response)) {
      handleError.call(this, response);
    }
  }
}

function handleError(error) {
  /* jshint validthis: true */
  if (this.emit('error', error)) {
    this.socket.destroy();
    this.parser = null;
    return;
  }

  throw error;
}

function handleConnect(client) {
  if (client.options.db) {
    client.call('SELECT', client.options.db);
  }
  client.emit('connect');
}

function handleClose(client, error) {
  if (!error) {
    client.emit('close');
  }
}

function handleEnd(client) {
  client.socket.end();
  client.parser = null;
}

function connect(client) {
  var socket = net.createConnection(
    client.options.path || client.options.port, client.options.host
  );
  socket.on('connect', function () { handleConnect(client); });
  socket.on('close', function (error) { handleClose(client, error); });
  socket.on('end', function () { handleEnd(client); });
  socket.on('data', function (data) { client.parser.parse(data); });
  socket.on('error', function (error) { handleError.call(client, error); });
  socket.on('timeout', function (error) { handleError.call(client, error); });

  return socket;
}

var DEFAULT_OPTIONS = {
  db: 0,
  host: '127.0.0.1',
  port: 6379,
  maxCallbackDepth: 256
};

function RedisClient(options) {
  this.options = merge(DEFAULT_OPTIONS, options);

  this.request = '';
  this.callbacks = new Array(this.options.maxCallbackDepth);
  this.callbacksBegin = 0;
  this.callbacksEnd = 0;
  this.nextTick = undefined;

  this.parser = new redisProtocol.ResponseParser(options);
  this.parser.on('error', handleError, this);
  this.parser.on('response', handleResponse, this);

  this.socket = connect(this);

  events.EventEmitter.call(this);
}
util.inherits(RedisClient, events.EventEmitter);

RedisClient.DEFAULT_OPTIONS = DEFAULT_OPTIONS;

RedisClient.prototype.call = function () {
  var callback;
  if (arguments[arguments.length - 1] instanceof Function) {
    callback = arguments[arguments.length - 1];
    --arguments.length;
  }

  if (arguments.length > 0) {
    this.request += redisProtocol.createRequestString.apply(null, arguments);
  }

  // TODO emit error if callback depth exceeded and return
  this.callbacks[this.callbacksEnd] = callback;
  // TODO move this into separate package
  this.callbacksEnd = (this.callbacksEnd + 1) % this.callbacks.length;

  if (this.nextTick === undefined) {
    var self = this;
    this.nextTick = null;
    process.nextTick(function () {
      self.socket.write(self.request);
      self.request = '';
      self.nextTick = undefined;
    });
  }

  return this;
};

RedisClient.prototype.quit = function () {
  if (this.socket.destroyed) {
    return;
  }

  var self = this;
  var quitTimer = setTimeout(function () {
    handleError.call(self, new Error('Timeout'));
  }, 2000);

  this.call('QUIT', function (error) {
    clearTimeout(quitTimer);
    if (error) {
      handleError.call(self, error);
    } else {
      self.emit('quit');
    }
  });
};

module.exports = RedisClient;

