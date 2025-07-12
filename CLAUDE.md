# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a TypeScript MCP (Model Context Protocol) server that provides complete CRUD API integration tools. The server acts as a bridge between MCP clients and a REST API running on localhost:3101, allowing MCP clients to perform comprehensive Create, Read, Update, Delete, and Search operations on table data.

## Development Commands

### Build and Development
```bash
npm run dev          # Development with hot reload using ts-node
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled JavaScript from dist/
npm run clean        # Remove dist/ directory
npm run type-check   # TypeScript validation without compilation
```

### Testing
```bash
npm test            # Run Jest test suite (Jest configured but no tests written)
```

## Code Architecture

### Core Components

#### DynamicMcpServer (src/server.ts)
- Main server class that dynamically registers CRUD tools for each active model
- Automatically discovers models from the CRUD API at startup
- Integrates Express server with MCP transport layer
- Runs on port 4000 by default

#### ModelsHelper (src/resources/models_helper.ts) 
- Core utility for dynamic schema generation and API integration
- Maps database field types to Zod validation schemas
- Provides methods for fetching model definitions from localhost:3101
- Enables type-safe operations across any table structure

#### MCP Tools (src/tools/)
Five generic CRUD tools that work with any model:
- `search_model_data.ts`: Search/pagination with filtering and sorting
- `create_generic_model_item.ts`: Create items with dynamic validation
- `read_model_item.ts`: Retrieve items by ID
- `update_model_item.ts`: Update existing items
- `delete_model_item.ts`: Delete items by ID

#### Transport Layer (src/transports.ts)
- SSE (Server-Sent Events) transport for real-time MCP communication
- Session management for multiple clients
- Message routing and error handling

### Dynamic System Design
The server automatically discovers available models from the CRUD API and generates:
- Zod validation schemas from field definitions
- MCP tool registrations for each model
- Type-safe request/response handling
- Model-specific documentation and examples

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

### Prerequisites
- CRUD API must be running on localhost:3101
- All endpoints should follow the specified route structure
- API should return JSON responses
- Model and field metadata must be available via API endpoints

## Important Notes
- The server expects the CRUD API to be available at startup
- All model operations are generic and work with any table structure
- The modular design allows easy extension and maintenance
- Each tool is stateless and can be called independently
- TypeScript compilation targets ES2022 with CommonJS modules
- SSE transport configuration in mcp_sse_config.json sets endpoint to http://localhost:4000/sse
