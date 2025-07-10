import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer) {
  server.prompt(
    "echo",
    { message: z.string() },
    ({ message }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `You are a generic CRUD API for any model.
          please process first, extract the model name from the following: ${message},
          and use MCP Tools to answer sort, simple, clean and direct answers.
          if the result status is "OK" return only JSON.`
        }
      }]
    })
  );
}
