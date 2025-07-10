import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerSearchModelData(server: McpServer) {
  server.tool(
    "search_model_data",
    "search table JSON data, by model name, search fields, page size, page number and sorting fields and diraction.",
    {
        model: z.string().refine((val) => val.length>3 , {
          message: "Invalid model name. Please provide longer then 3 letter name.",
        }).describe("the name of the model, to return data from."),
        pageSize: z.number().refine((val) => val>=0 , {
          message: "Invalid page size. Please provide page size.",
        }).describe("the 'paging' page size for search result."),
        page: z.number().refine((val) => val>=1 , {
          message: "Invalid page. Please provide page.",
        }).describe("the current page for search result."),
        searchFields: z.object({
          name: z.string().refine((val) => !!val , {
            message: "Invalid search field name. Please provide search field name.",
          }).describe("the search field name."),
          value: z.string().refine((val) => !!val , {
            message: "Invalid search value. Please provide search field value.",
          }).describe("the search field value.")
        }).array(),
        sortFields: z.object({
          key: z.string().refine((val) => !!val , {
            message: "Invalid order field key. Please provide order field key.",
          }).describe("the order field key."),
          order: z.enum(["asc", "desc"]).refine((val) => !!val , {
            message: "Invalid order field value. Please provide order field value.",
          }).describe("the order field value.")
        }).array()
    },
    async ({ model, pageSize, page, searchFields, sortFields }) => {
      console.log(`Received search_model_data call for model ${model}.`);
      
      const url = `http://localhost:3101/api/tables/${model}?`;
      const response = await fetch(url + new URLSearchParams({
                psize: pageSize.toString(),
                pnum: page.toString(),
                sortBy: JSON.stringify(sortFields.map((sorting:any)=>{return {sort:sorting.key, order: sorting.order}})),
                searchBy: JSON.stringify(
                    searchFields ? searchFields.filter((filter)=>{
                        if(filter.value!='' && filter.value!=null)
                            return true;
                        return false;
                    }).map(seatchField => {
                      return {
                        id: seatchField.name,
                        type: 'text',
                        operator: '=',
                        value: seatchField.value
                      }
                    } ) :[]),
            }));

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