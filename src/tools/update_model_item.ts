import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerUpdateModelItem(server: McpServer) {
  server.tool(
    "update_model_item",
    "Update a model item by ID",
    {
      model: z.string().refine((val) => val.length > 3, {
        message: "Invalid model name. Please provide longer than 3 letter name.",
      }).describe("the name of the model"),
      id: z.string().refine((val) => !!val, {
        message: "Invalid ID. Please provide a valid ID.",
      }).describe("the ID of the item to update"),
      data: z.record(z.any()).describe("the data object containing the fields to update")
    },
    async ({ model, id, data }) => {
      console.log(`Received update_model_item call for model ${model} with ID ${id}.`);
      
      const url = `http://localhost:3101/api/tables/${model}/${id}/`;
      const response = await fetch(url, {
        method: 'PUT',
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