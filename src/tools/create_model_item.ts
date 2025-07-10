import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerCreateModelItem(server: McpServer) {
  server.tool(
    "create_model_item",
    "Create a new model item",
    {
      model: z.string().refine((val) => val.length > 3, {
        message: "Invalid model name. Please provide longer than 3 letter name.",
      }).describe("the name of the model"),
      data: z.record(z.any()).describe("the data object containing the fields to create")
    },
    async ({ model, data }) => {
      console.log(`Received create_model_item call for model ${model}.`);
      
      const url = `http://localhost:3101/api/tables/${model}/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`CRUD API error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Operation successful: Result = ${JSON.stringify(result)}`);

      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    }
  );
}