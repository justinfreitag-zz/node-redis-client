'use strict';

var events = require('events');
var net = require('net');
var resp = require('./lib/resp');
var util = require('util');

function tryCallback(client, callback, error, response) {
  try {
    callback(error, response);
  } catch (exception) {
    client.emit('callback-error', error, error, response);
  }
}

function handleResponse(client, response) {
  var callback = client.callbacks[client.callbacksBegin];
  client.callbacksBegin = (client.callbacksBegin + 1) % client.callbacks.length;
  if (typeof callback === 'function') {
    if (response instanceof Error) {
      tryCallback(client, callback, response);
    } else {
      tryCallback(client, callback, null, response);
    }
  }
}

function handleError(client, error) {
  client.emit('error', error);
  client.socket.destroy();
  client.parser = null;
}

function handleConnect(client) {
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

var defaultOptions = {
  maxCallbackDepth: 5000
};

function RedisClient(port, host, options) {
  var self = this;

  if (host instanceof Object) {
    options = host;
    host = null;
  }
  this.options = util._extend(defaultOptions, options);
  this.request = '';
  this.callbacks = new Array(this.options.maxCallbackDepth);
  this.callbacksBegin = 0;
  this.callbacksEnd = 0;
  this.nextTick = false;

  this.parser = new resp.ResponseParser(options);
  this.parser.on('error', function (error) { handleError(self, error); });
  this.parser.on('response', function (response) { handleResponse(self, response); });

  this.socket = net.createConnection(port, host);
  this.socket.on('connect', function () { handleConnect(self); });
  this.socket.on('close', function (error) { handleClose(self, error); });
  this.socket.on('end', function () { handleEnd(self); });
  this.socket.on('data', function (data) { self.parser.parse(data); });
  this.socket.on('error', function (error) { handleError(self, error); });
  this.socket.on('timeout', function (error) { handleError(self, error); });

  events.EventEmitter.call(this);
}
util.inherits(RedisClient, events.EventEmitter);

RedisClient.prototype.call = function () {
  var self = this;
  var callback = null;
  if (typeof arguments[arguments.length-1] === 'function') {
    callback = arguments[arguments.length-1];
    --arguments.length;
  }
  if (arguments.length) {
    this.request += resp.stringify.apply(null, arguments);
  }
  this.callbacks[this.callbacksEnd] = callback;
  this.callbacksEnd = (this.callbacksEnd + 1) % this.callbacks.length;
  if (!this.nextTick) {
    this.nextTick = true;
    process.nextTick(function () {
      self.socket.write(self.request);
      self.request = '';
      self.nextTick = false;
    });
  }
};

RedisClient.prototype.quit = function () {
  var self = this;
  var quitTimer = setTimeout(function () {
    handleError(self, Error('Timeout on quit'));
  }, 2000);
  this.call('QUIT', function (error, result) {
    clearTimeout(quitTimer);
    if (error) {
      return handleError(error);
    }
  });
};

module.exports = RedisClient;

