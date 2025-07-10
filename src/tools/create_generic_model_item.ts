import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ModelsHelper } from "../resources/models_helper";


export async function registerGenericCreateModelItem(server: McpServer, model: string) {
  // Create dynamic schema based on model fields
  const dynamicSchema = await ModelsHelper.createDynamicSchema(model);
  server.tool(
    "create_" + model + "_item",
    "Create a new " + model + " item",
    dynamicSchema._output,
    async ({ model, data }) => {
      console.log(`Received create_model_item call for model ${model}.`);
      // Validate data against dynamic schema
      const validatedData = dynamicSchema.parse(data);

      const url = `http://localhost:3101/api/tables/${model}/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData)
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