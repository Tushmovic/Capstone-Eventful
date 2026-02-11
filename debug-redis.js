// debug-redis.js
const net = require('net');
const tls = require('tls');
const { URL } = require('url');

async function debugRedisConnection() {
  console.log('🔍 DEBUGGING REDIS CLOUD CONNECTION\n');
  
  const redisUrl = 'redis://default:XGaFFHOaY0cDPg6S5lNyDV2jz4jfbnAI@redis-18506.c341.af-south-1-1.ec2.cloud.redislabs.com:18506';
  
  // Parse the URL
  const url = new URL(redisUrl);
  const host = url.hostname;
  const port = parseInt(url.port);
  const protocol = url.protocol.replace(':', '');
  
  console.log(`Host: ${host}`);
  console.log(`Port: ${port}`);
  console.log(`Protocol: ${protocol}`);
  console.log(`Has auth: ${url.username ? 'Yes' : 'No'}`);
  
  // Test 1: Basic TCP connection
  console.log('\n🧪 Test 1: Testing basic TCP connection...');
  await testTCPConnection(host, port);
  
  // Test 2: Test with TLS if needed
  if (protocol === 'rediss') {
    console.log('\n🧪 Test 2: Testing TLS connection...');
    await testTLSConnection(host, port);
  }
  
  // Test 3: Test with node-redis
  console.log('\n🧪 Test 3: Testing with redis client...');
  await testRedisClient(redisUrl);
}

function testTCPConnection(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 5000;
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      console.log('  ✅ TCP connection successful');
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.log('  ❌ TCP connection timeout');
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (err) => {
      console.log(`  ❌ TCP connection error: ${err.message}`);
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

function testTLSConnection(host, port) {
  return new Promise((resolve) => {
    const socket = tls.connect({
      host: host,
      port: port,
      rejectUnauthorized: false,
      servername: host
    }, () => {
      console.log('  ✅ TLS handshake successful');
      socket.end();
      resolve(true);
    });
    
    socket.on('error', (err) => {
      console.log(`  ❌ TLS error: ${err.message}`);
      resolve(false);
    });
    
    socket.setTimeout(5000, () => {
      console.log('  ❌ TLS timeout');
      socket.destroy();
      resolve(false);
    });
  });
}

async function testRedisClient(redisUrl) {
  try {
    const { createClient } = require('redis');
    
    const client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 10000,
        tls: redisUrl.startsWith('rediss://'),
        rejectUnauthorized: false
      }
    });
    
    client.on('error', (err) => {
      console.log(`  ❌ Redis client error: ${err.message}`);
    });
    
    await client.connect();
    console.log('  ✅ Redis client connected');
    
    const pong = await client.ping();
    console.log(`  ✅ Ping response: ${pong}`);
    
    await client.quit();
    console.log('  ✅ Redis client quit successfully');
    
  } catch (error) {
    console.log(`  ❌ Redis client failed: ${error.message}`);
    console.log(`  Stack: ${error.stack}`);
  }
}

debugRedisConnection();