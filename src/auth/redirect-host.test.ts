import { describe, expect, it } from "vitest";
import { redirectHost } from "./redirect-host";

describe("redirectHost", () => {
  it("shows the host of a web callback", () => {
    expect(redirectHost("https://claude.ai/api/mcp/auth_callback")).toBe(
      "claude.ai",
    );
  });

  it("keeps the port of a local callback", () => {
    expect(redirectHost("http://localhost:6274/oauth/callback")).toBe(
      "localhost:6274",
    );
  });

  it("shows the scheme of a native app callback", () => {
    expect(redirectHost("cursor://anysphere.cursor-mcp/oauth/callback")).toBe(
      "cursor://anysphere.cursor-mcp",
    );
  });

  it("returns the raw value when it is not a URL", () => {
    expect(redirectHost("not a url")).toBe("not a url");
  });
});
