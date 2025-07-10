import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ModelsHelper } from "../resources/models_helper";

function mapDbTypeToZod(dbType: string): z.ZodTypeAny {
  const lowerType = dbType.toLowerCase();

  if (lowerType.includes('varchar') || lowerType.includes('text') || lowerType.includes('char')) {
    return z.string();
  } else if (lowerType.includes('int') || lowerType.includes('integer') || lowerType.includes('bigint')) {
    return z.number().int();
  } else if (lowerType.includes('float') || lowerType.includes('double') || lowerType.includes('decimal') || lowerType.includes('numeric')) {
    return z.number();
  } else if (lowerType.includes('bool') || lowerType.includes('boolean')) {
    return z.boolean();
  } else if (lowerType.includes('date') || lowerType.includes('time')) {
    return z.string(); // Keep dates as strings for now
  } else if (lowerType.includes('json')) {
    return z.record(z.any());
  } else {
    return z.string(); // Default fallback
  }
}

async function createDynamicSchema(model: string) {
  try {
    const modelFields = await ModelsHelper.getModelField(model);
    const schemaFields: Record<string, z.ZodTypeAny> = {};

    if (modelFields && modelFields.data && Array.isArray(modelFields.data)) {
      modelFields.data.forEach((field: any) => {
        if (field.name) {
          let fieldSchema = mapDbTypeToZod(field.type);

          // Apply string constraints if applicable
          if (fieldSchema instanceof z.ZodString) {
            if (field.maxLength && field.maxLength > 0) {
              fieldSchema = fieldSchema.max(field.maxLength);
            }

            fieldSchema = fieldSchema.describe(field.title);
          }

          // Make field optional if it's not required
          if (!field.isRequired) {
            fieldSchema = fieldSchema.optional();
          }

          schemaFields[field.name] = fieldSchema;
        }
      });
    }

    return z.object(schemaFields);
  } catch (error) {
    console.warn(`Failed to create dynamic schema for ${model}, falling back to generic schema:`, error);
    return z.record(z.any());
  }
}

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

      // Create dynamic schema based on model fields
      const dynamicSchema = await createDynamicSchema(model);

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