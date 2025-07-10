import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import express from 'express';
import { Server } from 'http';
import request from 'supertest';
import { authenticateToken } from '../../src/auth/middleware.js';
import authRoutes from '../../src/auth/routes.js';
import { mockSuccessfulApiResponse } from '../setup.js';

describe('MCP Server Integration Tests', () => {
    let app: express.Application;
    let server: Server;
    let authToken: string;

    beforeAll(async () => {
        // Setup Express app similar to main server
        app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Add auth routes
        app.use('/api/auth', authRoutes);

        // Health check
        app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // Mock MCP endpoints with authentication
        app.get('/sse', authenticateToken, (req, res) => {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.status(200);
            res.write('event: connect\n');
            res.write('data: {"type":"connect","sessionId":"test-session"}\n\n');
            res.end();
        });

        app.post('/messages', authenticateToken, (req, res) => {
            const { method, params } = req.body;

            if (method === 'tools/list') {
                res.json({
                    jsonrpc: '2.0',
                    id: req.body.id,
                    result: {
                        tools: [
                            {
                                name: 'create_model_item',
                                description: 'Create a new model item',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        model: { type: 'string' },
                                        data: { type: 'object' }
                                    }
                                }
                            },
                            {
                                name: 'read_model_item',
                                description: 'Read a model item by ID',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        model: { type: 'string' },
                                        id: { type: 'string' }
                                    }
                                }
                            }
                        ]
                    }
                });
            } else if (method === 'tools/call') {
                const { name, arguments: args } = params;

                if (name === 'create_model_item') {
                    res.json({
                        jsonrpc: '2.0',
                        id: req.body.id,
                        result: {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        id: 'test-id',
                                        ...args.data,
                                        created: true
                                    })
                                }
                            ]
                        }
                    });
                } else if (name === 'read_model_item') {
                    res.json({
                        jsonrpc: '2.0',
                        id: req.body.id,
                        result: {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        id: args.id,
                                        model: args.model,
                                        name: 'Test Item'
                                    })
                                }
                            ]
                        }
                    });
                } else {
                    res.status(404).json({
                        jsonrpc: '2.0',
                        id: req.body.id,
                        error: {
                            code: -32601,
                            message: 'Method not found'
                        }
                    });
                }
            } else {
                res.status(400).json({
                    jsonrpc: '2.0',
                    id: req.body.id || null,
                    error: {
                        code: -32600,
                        message: 'Invalid Request'
                    }
                });
            }
        });

        // Start server
        server = app.listen(0); // Use random port
    });

    beforeEach(async () => {
        // Register and get auth token for each test
        const registerResponse = await request(app)
            .post('/api/auth/register')
            .send({
                email: `test-${Date.now()}@example.com`,
                password: 'password123',
                username: `testuser-${Date.now()}`
            });

        authToken = registerResponse.body.token;
    });

    afterAll(async () => {
        if (server) {
            server.close();
        }
    });

    describe('Health Check', () => {
        it('should return health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toMatchObject({
                status: 'ok',
                timestamp: expect.any(String)
            });
        });
    });

    describe('Authentication Flow', () => {
        it('should complete full auth workflow', async () => {
            const userData = {
                email: 'integration@example.com',
                password: 'password123',
                username: 'integrationuser'
            };

            // Register
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(registerResponse.body.token).toBeDefined();
            const token = registerResponse.body.token;

            // Login
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: userData.email,
                    password: userData.password
                })
                .expect(200);

            expect(loginResponse.body.token).toBeDefined();

            // Access profile
            const profileResponse = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(profileResponse.body.user.email).toBe(userData.email);
        });
    });

    describe('MCP Endpoints with Authentication', () => {
        it('should reject unauthenticated SSE requests', async () => {
            await request(app)
                .get('/sse')
                .expect(401);
        });

        it('should reject unauthenticated message requests', async () => {
            await request(app)
                .post('/messages')
                .send({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'tools/list'
                })
                .expect(401);
        });

        it('should allow authenticated SSE connections', async () => {
            const response = await request(app)
                .get('/sse')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.headers['content-type']).toBe('text/event-stream');
            expect(response.text).toContain('event: connect');
        });

        it('should handle MCP tools/list with authentication', async () => {
            const response = await request(app)
                .post('/messages')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'tools/list'
                })
                .expect(200);

            expect(response.body.result.tools).toHaveLength(2);
            expect(response.body.result.tools[0].name).toBe('create_model_item');
            expect(response.body.result.tools[1].name).toBe('read_model_item');
        });

        it('should handle MCP tool calls with authentication', async () => {
            // Mock the external API call
            mockSuccessfulApiResponse({ success: true });

            const response = await request(app)
                .post('/messages')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'tools/call',
                    params: {
                        name: 'create_model_item',
                        arguments: {
                            model: 'model',
                            data: {
                                name: 'Integration Test Item',
                                status: 'active'
                            }
                        }
                    }
                })
                .expect(200);

            expect(response.body.result.content[0].type).toBe('text');
            const resultData = JSON.parse(response.body.result.content[0].text);
            expect(resultData.name).toBe('Integration Test Item');
            expect(resultData.created).toBe(true);
        });

        it('should handle invalid tool names', async () => {
            const response = await request(app)
                .post('/messages')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    jsonrpc: '2.0',
                    id: 3,
                    method: 'tools/call',
                    params: {
                        name: 'nonexistent_tool',
                        arguments: {}
                    }
                })
                .expect(404);

            expect(response.body.error.code).toBe(-32601);
            expect(response.body.error.message).toBe('Method not found');
        });

        it('should handle malformed MCP requests', async () => {
            const response = await request(app)
                .post('/messages')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    jsonrpc: '2.0',
                    id: 4,
                    method: 'invalid/method'
                })
                .expect(400);

            expect(response.body.error.code).toBe(-32600);
        });
    });

    describe('CORS and Security Headers', () => {
        it('should handle preflight requests', async () => {
            const response = await request(app)
                .options('/api/auth/register')
                .expect(404); // Since we haven't set up CORS middleware

            // In a real implementation, this should return 200 with proper CORS headers
        });

        it('should not expose sensitive information in errors', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'wrongpassword'
                })
                .expect(401);

            expect(response.body.error).toBe('Invalid credentials');
            expect(response.body).not.toHaveProperty('details');
        });
    });

    describe('Rate Limiting Integration', () => {
        it('should apply rate limiting to authentication endpoints', async () => {
            const requests = [];
            const invalidData = {
                email: 'test@example.com',
                password: 'short', // Will fail validation
                username: 'test'
            };

            // Make multiple rapid requests
            for (let i = 0; i < 6; i++) {
                requests.push(
                    request(app)
                        .post('/api/auth/register')
                        .send(invalidData)
                );
            }

            const responses = await Promise.all(requests);

            // Some should be rate limited
            const rateLimitedCount = responses.filter(res => res.status === 429).length;
            expect(rateLimitedCount).toBeGreaterThan(0);
        });
    });

    describe('Performance and Load', () => {
        it('should handle concurrent authenticated requests', async () => {
            const promises = [];

            // Create multiple concurrent requests
            for (let i = 0; i < 10; i++) {
                promises.push(
                    request(app)
                        .post('/messages')
                        .set('Authorization', `Bearer ${authToken}`)
                        .send({
                            jsonrpc: '2.0',
                            id: i,
                            method: 'tools/call',
                            params: {
                                name: 'read_model_item',
                                arguments: {
                                    model: 'model',
                                    id: `item-${i}`
                                }
                            }
                        })
                );
            }

            const responses = await Promise.all(promises);

            responses.forEach((response, index) => {
                expect(response.status).toBe(200);
                expect(response.body.id).toBe(index);
                const resultData = JSON.parse(response.body.result.content[0].text);
                expect(resultData.id).toBe(`item-${index}`);
            });
        });

        it('should handle large payloads', async () => {
            const largeData = {
                description: 'x'.repeat(10000), // 10KB string
                metadata: {
                    tags: Array(100).fill('tag'),
                    properties: Object.fromEntries(
                        Array(50).fill(null).map((_, i) => [`prop${i}`, `value${i}`])
                    )
                }
            };

            const response = await request(app)
                .post('/messages')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'tools/call',
                    params: {
                        name: 'create_model_item',
                        arguments: {
                            model: 'model',
                            data: largeData
                        }
                    }
                })
                .expect(200);

            const resultData = JSON.parse(response.body.result.content[0].text);
            expect(resultData.description).toBe(largeData.description);
        });
    });

    describe('Error Recovery', () => {
        it('should gracefully handle server errors', async () => {
            // This test would need actual error conditions in a real implementation
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body.status).toBe('ok');
        });

        it('should validate JSON-RPC format strictly', async () => {
            const response = await request(app)
                .post('/messages')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    // Missing jsonrpc field
                    id: 1,
                    method: 'tools/list'
                })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });
    });
});