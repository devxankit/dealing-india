import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
// console.log(process.env.REDIS_URL);
const redisUrl = process.env.REDIS_URL;
// Redis Client Configuration
const client = createClient({
    url: redisUrl,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.error('Redis reconnect failed after 10 attempts');
                return new Error('Redis reconnection failed');
            }
            // Exponential backoff
            return Math.min(retries * 100, 3000);
        }
    }
});

client.on('error', (err) => console.error('Redis Client Error:', err));
// client.on('connect', () => console.log('Redis Client Connecting...'));
// client.on('ready', () => console.log('Redis Client Ready and Connected!'));
client.on('reconnecting', () => console.log('Redis Client Reconnecting...'));

/**
 * Connect to Redis
 */
export const connectRedis = async () => {
    try {
        if (!client.isOpen) {
            await client.connect();
        }
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        // Don't crash the app if Redis fails, but log it
        if (isProduction) {
            // In production, we might want to alert someone
        }
    }
};

export default client;
