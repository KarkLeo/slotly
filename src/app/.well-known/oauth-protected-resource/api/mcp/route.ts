import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";
import { connection } from "next/server";
import { issuer, resourceUrl } from "@/mcp/config";

export async function GET(request: Request) {
  await connection();
  return protectedResourceHandler({
    authServerUrls: [issuer],
    resourceUrl: resourceUrl(),
  })(request);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
