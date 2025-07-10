import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { authenticateToken } from '../../src/auth/middleware.js';
import authRoutes, { users } from '../../src/auth/routes.js';

describe('Authentication System', () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/auth', authRoutes);

        // Test protected route
        app.get('/protected', authenticateToken, (req, res) => {
            res.json({ message: 'Protected route accessed', user: req.user });
        });

        // Clear users before each test
        users.clear();
    });

    afterEach(() => {
        users.clear();
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                username: 'testuser'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body).toMatchObject({
                message: 'User registered successfully',
                user: {
                    email: userData.email,
                    username: userData.username
                },
                token: expect.any(String)
            });

            expect(response.body.user.id).toBeDefined();
            expect(response.body.user.createdAt).toBeDefined();
        });

        it('should reject registration with invalid email', async () => {
            const userData = {
                email: 'invalid-email',
                password: 'password123',
                username: 'testuser'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.error).toBe('Validation failed');
        });

        it('should reject registration with short password', async () => {
            const userData = {
                email: 'test@example.com',
                password: '123',
                username: 'testuser'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.error).toBe('Validation failed');
        });

        it('should reject registration with duplicate email', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                username: 'testuser'
            };

            // Register first user
            await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            // Try to register with same email
            const duplicateData = {
                email: 'test@example.com',
                password: 'password456',
                username: 'anotheruser'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(duplicateData)
                .expect(409);

            expect(response.body.error).toBe('User with this email or username already exists');
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Register a test user
            await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    username: 'testuser'
                });
        });

        it('should login successfully with correct credentials', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(200);

            expect(response.body).toMatchObject({
                message: 'Login successful',
                user: {
                    email: loginData.email,
                    username: 'testuser'
                },
                token: expect.any(String)
            });
        });

        it('should reject login with incorrect email', async () => {
            const loginData = {
                email: 'wrong@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(401);

            expect(response.body.error).toBe('Invalid credentials');
        });

        it('should reject login with incorrect password', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(401);

            expect(response.body.error).toBe('Invalid credentials');
        });

        it('should reject login with invalid email format', async () => {
            const loginData = {
                email: 'invalid-email',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(400);

            expect(response.body.error).toBe('Validation failed');
        });
    });

    describe('GET /api/auth/profile', () => {
        let authToken: string;

        beforeEach(async () => {
            // Register and login to get token
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    username: 'testuser'
                });

            authToken = registerResponse.body.token;
        });

        it('should return user profile with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.user).toMatchObject({
                email: 'test@example.com',
                username: 'testuser'
            });
        });

        it('should reject access without token', async () => {
            const response = await request(app)
                .get('/api/auth/profile')
                .expect(401);

            expect(response.body.error).toBe('Authentication required');
        });

        it('should reject access with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.error).toBe('Authentication required');
        });
    });

    describe('Authentication Middleware', () => {
        let authToken: string;

        beforeEach(async () => {
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    username: 'testuser'
                });

            authToken = registerResponse.body.token;
        });

        it('should allow access to protected route with valid token', async () => {
            const response = await request(app)
                .get('/protected')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.message).toBe('Protected route accessed');
            expect(response.body.user.email).toBe('test@example.com');
        });

        it('should reject access to protected route without token', async () => {
            const response = await request(app)
                .get('/protected')
                .expect(401);

            expect(response.body.error).toBe('Access token required');
        });

        it('should reject access to protected route with malformed token', async () => {
            const response = await request(app)
                .get('/protected')
                .set('Authorization', 'InvalidFormat')
                .expect(401);

            expect(response.body.error).toBe('Access token required');
        });
    });

    describe('Rate Limiting', () => {
        it('should apply rate limiting to auth endpoints', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'tooshort',
                username: 'testuser'
            };

            // Make multiple rapid requests to trigger rate limiting
            const requests = Array(6).fill(null).map(() =>
                request(app)
                    .post('/api/auth/register')
                    .send(userData)
            );

            const responses = await Promise.all(requests);

            // Some requests should be rate limited (429 status)
            const rateLimitedResponses = responses.filter(res => res.status === 429);
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });
    });
});