import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import dotenv from "dotenv";
import express from "express";
import { registerSearchModelData } from "./tools/search_model_data";

import { registerPrompts } from "./prompts/prompts";
import { setupMessageEndpoint, setupSSEEndpoint } from "./transports";

dotenv.config();

const server = new McpServer({
  name: "mcp-server",
  version: "1.0.0",
});

// Register tools

// registerCreateModelItem(server);
// registerReadModelItem(server);
// registerUpdateModelItem(server);
// registerDeleteModelItem(server);

registerSearchModelData(server);

registerPrompts(server);

const app = express();

// Setup endpoints
setupSSEEndpoint(app, server);
setupMessageEndpoint(app);

const port = parseInt(process.env.PORT || "4000", 10);
app.listen(port, () => {
  console.log(`MCP server is running on port ${port}`);
});