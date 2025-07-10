import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerDeleteModelItem(server: McpServer) {
  server.tool(
    "delete_model_item",
    "Delete a model item by ID",
    {
      model: z.string().refine((val) => val.length > 3, {
        message: "Invalid model name. Please provide longer than 3 letter name.",
      }).describe("the name of the model"),
      id: z.string().refine((val) => !!val, {
        message: "Invalid ID. Please provide a valid ID.",
      }).describe("the ID of the item to delete")
    },
    async ({ model, id }) => {
      console.log(`Received delete_model_item call for model ${model} with ID ${id}.`);
      
      const url = `http://localhost:3101/api/tables/${model}/${id}`;
      const response = await fetch(url, {
        method: 'DELETE'
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