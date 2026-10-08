import type { AuthInfo, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AgentAuthExtra } from "./token";

const whoamiOutput = z.object({
  userId: z.string(),
  email: z.string().optional(),
  clientId: z.string(),
  scopes: z.array(z.string()),
});

export function whoami(auth: AuthInfo | undefined) {
  const extra = auth?.extra as AgentAuthExtra | undefined;
  if (!auth || !extra) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: "Not authenticated" }],
    };
  }

  const structuredContent: z.infer<typeof whoamiOutput> = {
    userId: extra.userId,
    ...(extra.email ? { email: extra.email } : {}),
    clientId: auth.clientId,
    scopes: auth.scopes,
  };
  return {
    structuredContent,
    content: [
      { type: "text" as const, text: JSON.stringify(structuredContent) },
    ],
  };
}

export function registerTools(server: McpServer) {
  server.registerTool(
    "whoami",
    {
      title: "Who am I",
      description:
        "Returns the Slotly account this connection acts for and the connected client.",
      outputSchema: whoamiOutput,
      annotations: { readOnlyHint: true },
    },
    (ctx) => whoami(ctx.http?.authInfo),
  );
}
