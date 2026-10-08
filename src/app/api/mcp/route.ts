import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { issuer, jwks, resourceMetadataPath, siteUrl } from "@/mcp/config";
import { createTokenVerifier } from "@/mcp/token";
import { registerTools } from "@/mcp/tools";

const handler = createMcpHandler(registerTools, {
  serverInfo: { name: "slotly", version: "0.1.0" },
});
const verify = createTokenVerifier({ jwks, issuer });

function handle(request: Request) {
  return withMcpAuth(handler, (_request, token) => verify(token), {
    required: true,
    resourceUrl: siteUrl(),
    resourceMetadataPath,
  })(request);
}

export { handle as DELETE, handle as GET, handle as POST };
