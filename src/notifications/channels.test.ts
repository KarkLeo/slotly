import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/emails/send";
import { emailChannel, pickChannel, type Channel } from "./channels";
import type { NotificationMessage } from "./message";
import { testNotification } from "./test-notification";

vi.mock("@/emails/send", () => ({ sendEmail: vi.fn() }));

afterEach(() => vi.clearAllMocks());

const message: NotificationMessage = {
  subject: "Запис підтверджено",
  title: "Запис підтверджено",
  intro: "Майстер підтвердив ваш запис.",
  details: [{ label: "Майстер", value: "Olena" }],
  comment: null,
  actions: [{ label: "Керувати записом", url: "https://slotly.example/l" }],
  note: null,
};

function fakeChannel(kind: Channel["kind"], address: string | null): Channel {
  return { kind, address: () => address, deliver: vi.fn() };
}

describe("pickChannel", () => {
  it("delivers by email to the recipient's address", () => {
    expect(pickChannel(testNotification("confirmed"))).toEqual({
      channel: emailChannel,
      address: "mark@example.com",
    });
  });

  it("finds no channel for a recipient without an email", () => {
    expect(
      pickChannel(testNotification("confirmed", { recipientEmail: null })),
    ).toBeNull();
  });

  it("takes the first channel the recipient can be reached by", () => {
    const telegram = fakeChannel("telegram", "@mark");
    const email = fakeChannel("email", "mark@example.com");
    expect(
      pickChannel(testNotification("confirmed"), [
        fakeChannel("telegram", null),
        telegram,
        email,
      ]),
    ).toEqual({ channel: telegram, address: "@mark" });
  });
});

describe("emailChannel", () => {
  it("sends the rendered email once per notification", async () => {
    const notification = testNotification("confirmed");
    await emailChannel.deliver(message, notification, "mark@example.com");
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "mark@example.com",
        subject: "Запис підтверджено",
      }),
      notification.id,
    );
  });
});
