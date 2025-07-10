import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.PORT = '4001';

// Global test timeout
jest.setTimeout(10000);

// Mock fetch for API calls
global.fetch = jest.fn();

// Console spy setup for testing
const originalConsole = console;
beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Reset fetch mock
    (fetch as jest.Mock).mockClear();
});

afterEach(() => {
    // Clean up after each test
    jest.restoreAllMocks();
});

// Helper function to mock successful API responses
export const mockSuccessfulApiResponse = (data: any) => {
    (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => data,
        text: async () => JSON.stringify(data)
    });
};

// Helper function to mock failed API responses
export const mockFailedApiResponse = (status: number = 500, statusText: string = 'Internal Server Error') => {
    (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status,
        statusText,
        json: async () => ({ error: statusText }),
        text: async () => statusText
    });
};

// Helper to create test MCP server
export const createTestMcpServer = () => {
    const tools = new Map();
    const prompts = new Map();

    return {
        tool: jest.fn((name, description, schema, handler) => {
            tools.set(name, { name, description, schema, handler });
        }),
        prompt: jest.fn((name, schema, handler) => {
            prompts.set(name, { name, schema, handler });
        }),
        connect: jest.fn(),
        _tools: tools,
        _prompts: prompts
    };
};