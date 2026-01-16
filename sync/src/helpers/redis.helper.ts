import { createClient } from 'redis';

class RedisHelper {
    public client;

    constructor() {
        this.client = createClient({
            url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`
        });

        this.client.on('error', (err) => console.log('Redis Client Error', err));

        console.log('Redis Client created', this.client);
    }

    async connect() {
        if (!this.client.isOpen) {
            await this.client.connect();
            console.log('Connected to Redis');
        }
    }

    async get(key: string): Promise<string | null> {
        return await this.client.get(key);
    }

    async set(key: string, value: string): Promise<void> {
        await this.client.set(key, value);
    }
}

export default new RedisHelper();
