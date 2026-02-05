const { redisClient } = require('./dist/config/redis');

async function testRedis() {
  console.log('Testing Redis connection...');
  
  try {
    const connected = await redisClient.connect();
    
    if (connected) {
      console.log('✅ Redis connected successfully!');
      
      const pong = await redisClient.ping();
      console.log(`✅ Redis ping response: ${pong}`);
      
      // Test set/get
      await redisClient.set('test-key', { message: 'Hello Redis', timestamp: new Date() }, 10);
      console.log('✅ Test data set successfully');
      
      const value = await redisClient.get('test-key');
      console.log('✅ Test data retrieved:', value);
      
      console.log('\n🎉 Redis is working perfectly!');
    } else {
      console.log('❌ Redis connection failed');
    }
  } catch (error) {
    console.error('❌ Redis test error:', error.message);
  } finally {
    await redisClient.disconnect();
    process.exit(0);
  }
}

testRedis();