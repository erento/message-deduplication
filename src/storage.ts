import * as redis from 'redis';
import {DeliveryInfo, DeliveryStorage} from './domain';

const DEFAULT_REDIS_PASSWORD: string = 'my#secret#passw0rd!';
const map: Map<string, DeliveryInfo> = new Map<string, DeliveryInfo>();

function createStorage (storeInMemoryOnly: boolean): DeliveryStorage<DeliveryInfo> {
    if (storeInMemoryOnly) {
        return {
            get: (key: string): Promise<DeliveryInfo | undefined> => new Promise((resolve: Function, reject: Function): void => {
                const value: DeliveryInfo | undefined = map.get(key);

                return !value ? reject(`Value for ${key} not found.`) : resolve(value);
            }),
            set: (key: string, value: DeliveryInfo): Promise<void> => new Promise<void>((resolve: Function, reject: Function): void => {
                try {
                    map.set(key, value);
                    return resolve();
                } catch {
                }

                return reject(`Unknown error.`);
            }),
        };
    }

    let redisClient: redis.RedisClient;
    try {
        const redisOptions: object | undefined = process.env.MD_REDIS_OPTIONS ? JSON.parse(process.env.MD_REDIS_OPTIONS) : undefined;
        redisClient = redis.createClient(
            process.env.MD_REDIS_PORT ? +process.env.MD_REDIS_PORT : 6379,
            process.env.MD_REDIS_HOSTNAME || '127.0.0.1',
            redisOptions,
        );
    } catch (e) {
        throw new Error(`Creation of redis client failed. Error: "${e.message}".`);
    }

    redisClient.on('error', (e: Error): void => {
        console.error(`Redis error occurred. Name: "${e.name}". Message: "${e.message}".`);
    });

    if (process.env.MD_REDIS_PASSWORD !== '') {
        redisClient.auth(process.env.MD_REDIS_PASSWORD || DEFAULT_REDIS_PASSWORD);
    }

    return {
        get: (key: string): Promise<DeliveryInfo | undefined> => new Promise((resolve: Function, reject: Function): void => {
            redisClient.get(
                key,
                (error: Error | null, reply: string): void => error ? reject(error.message) : resolve(JSON.parse(reply)),
            );
        }),
        set: (key: string, value: DeliveryInfo, duration?: number): Promise<void> =>
            new Promise<void>((resolve: Function, reject: Function): void => {
                redisClient.set(
                    key,
                    JSON.stringify(value),
                    'EX',
                    duration || +(process.env.MD_MAX_MESSAGE_DURATION || 864000),
                    (error: Error | null, reply: 'OK' | undefined): void => error ? reject(error.message) : resolve(reply),
                );
            }),
    };
}

export function getDeliveryStorage (storeInMemoryOnly: boolean): DeliveryStorage<DeliveryInfo> {
    return createStorage(storeInMemoryOnly);
}
