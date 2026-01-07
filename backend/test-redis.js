import redisService from './services/redis.service.js';
import { connectRedis } from './config/redis.config.js';
import redisClient from './config/redis.config.js';

const testRedis = async () => {
    console.log('🧪 Starting Redis Connectivity Test...');

    try {
        // 1. Ensure connection
        await connectRedis();

        if (!redisClient.isReady) {
            console.error('❌ Redis client is NOT ready. Please check if Redis server is running.');
            process.exit(1);
        }
        console.log('✅ Connection confirmed.');

        // 2. Test SET operation
        const testKey = 'test_cache_key';
        const testData = {
            id: 1,
            message: 'Redis is working perfectly!',
            timestamp: new Date().toISOString()
        };

        console.log(`📡 Attempting to SET key: ${testKey}`);
        const setSuccess = await redisService.set(testKey, testData, 60); // 60 seconds TTL

        if (setSuccess) {
            console.log('✅ SET operation successful.');
        } else {
            throw new Error('SET operation failed.');
        }

        // 3. Test GET operation
        console.log(`📡 Attempting to GET key: ${testKey}`);
        const retrievedData = await redisService.get(testKey);

        if (retrievedData && retrievedData.message === testData.message) {
            console.log('✅ GET operation successful. Data matches!');
            console.log('📦 Retrieved Data:', retrievedData);
        } else {
            throw new Error('GET operation failed or data mismatch.');
        }

        // 4. Test DELETE operation
        console.log(`📡 Attempting to DELETE key: ${testKey}`);
        const delSuccess = await redisService.del(testKey);

        if (delSuccess) {
            console.log('✅ DELETE operation successful.');
        } else {
            throw new Error('DELETE operation failed.');
        }

        // 5. Final Verification
        const finalCheck = await redisService.get(testKey);
        if (finalCheck === null) {
            console.log('✅ Final Verification: Key successfully removed.');
        }

        console.log('\n✨ ALL REDIS TESTS PASSED SUCCESSFULLY! ✨');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ REDIS TEST FAILED:', error.message);
        process.exit(1);
    }
};

testRedis();
