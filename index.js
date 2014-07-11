'use strict';

var events = require('event-emitter');
var net = require('net');
var resp = require('node-resp');
var util = require('util');

function handleResponse(response) {
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

var DEFAULT_OPTIONS = {
  db: 0,
  host: '127.0.0.1',
  port: 6379,
  maxCallbackDepth: 256
};

function RedisClient(options) {
  this.options = util._extend(DEFAULT_OPTIONS, options);

  this.request = '';
  this.callbacks = new Array(this.options.maxCallbackDepth);
  this.callbacksBegin = 0;
  this.callbacksEnd = 0;
  this.nextTick = undefined;

  this.parser = new resp.ResponseParser(options);
  this.parser.on('error', handleError, this);
  this.parser.on('response', handleResponse, this);

  var self = this;
  this.socket = net.createConnection(
    this.options.path || this.options.port, this.options.host
  );
  this.socket.on('connect', function () { handleConnect(self); });
  this.socket.on('close', function (error) { handleClose(self, error); });
  this.socket.on('end', function () { handleEnd(self); });
  this.socket.on('data', function (data) { self.parser.parse(data); });
  this.socket.on('error', function (error) { handleError.call(self, error); });
  this.socket.on('timeout', function (error) { handleError.call(self, error); });

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

  if (arguments.length) {
    // TODO add binary/buffer support
    this.request += resp.createRequestString.apply(null, arguments);
  }

  // TODO emit error if callback depth exceeded and return
  this.callbacks[this.callbacksEnd] = callback;
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
};

RedisClient.prototype.quit = function () {
  var self = this;
  var quitTimer = setTimeout(function () {
    handleError.call(self, new Error('Timeout'));
  }, 2000);

  this.call('QUIT', function (error) {
    clearTimeout(quitTimer);
    if (error) {
      handleError.call(self, error);
    }
  });
};

module.exports = RedisClient;

