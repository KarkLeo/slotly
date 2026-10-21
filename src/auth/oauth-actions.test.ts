import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieSet, redirectError } from "@/test/server-mocks";
import { decideAuthorization } from "./oauth-actions";

const oauth = { approveAuthorization: vi.fn(), denyAuthorization: vi.fn() };

vi.mock("@/db/server", () => ({
  createClient: async () => ({ auth: { oauth } }),
}));

function decision(value: string) {
  const data = new FormData();
  data.set("authorization_id", "abc");
  data.set("decision", value);
  return data;
}

beforeEach(() => vi.clearAllMocks());

describe("decideAuthorization", () => {
  it("stays on the page with a decisionFailed toast", async () => {
    oauth.approveAuthorization.mockResolvedValue({ data: null, error: {} });
    await expect(decideAuthorization({}, decision("approve"))).resolves.toEqual(
      {
        toast: { type: "error", key: "decisionFailed" },
      },
    );
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("returns to the client after a decision", async () => {
    oauth.denyAuthorization.mockResolvedValue({
      data: { redirect_url: "https://client.example/cb" },
      error: null,
    });
    await expect(decideAuthorization({}, decision("deny"))).rejects.toThrow(
      redirectError("https://client.example/cb"),
    );
    expect(oauth.denyAuthorization).toHaveBeenCalledWith("abc", {
      skipBrowserRedirect: true,
    });
  });
});
