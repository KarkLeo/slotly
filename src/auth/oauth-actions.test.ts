import { beforeEach, describe, expect, it, vi } from "vitest";
import { flashCookie } from "@/toasts/toast";
import { cookieSet } from "@/toasts/test-mocks";
import { decideAuthorization } from "./oauth-actions";

const oauth = { approveAuthorization: vi.fn(), denyAuthorization: vi.fn() };

vi.mock("@/db/server", () => ({
  createClient: async () => ({ auth: { oauth } }),
}));

beforeEach(() => vi.clearAllMocks());

describe("decideAuthorization", () => {
  it("flashes decisionFailed and returns to the consent page", async () => {
    oauth.approveAuthorization.mockResolvedValue({ data: null, error: {} });
    const data = new FormData();
    data.set("authorization_id", "abc");
    data.set("decision", "approve");
    await expect(decideAuthorization(data)).rejects.toThrow(
      "redirect:/oauth/consent?authorization_id=abc",
    );
    expect(cookieSet).toHaveBeenCalledWith(
      flashCookie,
      "error:decisionFailed",
      expect.objectContaining({ path: "/" }),
    );
  });
});
