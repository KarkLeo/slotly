import { describe, expect, it } from "vitest";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { registerTools, whoami } from "./tools";

describe("whoami", () => {
  it("describes the master and the connected client", () => {
    const result = whoami({
      token: "t",
      clientId: "client-1",
      scopes: ["email"],
      extra: { userId: "user-1", email: "master@example.com" },
    });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({
      userId: "user-1",
      email: "master@example.com",
      clientId: "client-1",
      scopes: ["email"],
    });
    expect(JSON.parse(result.content[0].text)).toEqual(
      result.structuredContent,
    );
  });

  it("omits the email when the token has none", () => {
    const result = whoami({
      token: "t",
      clientId: "client-1",
      scopes: [],
      extra: { userId: "user-1", email: null },
    });

    expect(result.structuredContent).not.toHaveProperty("email");
  });

  it("reports an error without auth info", () => {
    expect(whoami(undefined).isError).toBe(true);
  });
});

describe("registered tools", () => {
  type ToolConfig = { inputSchema?: z.ZodType; outputSchema?: z.ZodType };
  const tools = new Map<string, ToolConfig>();
  registerTools({
    registerTool: (name: string, config: ToolConfig) => tools.set(name, config),
  } as unknown as McpServer);

  it.each([...tools])(
    "%s declares schemas without nullable type arrays",
    (_name, { inputSchema, outputSchema }) => {
      for (const schema of [inputSchema, outputSchema]) {
        if (!schema) continue;
        expect(JSON.stringify(z.toJSONSchema(schema))).not.toMatch(/"type":\[/);
      }
    },
  );
});
