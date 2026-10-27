import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Channel } from "./channels";
import { deliverDue, type DeliveryDeps } from "./deliver";
import { verifyLinkToken } from "./link-token";
import type { Notification } from "./notification";
import { testNotification } from "./test-notification";

vi.mock("@/db/notifications", () => ({
  claimDueNotifications: vi.fn(),
  finishNotification: vi.fn(),
}));
vi.mock("@/db/rate-limit", () => ({ takeRateLimit: vi.fn() }));

const now = new Date("2026-11-02T12:00:00Z").getTime();

let queue: Notification[][];
let deps: DeliveryDeps;
let deliver: ReturnType<typeof vi.fn<Channel["deliver"]>>;

function email(): Channel {
  return {
    kind: "email",
    address: (notification) => notification.recipientEmail,
    deliver,
  };
}

beforeEach(() => {
  vi.stubEnv("NOTIFICATION_LINK_SECRET", "a".repeat(64));
  vi.stubEnv("SITE_URL", "https://slotly.example");
  vi.spyOn(console, "error").mockImplementation(() => {});
  queue = [];
  deliver = vi.fn<Channel["deliver"]>().mockResolvedValue(undefined);
  deps = {
    claim: vi.fn(async () => queue.shift() ?? []),
    finish: vi.fn(async () => {}),
    takeRateLimit: vi.fn(async () => true),
    channels: [email()],
    now: () => now,
  };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("deliverDue", () => {
  it("sends a due notification and records the channel", async () => {
    const notification = testNotification("confirmed");
    queue = [[notification]];
    await expect(deliverDue(deps)).resolves.toEqual({
      sent: 1,
      retried: 0,
      skipped: 0,
    });
    expect(deps.claim).toHaveBeenCalledWith(20);
    expect(deliver).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "Запис підтверджено" }),
      notification,
      "mark@example.com",
    );
    expect(deps.finish).toHaveBeenCalledWith(notification.id, "sent", "email");
  });

  it("spends the daily email cap on each email", async () => {
    queue = [[testNotification("confirmed")]];
    await deliverDue(deps);
    expect(deps.takeRateLimit).toHaveBeenCalledWith(
      "notifications:email:day",
      50,
      86_400,
    );
  });

  it("signs the manage link for the recipient and points another time at the landing", async () => {
    const notification = testNotification(
      "declined",
      { locale: "en" },
      { status: "cancelled", primaryLocale: "uk" },
    );
    queue = [[notification]];
    await deliverDue(deps);
    const [message] = deliver.mock.calls[0];
    const [bookAgain, manage] = message.actions;
    expect(bookAgain.url).toBe("https://slotly.example/olena/en");
    const token = new URL(manage.url).searchParams.get("token")!;
    await expect(verifyLinkToken(token)).resolves.toEqual({
      userId: notification.recipientId,
      appointmentId: notification.appointment.id,
      audience: "client",
    });
  });

  it("links the landing without a locale in its primary language", async () => {
    queue = [[testNotification("declined", {}, { status: "cancelled" })]];
    await deliverDue(deps);
    expect(deliver.mock.calls[0][0].actions[0].url).toBe(
      "https://slotly.example/olena",
    );
  });

  it("retries a notification the channel failed to deliver", async () => {
    const notification = testNotification("confirmed");
    deliver.mockRejectedValue(new Error("Email provider answered 500"));
    queue = [[notification]];
    await expect(deliverDue(deps)).resolves.toEqual({
      sent: 0,
      retried: 1,
      skipped: 0,
    });
    expect(deps.finish).toHaveBeenCalledWith(
      notification.id,
      "retry",
      undefined,
      "Email provider answered 500",
    );
  });

  it("skips a recipient without a channel", async () => {
    const notification = testNotification("confirmed", {
      recipientEmail: null,
    });
    queue = [[notification]];
    await deliverDue(deps);
    expect(deliver).not.toHaveBeenCalled();
    expect(deps.finish).toHaveBeenCalledWith(
      notification.id,
      "skipped",
      undefined,
      "No channel reaches the recipient",
    );
  });

  it("skips an email over the daily cap and says so", async () => {
    const notification = testNotification("confirmed");
    vi.mocked(deps.takeRateLimit).mockResolvedValue(false);
    queue = [[notification]];
    await deliverDue(deps);
    expect(deliver).not.toHaveBeenCalled();
    expect(deps.finish).toHaveBeenCalledWith(
      notification.id,
      "skipped",
      undefined,
      "Daily email cap reached",
    );
    expect(console.error).toHaveBeenCalled();
  });

  it("skips a reminder for an appointment that is no longer confirmed, without spending the cap", async () => {
    const notification = testNotification(
      "reminder",
      {},
      { status: "cancelled" },
    );
    queue = [[notification]];
    await deliverDue(deps);
    expect(deps.takeRateLimit).not.toHaveBeenCalled();
    expect(deps.finish).toHaveBeenCalledWith(
      notification.id,
      "skipped",
      undefined,
      "No longer relevant",
    );
  });

  it("skips a reminder for an appointment that has started", async () => {
    queue = [
      [
        testNotification(
          "reminder",
          {},
          {
            startsAt: "2026-11-02T11:00:00Z",
            endsAt: "2026-11-02T12:30:00Z",
          },
        ),
      ],
    ];
    await expect(deliverDue(deps)).resolves.toMatchObject({ skipped: 1 });
  });

  it("skips any notification about an appointment that started over a day ago", async () => {
    queue = [
      [
        testNotification(
          "cancelledByMaster",
          {},
          {
            status: "cancelled",
            startsAt: "2026-11-01T11:00:00Z",
            endsAt: "2026-11-01T12:00:00Z",
          },
        ),
      ],
    ];
    await expect(deliverDue(deps)).resolves.toMatchObject({ skipped: 1 });
    expect(deliver).not.toHaveBeenCalled();
  });

  it("does not spend the cap again when retrying", async () => {
    queue = [[testNotification("confirmed", { attempts: 2 })]];
    await expect(deliverDue(deps)).resolves.toMatchObject({ sent: 1 });
    expect(deps.takeRateLimit).not.toHaveBeenCalled();
  });

  it("spends no cap on a message it cannot build", async () => {
    vi.stubEnv("NOTIFICATION_LINK_SECRET", "");
    queue = [[testNotification("confirmed")]];
    await expect(deliverDue(deps)).resolves.toMatchObject({ retried: 1 });
    expect(deps.takeRateLimit).not.toHaveBeenCalled();
    expect(deliver).not.toHaveBeenCalled();
  });

  it.each([
    ["the master already answered", { status: "confirmed" as const }],
    [
      "has run out",
      { status: "pending" as const, holdUntil: "2026-11-02T11:00:00Z" },
    ],
  ])(
    "skips a decision request for a booking that %s",
    async (_, appointment) => {
      queue = [[testNotification("decisionNeeded", {}, appointment)]];
      await expect(deliverDue(deps)).resolves.toMatchObject({ skipped: 1 });
      expect(deliver).not.toHaveBeenCalled();
    },
  );

  it("delivers a decision request while the booking waits", async () => {
    queue = [
      [
        testNotification(
          "decisionNeeded",
          {},
          { status: "pending", holdUntil: "2026-11-02T20:00:00Z" },
        ),
      ],
    ];
    await expect(deliverDue(deps)).resolves.toMatchObject({ sent: 1 });
  });

  it("keeps claiming batches until the queue is empty", async () => {
    queue = [
      [testNotification("confirmed"), testNotification("reminder")],
      [testNotification("bookedByMaster")],
    ];
    await expect(deliverDue(deps)).resolves.toMatchObject({ sent: 3 });
    expect(deps.claim).toHaveBeenCalledTimes(3);
  });

  it("stops taking batches after twenty seconds", async () => {
    let clock = now;
    deps.now = () => clock;
    deliver.mockImplementation(async () => {
      clock += 21_000;
    });
    queue = [[testNotification("confirmed")], [testNotification("confirmed")]];
    await expect(deliverDue(deps)).resolves.toMatchObject({ sent: 1 });
    expect(deps.claim).toHaveBeenCalledTimes(1);
  });
});
