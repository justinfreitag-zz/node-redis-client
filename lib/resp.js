'use strict';

var events = require('eventemitter3');
var util = require('util');

exports.stringify = function () {
  var request = '*' + arguments.length + '\r\n';
  for (var i = 0; i < arguments.length; i++) {
    if (typeof arguments[i] === 'string') {
      request += '$' + arguments[i].length + '\r\n' + arguments[i] + '\r\n';
    } else {
      var s = '' + arguments[i];
      request += '$' + s.length + '\r\n' + s + '\r\n';
    }
  }
  return request;
};

function decodeString(buffer, begin, end) {
  var tmp = '';
  for (var i = begin; i < end; i++) {
    tmp += String.fromCharCode(buffer[i]);
  }
  return tmp;
}

function copyBuffer(buffer, begin, end) {
  if ((end - begin) < 256) {
    return decodeString(buffer, begin, end);
  }
  return buffer.toString('utf-8', begin, end);
}

function seekTerminator(parser) {
  var offset = parser.offset + 1;
  while (parser.buffer[offset] !== 0x0d && parser.buffer[offset+1] !== 0x0a) {
    ++offset;
    if (offset >= parser.buffer.length) {
      return null;
    }
  }
  parser.offset = offset + 2;
  return offset;
}

function parseSize(parser) {
  var begin = parser.offset;
  var end = seekTerminator(parser);
  if (end === null) {
    return null;
  }
  var size = decodeString(parser.buffer, begin, end);
  return parseInt(size, 10);
}

function parseSimpleString(parser) {
  var begin = parser.offset;
  var end = seekTerminator(parser);
  if (end === null) {
    return null;
  }
  return copyBuffer(parser.buffer, begin, end);
}

function parseError(parser) {
  var response = parseSimpleString(parser);
  if (response !== null) {
    response = new Error(response);
  }
  return response;
}

function parseBulkString(parser) {
  var size = parseSize(parser);
  if (size === null) {
    return null;
  }
  if (size === -1) {
    return -1;
  }
  var begin = parser.offset;
  var end = parser.offset + size;
  if ((end + 2) > parser.buffer.length) {
    return null;
  }
  parser.offset = end + 2;
  return copyBuffer(parser.buffer, begin, end);
}

function parseInteger(parser) {
  var begin = parser.offset;
  var end = seekTerminator(parser);
  if (end === null) {
    return null;
  }
  return parseInt(decodeString(parser.buffer, begin, end), 10);
}

function parseArray(parser) {
  var size = parseSize(parser);
  if (size === null) {
    return null;
  }
  if (size === -1) {
    return -1;
  }
  if ((parser.offset + (size * 4)) > parser.buffer.length) {
    return null;
  }
  var responses = [];
  for (var i = 0; i < size; i++) {
    if ((parser.offset + 4) > parser.buffer.length) {
      return null;
    }
    var type = parser.buffer[parser.offset++];
    var response = parseType(parser, type);
    if (response === null) {
      return null;
    }
    if (response === -1) {
      response = null;
    }
    responses[i] = response;
  }
  return responses;
}

function parseType(parser, type) {
  if (type === 43) { // +
    return parseSimpleString(parser);
  }
  if (type === 36) { // $
    return parseBulkString(parser);
  }
  if (type === 58) { // :
    return parseInteger(parser);
  }
  if (type === 42) { // *
    return parseArray(parser);
  }
  if (type === 45) { // -
    return parseError(parser);
  }
  parser.emit('error', new Error('Unexpected type: ' + type));
  return null;
}

function appendBuffer(parser, buffer) {
  if (parser.buffer === null || parser.offset >= parser.buffer.length) {
    parser.buffer = buffer;
  } else {
    parser.buffer = Buffer.concat([parser.buffer.slice(parser.offset), buffer]);
  }
  parser.offset = 0;
}

function ResponseParser() {
  this.buffer = null;
  this.offset = 0;

  events.EventEmitter.call(this);
}
util.inherits(ResponseParser, events.EventEmitter);

ResponseParser.prototype.parse = function (buffer) {
  appendBuffer(this, buffer);
  while ((this.offset + 4) <= this.buffer.length) {
    var offset = this.offset;
    var type = this.buffer[this.offset++];
    var response = parseType(this, type);
    if (response === null) {
      this.offset = offset;
      break;
    }
    if (response === -1) {
      response = null;
    }
    this.emit('response', response);
  }
};

exports.ResponseParser = ResponseParser;

