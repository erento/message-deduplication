/**
 * run in console:
 * docker run --name some-redis -v $PWD/aaa:/data -p 6379:6379 -d redis:5.0-alpine redis-server --requirepass my#secret#passw0rd! --appendonly yes --appendfsync everysec --save 900 1 --save 300 10 --save 30 1000 --protected-mode yes --bind 0.0.0.0
 */

const redis = require('redis');

const client = redis.createClient(6379, '0.0.0.0');

console.log('client set');

client.on('connect', function() {
    console.log('connected');
});

client.auth('my#secret#passw0rd!');

console.log('after connect');

client.on('error', function(e) {
    console.error(`Redis error occurred. Name: "${e.name}". Message: "${e.message}".`);
});

console.log('after error');

client.set('framework', 'AngularJS');

console.log('after set');

client.get('framework', function(err, reply) {
    console.log('reply: ', reply);
});

console.log('after get');
