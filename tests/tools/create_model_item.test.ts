import { beforeEach, describe, expect, it } from '@jest/globals';
import { registerCreateModelItem } from '../../src/tools/create_model_item.js';
import { createTestMcpServer, mockFailedApiResponse, mockSuccessfulApiResponse } from '../setup.js';

describe('create_model_item Tool', () => {
    let mockServer: any;

    beforeEach(() => {
        mockServer = createTestMcpServer();
        registerCreateModelItem(mockServer);
    });

    it('should register the create_model_item tool correctly', () => {
        expect(mockServer.tool).toHaveBeenCalledWith(
            'create_model_item',
            'Create a new model item',
            expect.any(Object),
            expect.any(Function)
        );

        const registeredTool = mockServer._tools.get('create_model_item');
        expect(registeredTool).toBeDefined();
        expect(registeredTool.name).toBe('create_model_item');
    });

    it('should validate model name length', async () => {
        const registeredTool = mockServer._tools.get('create_model_item');
        const handler = registeredTool.handler;

        await expect(handler({
            model: 'ab', // Too short
            data: { name: 'test' }
        })).rejects.toThrow();
    });

    it('should create a model item successfully', async () => {
        const mockResponse = {
            id: '123',
            name: 'Test Item',
            status: 'created'
        };

        // Mock the ModelsHelper.getModelField call
        mockSuccessfulApiResponse({
            data: [
                {
                    name: 'name',
                    type: 'varchar',
                    isRequired: true,
                    title: 'Name'
                }
            ]
        });

        // Mock the actual create API call
        mockSuccessfulApiResponse(mockResponse);

        const registeredTool = mockServer._tools.get('create_model_item');
        const handler = registeredTool.handler;

        const result = await handler({
            model: 'model',
            data: { name: 'Test Item' }
        });

        expect(result).toEqual({
            content: [{ type: 'text', text: JSON.stringify(mockResponse) }]
        });

        // Verify API calls were made
        expect(fetch).toHaveBeenCalledTimes(2);

        // First call for schema introspection
        expect(fetch).toHaveBeenNthCalledWith(1, expect.stringContaining('/api/tables/model?'));

        // Second call for actual creation
        expect(fetch).toHaveBeenNthCalledWith(2,
            'http://localhost:3101/api/tables/model/',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Test Item' })
            })
        );
    });

    it('should handle API errors gracefully', async () => {
        // Mock successful schema call but failed create call
        mockSuccessfulApiResponse({
            data: [
                {
                    name: 'name',
                    type: 'varchar',
                    isRequired: true,
                    title: 'Name'
                }
            ]
        });

        mockFailedApiResponse(500, 'Internal Server Error');

        const registeredTool = mockServer._tools.get('create_model_item');
        const handler = registeredTool.handler;

        await expect(handler({
            model: 'model',
            data: { name: 'Test Item' }
        })).rejects.toThrow('CRUD API error: Internal Server Error');
    });

    it('should apply dynamic schema validation', async () => {
        // Mock schema with required fields
        mockSuccessfulApiResponse({
            data: [
                {
                    name: 'email',
                    type: 'varchar',
                    isRequired: true,
                    maxLength: 50,
                    title: 'Email Address'
                },
                {
                    name: 'age',
                    type: 'integer',
                    isRequired: false,
                    title: 'Age'
                }
            ]
        });

        mockSuccessfulApiResponse({ id: '123', email: 'test@example.com' });

        const registeredTool = mockServer._tools.get('create_model_item');
        const handler = registeredTool.handler;

        const result = await handler({
            model: 'users',
            data: { email: 'test@example.com', age: 25 }
        });

        expect(result.content[0].text).toContain('test@example.com');
    });

    it('should fallback to generic schema when introspection fails', async () => {
        // Mock failed schema introspection
        mockFailedApiResponse(404, 'Not Found');

        // Mock successful creation with generic schema
        mockSuccessfulApiResponse({ id: '123', data: 'created' });

        const registeredTool = mockServer._tools.get('create_model_item');
        const handler = registeredTool.handler;

        const result = await handler({
            model: 'model',
            data: { anyField: 'anyValue' }
        });

        expect(result.content[0].text).toContain('created');
    });

    it('should handle different data types in dynamic schema', async () => {
        mockSuccessfulApiResponse({
            data: [
                {
                    name: 'title',
                    type: 'varchar',
                    isRequired: true,
                    title: 'Title'
                },
                {
                    name: 'count',
                    type: 'integer',
                    isRequired: true,
                    title: 'Count'
                },
                {
                    name: 'price',
                    type: 'decimal',
                    isRequired: false,
                    title: 'Price'
                },
                {
                    name: 'isActive',
                    type: 'boolean',
                    isRequired: false,
                    title: 'Active'
                },
                {
                    name: 'metadata',
                    type: 'json',
                    isRequired: false,
                    title: 'Metadata'
                }
            ]
        });

        mockSuccessfulApiResponse({ id: '123', created: true });

        const registeredTool = mockServer._tools.get('create_model_item');
        const handler = registeredTool.handler;

        const testData = {
            title: 'Test Product',
            count: 10,
            price: 99.99,
            isActive: true,
            metadata: { category: 'electronics' }
        };

        const result = await handler({
            model: 'products',
            data: testData
        });

        expect(fetch).toHaveBeenNthCalledWith(2,
            'http://localhost:3101/api/tables/products/',
            expect.objectContaining({
                body: JSON.stringify(testData)
            })
        );
    });
});