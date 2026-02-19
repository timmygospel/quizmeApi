import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

function makeClient(name: string): Redis | null {
    if (!REDIS_URL) return null;

    const client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    });

    client.on("connect", () => console.log(`✅ Redis [${name}] connected`));
    client.on("error", (err: Error) =>
        console.error(`❌ Redis [${name}] error:`, err.message)
    );

    return client;
}

export const redis: Redis | null = makeClient("main");
export const redisPub: Redis | null = makeClient("pub");
export const redisSub: Redis | null = makeClient("sub");
