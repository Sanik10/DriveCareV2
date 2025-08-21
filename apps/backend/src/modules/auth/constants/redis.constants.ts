export const REDIS_CONSTANTS = {
  CONNECTION: {
    DEFAULT_HOST: 'localhost',
    DEFAULT_PORT: 6380,
    RETRY_DELAY: 100,
    MAX_RETRIES: 3,
  }
} as const;

export const REDIS_CLIENT = 'REDIS_CLIENT';