# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript MCP (Model Context Protocol) server that provides complete CRUD API integration tools. The server acts as a bridge between MCP clients and a REST API running on localhost:3101, allowing MCP clients to perform comprehensive Create, Read, Update, Delete, and Search operations on table data.

## Development Commands

```bash
# Install dependencies
npm install

# Development with live reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run production server
npm start

# Run tests
npm test

# Test with MCP Inspector
npx @modelcontextprotocol/inspector ./build/server.js
```

## Architecture

The project follows a modular architecture with separated concerns:

### Directory Structure
```
src/
├── tools/                          # Individual tool implementations
│   ├── search_model_data.ts        # Search/pagination/filtering
│   ├── read_model_item.ts          # Read single item by ID
│   ├── create_generic_model_item.ts# Create new generic item
│   ├── update_model_item.ts        # Update existing item
│   └── delete_model_item.ts        # Delete item by ID
├── prompts/                        # MCP prompt definitions
│   └── prompts.ts
├── resources/                      # MCP resources
├── workflow/                       # Workflow definitions
├── server.ts                       # Main entry point with tools registration
└── transports.ts                   # SSE transport layer
```

### Key Components

- **MCP Server**: Uses `@modelcontextprotocol/sdk` to create tools and prompts
- **Express Server**: Provides HTTP endpoints for SSE (`/sse`) and message handling (`/messages`)
- **Transport Layer**: Manages SSE connections and message routing between MCP clients and server
- **External API Integration**: Makes HTTP requests to `localhost:3101/api/tables/` endpoints
- **Modular Tools**: Each CRUD operation is implemented as a separate module for maintainability

## CRUD API Integration

This MCP server integrates with a CRUD API running on `localhost:3101` with the following route structure:

### MCP Tool to API Endpoint Mapping

| MCP Tool Name | HTTP Method | API Endpoint | Description |
|---------------|-------------|--------------|-------------|
| `search_model_data` | GET | `/:model/` | Search, paging and sorting model items |
| `read_model_item` | GET | `/:model/:id` | Get model item by ID |
| `create_model_item` | POST | `/:model/` | Create new model item |
| `update_model_item` | PUT | `/:model/:id` | Update model item by ID |
| `delete_model_item` | DELETE | `/:model/:id` | Delete model item by ID |

### API Endpoint Details
- **GET** `/:model/` - Search, paging and sorting model items
  - Query params: `pnum` (page number), `psize` (page size), `sortBy` (sorting fields), `searchBy` (search filters)
- **GET** `/:model/:id` - Get model item by ID
- **POST** `/:model/` - Create new model item (row) with generic body
- **PUT** `/:model/:id` - Update model item by ID
- **DELETE** `/:model/:id` - Delete model item by ID

## Available MCP Tools

### 1. search_model_data
**Purpose**: Search table JSON data with pagination, filtering, and sorting
**Parameters**:
- `model` (string): Model name (min 4 chars) - the table/model to search
- `pageSize` (number): Page size for pagination (≥0)
- `page` (number): Current page number (≥1)
- `searchFields` (array): Search criteria with `name` and `value` fields
- `sortFields` (array): Sort criteria with `key` and `order` (asc/desc)

### 2. read_model_item
**Purpose**: Read (get) a specific model item by ID
**Parameters**:
- `model` (string): Model name (min 4 chars)
- `id` (string): ID of the item to retrieve

### 3. create_model_item
**Purpose**: Create a new model item
**Parameters**:
- `model` (string): Model name (min 4 chars)
- `data` (object): Data object containing fields to create

### 4. update_model_item
**Purpose**: Update a model item by ID
**Parameters**:
- `model` (string): Model name (min 4 chars)
- `id` (string): ID of the item to update
- `data` (object): Data object containing fields to update

### 5. delete_model_item
**Purpose**: Delete a model item by ID
**Parameters**:
- `model` (string): Model name (min 4 chars)
- `id` (string): ID of the item to delete

## Tool Implementation Details

### Input Validation
- All tools use Zod schemas for parameter validation
- Model names must be longer than 3 characters
- IDs are required and validated for non-empty strings
- Data objects use `z.record(z.any())` for flexible field support

### Response Format
- All tools return JSON responses wrapped in MCP-compatible content format
- Responses include the raw API response data as text content
- Error handling provides meaningful error messages

### HTTP Integration
- Tools make appropriate HTTP requests (GET, POST, PUT, DELETE) to the CRUD API
- Headers include `Content-Type: application/json` for POST/PUT requests
- Error responses from the API are properly handled and propagated

## Environment Configuration

The server uses environment variables for configuration:
- `PORT`: Server port (default: 4000)

## Testing and Development

### MCP Inspector Testing
Use the MCP Inspector to test tools and prompts interactively:
```bash
npx @modelcontextprotocol/inspector ./build/server.js
```

### Prerequisites
- CRUD API must be running on localhost:3101
- All endpoints should follow the specified route structure
- API should return JSON responses

### Development Workflow
1. Start the CRUD API server on port 3101
2. Run the MCP server in development mode: `npm run dev`
3. Use MCP Inspector to test individual tools
4. Verify all CRUD operations work correctly

## Code Maintenance Guidelines

### Adding New Tools
1. Create a new file in `src/tools/`
2. Export a registration function that takes `McpServer` parameter
3. Import and call the registration function in `src/server.ts`
4. Follow the existing pattern for Zod validation and error handling

### Modifying Existing Tools
1. Each tool is self-contained in its own file
2. Update the Zod schema if parameter validation changes
3. Ensure HTTP method and URL construction remain correct
4. Test changes with MCP Inspector

### Error Handling
- All tools should handle HTTP errors gracefully
- Use meaningful error messages that help with debugging
- Validate inputs before making API calls
- Log operations for debugging purposes

## Important Notes

- The server expects the CRUD API to be available at startup
- All model operations are generic and work with any table structure
- The modular design allows easy extension and maintenance
- Each tool is stateless and can be called independently
