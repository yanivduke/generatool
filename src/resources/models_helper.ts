import { z } from "zod";

export class ModelsHelper {
  static async getModelField(model_id: string): Promise<any> {
    console.log(`getModelField activated ${model_id}.`);
    const url = `http://localhost:3101/api/tables/model_field/?`;
    const response = await fetch(url + new URLSearchParams({
      psize: "0", // 0 will return all items - canceling paging
      pnum: "1",
      sortBy: JSON.stringify([{ sort: "sortNum" }]),
      searchBy: JSON.stringify([{
        id: "isEditable",
        type: 'text',
        operator: '=',
        value: true
      }, {
        id: "isActive",
        type: 'text',
        operator: '=',
        value: true
      }, {
        id: "parent_id",
        type: 'text',
        operator: '=',
        value: model_id
      }]),
    }));

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CRUD API error: ${errorText}`);
    }
    return await response.json();
  }
  static async getModels(): Promise<any> {
    console.log(`getModels activated.`);
    const url = `http://localhost:3101/api/tables/models/?`;
    const response = await fetch(url + new URLSearchParams({
      psize: "0", // 0 will return all items - canceling paging
      pnum: "1",
      sortBy: JSON.stringify([{ sort: "sortNum" }]),
      searchBy: JSON.stringify([{
        id: "isActive",
        type: 'text',
        operator: '=',
        value: true
      }]),
    }));

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CRUD API error: ${errorText}`);
    }
    return await response.json();
  }

  static mapDbTypeToZod(dbType: string): z.ZodTypeAny {
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

  async static createDynamicSchema(model: string) {
    try {
      const modelFields = await ModelsHelper.getModelField(model);
      const schemaFields: Record<string, z.ZodTypeAny> = {};

      if (modelFields && modelFields.data && Array.isArray(modelFields.data)) {
        modelFields.data.forEach((field: any) => {
          if (field.name) {
            let fieldSchema = ModelsHelper.mapDbTypeToZod(field.type);

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