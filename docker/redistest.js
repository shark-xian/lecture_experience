const redis = require('redis');

const client = redis.createClient('6379', '127.0.0.1');


client.on('connect', () => {
  console.log('Redis client connected');
});

client.on('error', (err) => {
  console.log(`Something went wrong ${err}`);
});

client.set('my test key', 'my test value', redis.print);


client.hmset('managers', { test: 'works for me', route: 66 });

let cute = {
  manager: 'hey baby',
  peers: [1, 2, 3, 4, 5],
};

cute = JSON.stringify(cute);
client.hmset('rooms', { abc: cute });

client.hmget('rooms', '00f8ce9b-260d-431b-b70f-08eb677633a8', (err, object) => {
  console.log(JSON.parse(object[0]));
});


client.rpush(['frameworks', 'angularjs', 'backbone'], (err, reply) => {
  console.log(reply); // prints 2
});
client.rget('frameworks', (err, object) => {
  console.log(object);
});
// client.hgetall('key', function(err, object) {
//     console.log(object);
// });

// client.hmset('key', { test: "key", route: 66 })
// client.hmget('key', 'test' ,function(err, object) {
//     console.log(object);
// });


// client.rpush(['frameworks', 'angularjs', 'backbone'], function(err, reply) {
//     console.log(err); //prints 2
// });
