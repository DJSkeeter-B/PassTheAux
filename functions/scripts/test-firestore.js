#!/usr/bin/env node
const admin = require('firebase-admin');

const config = {
  projectId: 'passtheaux-f0585',
  credential: admin.credential.cert({
    projectId: 'passtheaux-f0585',
    clientEmail: 'emulator@example.com',
    privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Z3VS5JJcds3s9l2UUZwN5c6DEO9GDPx8GC9P2b7wQdQNUEC\nrKFBl9B/G/I3CpRrLKnYBJ5v6K2rCVqgKt3v60KkXCVfquC4lqSJqTjQBbkqTz3m\n9NXVkqZMlLZAYfhE9x4TddLQw2JD5w1l8LMKLw8MJ8IqT4RrZ5IFkDHLnCrvFqzV\nJZQAR9NjPMaM4gQBR0WHPj5Y8JQ0Sj2u8sVQcCVqZmGdXqmYM4F8LS3jvU0X0eZV\nNWdEPFCEGT2Y9KqM1p7vCNzKq8oKvCCVL4O7VqUGn4p0KdnI8WJQtLRVrVlpAi5R\nkLZKlqDlJDKzEXPxJ8i6RzvKpuXqGlnKVWEVOwIDAQABAoIBABm8BrV0jSz0jZSf\nJ3qH6gYxJ1MbpDdGZaLLqKvhKQYEwzqfJL1O3rCDi5mzYDGGBzPHkJLf5LrF6dwz\n5N7X8QFl7QhT7RhELKRDFsYIcqULnSXlExKVllKy5jLXCzlNJCZLq0A3ZgPBdKEO\nSWQhTdcr1Fx1nLhCVGHIVfkXvzvzULqXdEUpYcqIzrULwNTKX/kQfR+u6T/QTPFQ\nADZDNjLnvPl6lVKRXEPRKwPXJBdp0XCZK0r2A8RYvlGPmGJCeYqvEZS/DOwPTHIR\nxzJxBpHgZCi+FZCuQIYlKb2L3yT0Sl8JEQRyYVD3fIkM2lqL7N8xyNcCg9TOpSl8\njEEkXAECgYEA6e+qWYPGNOXYLz4F8G7Y8zAa4lH1DPJhPh0p1c5Hp4KeQF3JGKwP\nK5sAzxniBrA3IIp3CfR0p8sP2T6fvvDmVj3a9OXFEzSFxXSLDVYhI8mQTxGw4KXV\nMlWYVfJXqLi9mhQsW8vP7H1Sk7CEFdZ1OWPUW4rJGMkqC7Vxq+bnx50CgYEA5OVd\nA6H8FMzL1HlxJq0QfVGW6U4dW3FdCTZHxQKPCsKpXY4xJqAqB6s3F0TaqWKm3hbJ\nF5iBFDz5XkP4GbMqgQa9TBwzS2kHxl0WlqDnL3K1wf0OHn3OWf6BzWjqGSZhhjKJ\nV6RJXGvJkdXXRbU8rTdPtMKxPmqf9T8MaVkbZQECgYEAtIcpwn9w1q7xX5KcLzQx\nRzgMhFXHFwJXSPMbFfxLZ5cO2Jb6hx/bnKwJuPHDFnDd6bGZYXGJZHQU8dJ4rJKR\nvqDi9JZDZ8zR6bPb2D2v7B8L8/YIQGRVlKJBQHKzJZZ7TJ1Dq0B4L9L7sJBmXMGL\nlH+nMbv1a6gJO5Z3DUPYlXkCgYAw8AhDZPQQMVHUxCNV/JBDTV3DJhMX3VkR5fPF\nKGUe0tKT1HChZrNLKCx3RkHQZvfW3c/M1C8kKmZY2w3ZtvqZ5hpJ7VVqP/cJqTfB\nGnLVQkbCk1PbMTMqBnBQeZkq6TJX4xc5C1lzIpU9HNELq7QQqzRKL6pLQNiA4FLW\n4scBAQKBgEVjxdwQMWYLbG8l2d5OZ3Z6+BHAILVvF5O7bPZC3L7QfC8cEDyEGNSM\nMDPEU9RXqH1bN7E/9D1gPD9bXp9C8rKHEVVtqZ4Q3p6l3pY6c3j3rRm4+6hxEZkP\nVWK8zKYY5rCNBqIhDHtC6RhZW1H2LHR8fHN8QN1RKHqI8zJl0JqJ\n-----END RSA PRIVATE KEY-----\n'
  })
};

console.log('FIRESTORE_EMULATOR_HOST:', process.env.FIRESTORE_EMULATOR_HOST);
console.log('Initializing admin SDK...');

const app = admin.initializeApp(config);
const db = admin.firestore();

console.log('Writing to Firestore...');
db.doc('users/test-doc').set({ test: true })
  .then(() => {
    console.log('✓ Write succeeded');
    process.exit(0);
  })
  .catch(err => {
    console.error('✗ Write failed:', err.message);
    process.exit(1);
  });

// Timeout after 5 seconds
setTimeout(() => {
  console.error('✗ Timeout: no response from Firestore after 5 seconds');
  process.exit(2);
}, 5000);
