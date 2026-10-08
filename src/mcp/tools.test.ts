import { describe, expect, it } from "vitest";
import { z } from "zod";
import { whoami, whoamiOutput } from "./tools";

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

  it("declares an output schema without nullable type arrays", () => {
    expect(JSON.stringify(z.toJSONSchema(whoamiOutput))).not.toMatch(
      /"type":\[/,
    );
  });

  it("reports an error without auth info", () => {
    expect(whoami(undefined).isError).toBe(true);
  });
});
