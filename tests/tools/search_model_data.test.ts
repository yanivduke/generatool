import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { registerSearchModelData } from '../../src/tools/search_model_data.js';
import { createTestMcpServer, mockFailedApiResponse, mockSuccessfulApiResponse } from '../setup.js';

describe('search_model_data Tool', () => {
    let mockServer: any;

    beforeEach(() => {
        mockServer = createTestMcpServer();
        registerSearchModelData(mockServer);
    });

    it('should register the search_model_data tool correctly', () => {
        expect(mockServer.tool).toHaveBeenCalledWith(
            'search_model_data',
            expect.stringContaining('search table JSON data'),
            expect.any(Object),
            expect.any(Function)
        );

        const registeredTool = mockServer._tools.get('search_model_data');
        expect(registeredTool).toBeDefined();
        expect(registeredTool.name).toBe('search_model_data');
    });

    it('should validate required parameters', async () => {
        const registeredTool = mockServer._tools.get('search_model_data');
        const handler = registeredTool.handler;

        // Test model name validation
        await expect(handler({
            model: 'ab', // Too short
            pageSize: 10,
            page: 1,
            searchFields: [],
            sortFields: []
        })).rejects.toThrow();

        // Test page validation
        await expect(handler({
            model: 'model',
            pageSize: 10,
            page: 0, // Invalid page
            searchFields: [],
            sortFields: []
        })).rejects.toThrow();

        // Test pageSize validation
        await expect(handler({
            model: 'model',
            pageSize: -1, // Invalid page size
            page: 1,
            searchFields: [],
            sortFields: []
        })).rejects.toThrow();
    });

    it('should perform basic search successfully', async () => {
        const mockResponse = {
            data: [
                { id: '1', name: 'Item 1', status: 'active' },
                { id: '2', name: 'Item 2', status: 'inactive' }
            ],
            total: 2,
            page: 1,
            pageSize: 10
        };

        mockSuccessfulApiResponse(mockResponse);

        const registeredTool = mockServer._tools.get('search_model_data');
        const handler = registeredTool.handler;

        const result = await handler({
            model: 'model',
            pageSize: 10,
            page: 1,
            searchFields: [],
            sortFields: []
        });

        expect(result).toEqual({
            content: [{ type: 'text', text: JSON.stringify(mockResponse) }]
        });

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('http://localhost:3101/api/tables/model?'),
            undefined
        );
    });

    it('should construct search parameters correctly', async () => {
        const mockResponse = { data: [], total: 0 };
        mockSuccessfulApiResponse(mockResponse);

        const registeredTool = mockServer._tools.get('search_model_data');
        const handler = registeredTool.handler;

        const searchFields = [
            { name: 'status', value: 'active' },
            { name: 'category', value: 'electronics' },
            { name: 'empty', value: '' } // Should be filtered out
        ];

        const sortFields = [
            { key: 'name', order: 'asc' as const },
            { key: 'created_at', order: 'desc' as const }
        ];

        await handler({
            model: 'products',
            pageSize: 20,
            page: 2,
            searchFields,
            sortFields
        });

        const expectedUrl = expect.stringContaining('http://localhost:3101/api/tables/products?');
        expect(fetch).toHaveBeenCalledWith(expectedUrl, undefined);

        // Verify the fetch call contains correct parameters
        const actualCall = (fetch as jest.Mock).mock.calls[0][0] as string;
        const url = new URL(actualCall);
        const params = url.searchParams;

        expect(params.get('psize')).toBe('20');
        expect(params.get('pnum')).toBe('2');

        // Check sort parameters
        const sortBy = JSON.parse(params.get('sortBy') || '[]');
        expect(sortBy).toEqual([
            { sort: 'name', order: 'asc' },
            { sort: 'created_at', order: 'desc' }
        ]);

        // Check search parameters (empty fields should be filtered out)
        const searchBy = JSON.parse(params.get('searchBy') || '[]');
        expect(searchBy).toEqual([
            { id: 'status', type: 'text', operator: '=', value: 'active' },
            { id: 'category', type: 'text', operator: '=', value: 'electronics' }
        ]);
    });

    it('should handle empty search and sort fields', async () => {
        const mockResponse = { data: [], total: 0 };
        mockSuccessfulApiResponse(mockResponse);

        const registeredTool = mockServer._tools.get('search_model_data');
        const handler = registeredTool.handler;

        await handler({
            model: 'model',
            pageSize: 10,
            page: 1,
            searchFields: [],
            sortFields: []
        });

        const actualCall = (fetch as jest.Mock).mock.calls[0][0] as string;
        const url = new URL(actualCall);
        const params = url.searchParams;

        const sortBy = JSON.parse(params.get('sortBy') || '[]');
        const searchBy = JSON.parse(params.get('searchBy') || '[]');

        expect(sortBy).toEqual([]);
        expect(searchBy).toEqual([]);
    });

    it('should filter out search fields with empty values', async () => {
        const mockResponse = { data: [], total: 0 };
        mockSuccessfulApiResponse(mockResponse);

        const registeredTool = mockServer._tools.get('search_model_data');
        const handler = registeredTool.handler;

        const searchFields = [
            { name: 'status', value: 'active' },
            { name: 'empty1', value: '' },
            { name: 'empty2', value: null as any },
            { name: 'category', value: 'electronics' }
        ];

        await handler({
            model: 'model',
            pageSize: 10,
            page: 1,
            searchFields,
            sortFields: []
        });

        const actualCall = (fetch as jest.Mock).mock.calls[0][0] as string;
        const url = new URL(actualCall);
        const searchBy = JSON.parse(url.searchParams.get('searchBy') || '[]');

        // Only non-empty fields should be included
        expect(searchBy).toHaveLength(2);
        expect(searchBy).toEqual([
            { id: 'status', type: 'text', operator: '=', value: 'active' },
            { id: 'category', type: 'text', operator: '=', value: 'electronics' }
        ]);
    });

    it('should handle API errors gracefully', async () => {
        mockFailedApiResponse(404, 'Not Found');

        const registeredTool = mockServer._tools.get('search_model_data');
        const handler = registeredTool.handler;

        await expect(handler({
            model: 'nonexistent',
            pageSize: 10,
            page: 1,
            searchFields: [],
            sortFields: []
        })).rejects.toThrow('CRUD API error: Not Found');
    });

    it('should handle large page sizes and complex queries', async () => {
        const mockResponse = {
            data: Array(100).fill(null).map((_, i) => ({ id: i, name: `Item ${i}` })),
            total: 1000,
            page: 1,
            pageSize: 100
        };

        mockSuccessfulApiResponse(mockResponse);

        const registeredTool = mockServer._tools.get('search_model_data');
        const handler = registeredTool.handler;

        const complexSearchFields = [
            { name: 'status', value: 'active' },
            { name: 'price_min', value: '100' },
            { name: 'price_max', value: '500' },
            { name: 'category', value: 'electronics' },
            { name: 'brand', value: 'Apple' }
        ];

        const complexSortFields = [
            { key: 'price', order: 'desc' as const },
            { key: 'rating', order: 'desc' as const },
            { key: 'name', order: 'asc' as const }
        ];

        const result = await handler({
            model: 'products',
            pageSize: 100,
            page: 1,
            searchFields: complexSearchFields,
            sortFields: complexSortFields
        });

        expect(result.content[0].text).toBe(JSON.stringify(mockResponse));

        const actualCall = (fetch as jest.Mock).mock.calls[0][0] as string;
        const url = new URL(actualCall);
        const params = url.searchParams;

        expect(params.get('psize')).toBe('100');

        const searchBy = JSON.parse(params.get('searchBy') || '[]');
        expect(searchBy).toHaveLength(5);

        const sortBy = JSON.parse(params.get('sortBy') || '[]');
        expect(sortBy).toHaveLength(3);
    });

    it('should validate search field structure', async () => {
        const registeredTool = mockServer._tools.get('search_model_data');
        const handler = registeredTool.handler;

        // Test invalid search field without name
        await expect(handler({
            model: 'model',
            pageSize: 10,
            page: 1,
            searchFields: [{ name: '', value: 'test' }],
            sortFields: []
        })).rejects.toThrow();

        // Test invalid search field without value
        await expect(handler({
            model: 'model',
            pageSize: 10,
            page: 1,
            searchFields: [{ name: 'status', value: '' }],
            sortFields: []
        })).rejects.toThrow();
    });

    it('should validate sort field structure', async () => {
        const registeredTool = mockServer._tools.get('search_model_data');
        const handler = registeredTool.handler;

        // Test invalid sort field without key
        await expect(handler({
            model: 'model',
            pageSize: 10,
            page: 1,
            searchFields: [],
            sortFields: [{ key: '', order: 'asc' as const }]
        })).rejects.toThrow();

        // Test invalid sort order
        await expect(handler({
            model: 'model',
            pageSize: 10,
            page: 1,
            searchFields: [],
            sortFields: [{ key: 'name', order: 'invalid' as any }]
        })).rejects.toThrow();
    });
});