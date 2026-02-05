const { createClient } = require('redis');

async function test() {
  console.log('Testing Redis connection...');
  
  const client = createClient({
    url: 'redis://localhost:6379'
  });

  client.on('error', (err) => {
    console.log('Redis Error:', err.message);
  });

  try {
    await client.connect();
    console.log('✅ Redis connected!');
    
    await client.set('test', 'Hello Redis');
    const value = await client.get('test');
    console.log('✅ Test value:', value);
    
    await client.disconnect();
    console.log('✅ Redis disconnected');
  } catch (error) {
    console.log('❌ Redis failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure Redis is running');
    console.log('2. Check: redis-cli ping');
    console.log('3. Try WSL method above');
  }
}

test();