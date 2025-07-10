import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import dotenv from "dotenv";
import express from "express";
import { authenticateToken } from "./auth/middleware.js";
import authRoutes from "./auth/routes.js";
import { registerCreateModelItem } from "./tools/create_model_item.js";
import { registerDeleteModelItem } from "./tools/delete_model_item.js";
import { registerReadModelItem } from "./tools/read_model_item.js";
import { registerSearchModelData } from "./tools/search_model_data.js";
import { registerUpdateModelItem } from "./tools/update_model_item.js";

import { setupMessageEndpoint, setupSSEEndpoint } from "./transports.js";

dotenv.config();

const server = new McpServer({
  name: "mcp-server",
  version: "1.0.0",
});

// Register tools
registerCreateModelItem(server);
registerReadModelItem(server);
registerUpdateModelItem(server);
registerDeleteModelItem(server);

registerSearchModelData(server);

// registerPrompts(server);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected MCP endpoints (require authentication)
setupSSEEndpoint(app, server, authenticateToken);
setupMessageEndpoint(app, authenticateToken);

const port = parseInt(process.env.PORT || "4000", 10);
app.listen(port, () => {
  console.log(`MCP server is running on port ${port}`);
});