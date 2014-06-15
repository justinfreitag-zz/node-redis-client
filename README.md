# node-redis-client

*Redis-client* is a *lightweight* and *fast* [*Redis*](http://redis.io)
client for [*Node.js*](http://nodejs.org). I could be more descriptive, but that
would just add weight and slow it down.

If you're interested in *benchmarks*, there's a slightly modified version of
the [node-redis multi-bench utility](https://github.com/mranney/node_redis/blob/master/multi_bench.js)
in [/bin](https://github.com/justinfreitag/node-redis-client/blob/master/bin)
that may be used for comparison.

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

      // Multi `COMMAND` block, with callback only for `EXEC`
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

    // Fatal client error
    client.on('error', function (error) { ... });

    // Non-fatal client error
    client.on('callback-error', function (error) { ... });

## License

Copyright (c) 2014 Justin Freitag. See the LICENSE file for license rights and
limitations (MIT).
