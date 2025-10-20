const redis = require('redis')

const client = redis.createClient({
    
    socket:{
        host:'127.0.0.1',
        port:6379
    }
});

client.on('connect',()=>{
    console.log('connected to redis server');

    
})

client.on('error', (err) => {
  console.error('redis connection error:', err);
});


(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.error('Redis connection failed:', err);
  }
})();




module.exports = client;