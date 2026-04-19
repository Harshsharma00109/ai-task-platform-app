'use strict';

// Load test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only_32chars';
process.env.JWT_EXPIRES_IN = '1h';
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/ai_task_platform_test';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = '6379';
process.env.RATE_LIMIT_MAX = '10000'; // Disable rate limiting for tests
