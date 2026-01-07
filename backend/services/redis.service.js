import redisClient from '../config/redis.config.js';

/**
 * Redis Caching Service
 */
class RedisService {
    /**
     * Set cache value
     * @param {string} key 
     * @param {any} value 
     * @param {number} ttl - Time to live in seconds (default 3600 = 1 hour)
     */
    async set(key, value, ttl = 3600) {
        try {
            if (!redisClient.isReady) return false;

            const stringValue = JSON.stringify(value);
            await redisClient.set(key, stringValue, {
                EX: ttl
            });
            return true;
        } catch (error) {
            console.error(`Redis SET error (key: ${key}):`, error);
            return false;
        }
    }

    /**
     * Get cache value
     * @param {string} key 
     */
    async get(key) {
        try {
            if (!redisClient.isReady) return null;

            const value = await redisClient.get(key);
            if (!value) return null;

            return JSON.parse(value);
        } catch (error) {
            console.error(`Redis GET error (key: ${key}):`, error);
            return null;
        }
    }

    /**
     * Delete cache value
     * @param {string} key 
     */
    async del(key) {
        try {
            if (!redisClient.isReady) return false;
            await redisClient.del(key);
            return true;
        } catch (error) {
            console.error(`Redis DEL error (key: ${key}):`, error);
            return false;
        }
    }

    /**
     * Clear keys by pattern (e.g., "products:*")
     * @param {string} pattern 
     */
    async clearPattern(pattern) {
        try {
            if (!redisClient.isReady) return false;

            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
            return true;
        } catch (error) {
            console.error(`Redis clearPattern error (pattern: ${pattern}):`, error);
            return false;
        }
    }

    /**
     * Increment a key
     * @param {string} key 
     */
    async incr(key) {
        try {
            if (!redisClient.isReady) return null;
            return await redisClient.incr(key);
        } catch (error) {
            console.error(`Redis INCR error (key: ${key}):`, error);
            return null;
        }
    }

    /**
     * Decrement a key
     * @param {string} key 
     */
    async decr(key) {
        try {
            if (!redisClient.isReady) return null;
            return await redisClient.decr(key);
        } catch (error) {
            console.error(`Redis DECR error (key: ${key}):`, error);
            return null;
        }
    }

    /**
     * Set expiration for a key
     * @param {string} key 
     * @param {number} ttl - Seconds
     */
    async expire(key, ttl) {
        try {
            if (!redisClient.isReady) return false;
            return await redisClient.expire(key, ttl);
        } catch (error) {
            console.error(`Redis EXPIRE error (key: ${key}):`, error);
            return false;
        }
    }

    /**
     * Hash Set
     * @param {string} key 
     * @param {string} field 
     * @param {any} value 
     */
    async hSet(key, field, value) {
        try {
            if (!redisClient.isReady) return false;
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            await redisClient.hSet(key, field, stringValue);
            return true;
        } catch (error) {
            console.error(`Redis HSET error (key: ${key}, field: ${field}):`, error);
            return false;
        }
    }

    /**
     * Hash Get
     * @param {string} key 
     * @param {string} field 
     */
    async hGet(key, field) {
        try {
            if (!redisClient.isReady) return null;
            const value = await redisClient.hGet(key, field);
            if (!value) return null;
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        } catch (error) {
            console.error(`Redis HGET error (key: ${key}, field: ${field}):`, error);
            return null;
        }
    }

    /**
     * Cache Middleware wrapper for Express
     * @param {string} keyPrefix - Prefix for the cache key
     * @param {number} ttl - TTL in seconds
     */
    cacheMiddleware(keyPrefix, ttl = 3600) {
        return async (req, res, next) => {
            // Only cache GET requests
            if (req.method !== 'GET') {
                return next();
            }

            const key = `${keyPrefix}:${req.originalUrl || req.url}`;

            try {
                const cachedData = await this.get(key);
                if (cachedData) {
                    res.set('X-Cache', 'HIT');
                    return res.json(cachedData);
                }

                res.set('X-Cache', 'MISS');
                // If not in cache, intercept the response and cache it
                const originalJson = res.json;
                res.json = (data) => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        this.set(key, data, ttl);
                    }
                    return originalJson.call(res, data);
                };

                next();
            } catch (error) {
                console.error('Redis middleware error:', error);
                next();
            }
        };
    }
}

export default new RedisService();
