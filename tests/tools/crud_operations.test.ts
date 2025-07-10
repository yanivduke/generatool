import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { registerDeleteModelItem } from '../../src/tools/delete_model_item.js';
import { registerReadModelItem } from '../../src/tools/read_model_item.js';
import { registerUpdateModelItem } from '../../src/tools/update_model_item.js';
import { createTestMcpServer, mockFailedApiResponse, mockSuccessfulApiResponse } from '../setup.js';

describe('CRUD Operations Tools', () => {
    let mockServer: any;

    beforeEach(() => {
        mockServer = createTestMcpServer();
        registerReadModelItem(mockServer);
        registerUpdateModelItem(mockServer);
        registerDeleteModelItem(mockServer);
    });

    describe('read_model_item Tool', () => {
        it('should register the read_model_item tool correctly', () => {
            expect(mockServer.tool).toHaveBeenCalledWith(
                'read_model_item',
                'Read (get) a specific model item by ID',
                expect.any(Object),
                expect.any(Function)
            );

            const registeredTool = mockServer._tools.get('read_model_item');
            expect(registeredTool).toBeDefined();
            expect(registeredTool.name).toBe('read_model_item');
        });

        it('should validate parameters correctly', async () => {
            const registeredTool = mockServer._tools.get('read_model_item');
            const handler = registeredTool.handler;

            // Test model name validation
            await expect(handler({
                model: 'ab', // Too short
                id: '123'
            })).rejects.toThrow();

            // Test ID validation
            await expect(handler({
                model: 'model',
                id: '' // Empty ID
            })).rejects.toThrow();
        });

        it('should read a model item successfully', async () => {
            const mockResponse = {
                id: '123',
                name: 'Test Item',
                status: 'active',
                createdAt: '2024-01-01T00:00:00Z'
            };

            mockSuccessfulApiResponse(mockResponse);

            const registeredTool = mockServer._tools.get('read_model_item');
            const handler = registeredTool.handler;

            const result = await handler({
                model: 'model',
                id: '123'
            });

            expect(result).toEqual({
                content: [{ type: 'text', text: JSON.stringify(mockResponse) }]
            });

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:3101/api/tables/model/123'
            );
        });

        it('should handle not found errors', async () => {
            mockFailedApiResponse(404, 'Not Found');

            const registeredTool = mockServer._tools.get('read_model_item');
            const handler = registeredTool.handler;

            await expect(handler({
                model: 'model',
                id: 'nonexistent'
            })).rejects.toThrow('CRUD API error: Not Found');
        });
    });

    describe('update_model_item Tool', () => {
        it('should register the update_model_item tool correctly', () => {
            expect(mockServer.tool).toHaveBeenCalledWith(
                'update_model_item',
                'Update a model item by ID',
                expect.any(Object),
                expect.any(Function)
            );

            const registeredTool = mockServer._tools.get('update_model_item');
            expect(registeredTool).toBeDefined();
            expect(registeredTool.name).toBe('update_model_item');
        });

        it('should validate parameters correctly', async () => {
            const registeredTool = mockServer._tools.get('update_model_item');
            const handler = registeredTool.handler;

            // Test model name validation
            await expect(handler({
                model: 'ab', // Too short
                id: '123',
                data: { name: 'Updated' }
            })).rejects.toThrow();

            // Test ID validation
            await expect(handler({
                model: 'model',
                id: '', // Empty ID
                data: { name: 'Updated' }
            })).rejects.toThrow();
        });

        it('should update a model item successfully', async () => {
            const updateData = {
                name: 'Updated Item',
                status: 'inactive'
            };

            const mockResponse = {
                id: '123',
                ...updateData,
                updatedAt: '2024-01-01T00:00:00Z'
            };

            mockSuccessfulApiResponse(mockResponse);

            const registeredTool = mockServer._tools.get('update_model_item');
            const handler = registeredTool.handler;

            const result = await handler({
                model: 'model',
                id: '123',
                data: updateData
            });

            expect(result).toEqual({
                content: [{ type: 'text', text: JSON.stringify(mockResponse) }]
            });

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:3101/api/tables/model/123/',
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                }
            );
        });

        it('should handle partial updates', async () => {
            const partialUpdate = { status: 'archived' };
            const mockResponse = {
                id: '123',
                name: 'Existing Item',
                status: 'archived',
                updatedAt: '2024-01-01T00:00:00Z'
            };

            mockSuccessfulApiResponse(mockResponse);

            const registeredTool = mockServer._tools.get('update_model_item');
            const handler = registeredTool.handler;

            const result = await handler({
                model: 'model',
                id: '123',
                data: partialUpdate
            });

            expect(result.content[0].text).toBe(JSON.stringify(mockResponse));
            expect(fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: JSON.stringify(partialUpdate)
                })
            );
        });

        it('should handle update conflicts', async () => {
            mockFailedApiResponse(409, 'Conflict');

            const registeredTool = mockServer._tools.get('update_model_item');
            const handler = registeredTool.handler;

            await expect(handler({
                model: 'model',
                id: '123',
                data: { name: 'Updated' }
            })).rejects.toThrow('CRUD API error: Conflict');
        });
    });

    describe('delete_model_item Tool', () => {
        it('should register the delete_model_item tool correctly', () => {
            expect(mockServer.tool).toHaveBeenCalledWith(
                'delete_model_item',
                'Delete a model item by ID',
                expect.any(Object),
                expect.any(Function)
            );

            const registeredTool = mockServer._tools.get('delete_model_item');
            expect(registeredTool).toBeDefined();
            expect(registeredTool.name).toBe('delete_model_item');
        });

        it('should validate parameters correctly', async () => {
            const registeredTool = mockServer._tools.get('delete_model_item');
            const handler = registeredTool.handler;

            // Test model name validation
            await expect(handler({
                model: 'ab', // Too short
                id: '123'
            })).rejects.toThrow();

            // Test ID validation
            await expect(handler({
                model: 'model',
                id: '' // Empty ID
            })).rejects.toThrow();
        });

        it('should delete a model item successfully', async () => {
            const mockResponse = {
                success: true,
                id: '123',
                message: 'Item deleted successfully'
            };

            mockSuccessfulApiResponse(mockResponse);

            const registeredTool = mockServer._tools.get('delete_model_item');
            const handler = registeredTool.handler;

            const result = await handler({
                model: 'model',
                id: '123'
            });

            expect(result).toEqual({
                content: [{ type: 'text', text: JSON.stringify(mockResponse) }]
            });

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:3101/api/tables/model/123',
                {
                    method: 'DELETE'
                }
            );
        });

        it('should handle deletion of non-existent items', async () => {
            mockFailedApiResponse(404, 'Not Found');

            const registeredTool = mockServer._tools.get('delete_model_item');
            const handler = registeredTool.handler;

            await expect(handler({
                model: 'model',
                id: 'nonexistent'
            })).rejects.toThrow('CRUD API error: Not Found');
        });

        it('should handle deletion conflicts', async () => {
            mockFailedApiResponse(409, 'Cannot delete: Item has dependencies');

            const registeredTool = mockServer._tools.get('delete_model_item');
            const handler = registeredTool.handler;

            await expect(handler({
                model: 'model',
                id: '123'
            })).rejects.toThrow('CRUD API error: Cannot delete: Item has dependencies');
        });
    });

    describe('Cross-tool Integration', () => {
        it('should handle complete CRUD workflow', async () => {
            // Create
            const createTool = mockServer._tools.get('create_model_item');
            if (createTool) {
                mockSuccessfulApiResponse({ data: [] }); // Schema call
                mockSuccessfulApiResponse({ id: '123', name: 'New Item' }); // Create call

                await createTool.handler({
                    model: 'model',
                    data: { name: 'New Item' }
                });
            }

            // Read
            mockSuccessfulApiResponse({ id: '123', name: 'New Item' });
            const readTool = mockServer._tools.get('read_model_item');
            const readResult = await readTool.handler({
                model: 'model',
                id: '123'
            });

            expect(readResult.content[0].text).toContain('New Item');

            // Update
            mockSuccessfulApiResponse({ id: '123', name: 'Updated Item' });
            const updateTool = mockServer._tools.get('update_model_item');
            const updateResult = await updateTool.handler({
                model: 'model',
                id: '123',
                data: { name: 'Updated Item' }
            });

            expect(updateResult.content[0].text).toContain('Updated Item');

            // Delete
            mockSuccessfulApiResponse({ success: true, id: '123' });
            const deleteTool = mockServer._tools.get('delete_model_item');
            const deleteResult = await deleteTool.handler({
                model: 'model',
                id: '123'
            });

            expect(deleteResult.content[0].text).toContain('success');
        });

        it('should handle concurrent operations on different models', async () => {
            const promises = [];

            // Read from multiple models
            mockSuccessfulApiResponse({ id: '1', type: 'user' });
            promises.push(
                mockServer._tools.get('read_model_item').handler({
                    model: 'users',
                    id: '1'
                })
            );

            mockSuccessfulApiResponse({ id: '2', type: 'product' });
            promises.push(
                mockServer._tools.get('read_model_item').handler({
                    model: 'products',
                    id: '2'
                })
            );

            mockSuccessfulApiResponse({ id: '3', type: 'order' });
            promises.push(
                mockServer._tools.get('read_model_item').handler({
                    model: 'orders',
                    id: '3'
                })
            );

            const results = await Promise.all(promises);

            expect(results).toHaveLength(3);
            results.forEach(result => {
                expect(result.content[0]).toHaveProperty('text');
            });
        });
    });

    describe('Error Handling Consistency', () => {
        it('should handle network errors consistently across all tools', async () => {
            const networkError = new Error('Network error');
            (fetch as jest.Mock).mockRejectedValue(networkError);

            const tools = ['read_model_item', 'update_model_item', 'delete_model_item'];

            for (const toolName of tools) {
                const tool = mockServer._tools.get(toolName);
                const params = toolName === 'update_model_item'
                    ? { model: 'model', id: '123', data: {} }
                    : { model: 'model', id: '123' };

                await expect(tool.handler(params)).rejects.toThrow('Network error');
            }
        });

        it('should handle malformed responses consistently', async () => {
            // Mock response that fails JSON parsing
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.reject(new Error('Invalid JSON'))
            });

            const readTool = mockServer._tools.get('read_model_item');
            await expect(readTool.handler({
                model: 'model',
                id: '123'
            })).rejects.toThrow('Invalid JSON');
        });
    });
});