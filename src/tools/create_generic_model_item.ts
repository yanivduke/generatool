import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ModelsHelper } from "../resources/models_helper";


export async function registerGenericCreateModelItem(server: McpServer, model: string, model_id: string) {
  // Create dynamic schema based on model fields
  const dynamicSchemaShape = await ModelsHelper.createDynamicSchema(model_id);

  // Create a ZodObject from the schema shape for validation
  const dynamicSchema = z.object(dynamicSchemaShape);

  server.tool(
    "create_" + model + "_item",
    "Create a new " + model + " item",
    dynamicSchemaShape,
    async (args: any) => {
      console.log(`Received create_${model}_item call with args:`, args);

      // Validate data against dynamic schema
      const validatedData = dynamicSchema.parse(args);

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

      const result = (await response.json()).data;
      console.log(`Operation successful: Result = ${JSON.stringify(result)}`);

      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    }
  );
}