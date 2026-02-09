const { createClient } = require('redis');

async function testRedisCloud() {
  console.log('🔗 Testing Redis Cloud Connection...\n');
  
  // Use your Redis Cloud URL
  const redisUrl = 'rediss://default:XGaFFHOaY0cDPg6S5lNyDV2jz4jfbnAI@redis-18506.c341.af-south-1-1.ec2.cloud.redislabs.com:18506';
  
  console.log(`URL: ${redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//*****:*****@')}`);
  
  const client = createClient({
    url: redisUrl,
    socket: {
      tls: true,
      rejectUnauthorized: false
    }
  });
  
  client.on('error', (err) => {
    console.log(`❌ Redis Error: ${err.message}`);
  });
  
  client.on('connect', () => {
    console.log('✅ Connected to Redis Cloud');
  });
  
  try {
    await client.connect();
    
    const pong = await client.ping();
    console.log(`✅ Ping: ${pong}`);
    
    // Test set/get
    await client.set('eventful_test', JSON.stringify({ 
      message: 'Hello from Redis Cloud', 
      timestamp: new Date().toISOString() 
    }));
    
    const value = await client.get('eventful_test');
    console.log(`✅ Get test: ${value}`);
    
    await client.quit();
    console.log('\n🎉 Redis Cloud is working perfectly!');
    
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check if Redis Cloud database is active');
    console.log('2. Verify password is correct');
    console.log('3. Try without TLS: redis:// instead of rediss://');
    console.log('4. Check firewall/network settings');
  }
}

testRedisCloud();