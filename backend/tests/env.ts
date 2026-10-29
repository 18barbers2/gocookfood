import { config } from 'dotenv';

const result = config({ path: '.env.test', override: true });

if (result.error) {
    throw Error('Could not load .env.test');
}

if (!process.env.DATABASE_URL?.includes('gocookfood_test')) {
    throw new Error('Tests must run against the test database');
}
