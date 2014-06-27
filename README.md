# node-redis-client

**node-redis-client** is a fast and lightweight [Redis](http://redis.io) client
for [Node.js](http://nodejs.org).

If you're interested in performance benchmarks, a comparison with
[node-redis](https://github.com/mranney/node_redis) can be found
[here](https://github.com/justinfreitag/node-redis-client/blob/master/bench).
Included is the slightly modified
[node-redis](https://github.com/mranney/node_redis) `multi-bench` utility. All
benchmarks were taken on an Ubuntu Server VM running on a late 2011 MBP.

## Usage

    // Import client
    var RedisClient = require('node-redis-client');

    // Create client
    var client = new RedisClient(6379, '127.0.0.1');

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

## License

Copyright (c) 2014 Justin Freitag. See the LICENSE file for license rights and
limitations (MIT).

