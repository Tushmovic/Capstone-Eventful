const { createClient } = require('redis');

async function testRedisCloud() {
  console.log('🔗 Testing Redis Cloud connection...\n');
  
  // Your Redis Cloud URL from Step 4
  const redisUrl = process.env.REDIS_URL || 'rediss://default:your_password@redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com:12345';
  
  console.log(`Connecting to: ${redisUrl.replace(/:[^:]*@/, ':*****@')}`);
  
  const client = createClient({
    url: redisUrl,
    socket: {
      tls: true,  // Enable TLS for Redis Cloud
      rejectUnauthorized: false  // For self-signed certs
    }
  });
  
  client.on('error', (err) => {
    console.log(`❌ Redis Client Error: ${err.message}`);
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to Redis Cloud!');
    
    const pong = await client.ping();
    console.log(`✅ Ping response: ${pong}`);
    
    // Test set/get
    await client.set('eventful_test', 'Hello from Redis Cloud');
    const value = await client.get('eventful_test');
    console.log(`✅ Test value: ${value}`);
    
    await client.quit();
    console.log('\n🎉 Redis Cloud is working perfectly!');
    
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check if password is correct');
    console.log('2. Try with/without TLS (redis:// vs rediss://)');
    console.log('3. Check if database is active in Redis Cloud dashboard');
  }
}

testRedisCloud();