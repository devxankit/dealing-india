
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function clearCache() {
    const client = createClient({ url: REDIS_URL });

    client.on('error', (err) => console.error('Redis Client Error', err));

    try {
        await client.connect();
        console.log('Connected to Redis');

        // Clear all keys (flushall is safer for dev/test)
        // or specifically keys starting with vendors:

        const keys = await client.keys('vendors:*');
        if (keys.length > 0) {
            await client.del(keys);
            console.log(`Deleted ${keys.length} vendor keys`);
        }

        const b2bKeys = await client.keys('*b2b*');
        if (b2bKeys.length > 0) {
            await client.del(b2bKeys);
            console.log(`Deleted ${b2bKeys.length} b2b keys`);
        }

        console.log('Cache cleared successfully for vendors and b2b keys');

        await client.disconnect();
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}

clearCache();
