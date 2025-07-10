import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import dotenv from "dotenv";
import express from "express";
import { registerSearchModelData } from "./tools/search_model_data";

import { registerPrompts } from "./prompts/prompts";
import { ModelsHelper } from "./resources/models_helper";
import { registerGenericCreateModelItem } from "./tools/create_generic_model_item";
import { setupMessageEndpoint, setupSSEEndpoint } from "./transports";

dotenv.config();

class DynamicMcpServer {
  static async init() {
    const server = new McpServer({
      name: "mcp-server",
      version: "1.0.0",
    });

    registerPrompts(server);
    registerSearchModelData(server);

    const modelsList = (await ModelsHelper.getModels()).data;
    console.log("modelsList: ", modelsList)
    for (let i = 0; i < modelsList.length; i++) {

      await registerGenericCreateModelItem(server, modelsList[i].route, modelsList[i].id);

    }
    const app = express();

    // Setup endpoints
    setupSSEEndpoint(app, server);
    setupMessageEndpoint(app);

    const port = parseInt(process.env.PORT || "4000", 10);
    app.listen(port, () => {
      console.log(`MCP server is running on port ${port}`);
    });
  }
}

DynamicMcpServer.init();




