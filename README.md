# node-redis-client [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][depstat-image]][depstat-url]

**node-redis-client** is a fast and lightweight [Redis][redis] client for
[Node.js][nodejs]

If you're interested in performance benchmarks, a comparison with
[node-redis][node-redis] can be found in the bench directory. Included is a
slightly modified [node-redis][node-redis] `multi-bench` utility. All benchmarks
were taken on an Ubuntu Server VM running on a late 2011 MBP.

## Usage

    // Import
    var RedisClient = require('node-redis-client');

    // Create client
    var client = new RedisClient(options);

    // Client connected to Redis
    client.on('connect', function () {

      // Simple ping/pong with callback
      client.call('PING', function (error, result) {
        assert.equal(result, 'PONG');
      });

      // Multiple parameters with callback
      clienti.call('SET', 'foo', 'bar', function (error, result) {
        assert.equal(result, 'OK');
      });

      // Multi block with callback only on EXEC
      client.call('MULTI');
      client.call('SET', 'foo', 'bar');
      client.call('GET', 'foo');
      client.call('EXEC', function (error, results) {
        assert.equal(results[0], 'OK');
        assert.equal(results[1], 'BAR');

        // Quit client
        client.quit();
      });
    });

    // Client closed
    client.on('close', function (error) { ... });

    // Non-fatal error response when callback omitted
    client.on('call-error', function (error) { ... });

    // Fatal client error
    client.on('error', function (error) { ... });

### RedisClient options

#### port

- Type: `number`
- Default: `6379`

#### host

- Type: `string`
- Default: `127.0.0.1`

#### path

- Type: `string // unix domain socket`

#### db

- Type: `number`
- Default: `0`

#### maxCallbackDepth

- Type: `number`
- Default: `256`

## Testing

Linting, coverage and complexity checks are handled by [gulp-test][gulp-test].
Enter `gulp` from your command line for options.

## License

Copyright (c) 2014 Justin Freitag. See the LICENSE file for license rights and
limitations (MIT).

[npm-url]: https://npmjs.org/package/node-redis-client
[npm-image]: https://badge.fury.io/js/node-redis-client.png

[travis-url]: http://travis-ci.org/justinfreitag/node-redis-client
[travis-image]: https://travis-ci.org/justinfreitag/node-redis-client.png?branch=master

[depstat-url]: https://david-dm.org/justinfreitag/node-redis-client
[depstat-image]: https://david-dm.org/justinfreitag/node-redis-client.png

[redis]: http://redis.io
[nodejs]: http://nodejs.org
[node-redis]: https://github.com/mranney/node_redis
[gulp-test]: https://github.com/justinfreitag/gulp-test

