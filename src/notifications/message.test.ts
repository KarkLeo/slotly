import { describe, expect, it } from "vitest";
import { translator } from "@/emails/translator";
import { locales, type Locale } from "@/i18n/locales";
import { notificationMessage } from "./message";
import {
  masterKinds,
  notificationKinds,
  type NotificationKind,
} from "./notification";
import { testNotification } from "./test-notification";

const links = {
  manage: "https://slotly.example/auth/link?token=t",
  bookAgain: "https://slotly.example/olena",
};

const notification = testNotification;

const bookAgainKinds: NotificationKind[] = [
  "declined",
  "cancelledByMaster",
  "masterDidNotRespond",
];

describe("notificationMessage", () => {
  describe.each(locales)("in %s", (locale: Locale) => {
    it.each(notificationKinds)("fills every text of %s", async (kind) => {
      const t = await translator(locale);
      const message = notificationMessage(
        notification(kind, { locale }, { holdUntil: "2026-11-02T12:00:00Z" }),
        links,
        t,
      );
      for (const text of [message.subject, message.title, message.intro]) {
        expect(text).not.toBe("");
        expect(text).not.toMatch(/[{}]/);
      }
      expect(message.note ?? "").not.toMatch(/[{}]/);
    });
  });

  it.each(
    notificationKinds.filter(
      (kind) => !masterKinds.includes(kind) && !bookAgainKinds.includes(kind),
    ),
  )("leads a client to the booking from %s", async (kind) => {
    const message = notificationMessage(
      notification(kind),
      links,
      await translator("uk"),
    );
    expect(message.actions).toEqual([
      { label: "Керувати записом", url: links.manage },
    ]);
  });

  it.each(bookAgainKinds)(
    "offers another time first after %s",
    async (kind) => {
      const message = notificationMessage(
        notification(kind, {}, { status: "cancelled" }),
        links,
        await translator("uk"),
      );
      expect(message.actions).toEqual([
        { label: "Записатися на інший час", url: links.bookAgain },
        { label: "Керувати записом", url: links.manage },
      ]);
    },
  );

  it.each(masterKinds)(
    "shows the master who the client is in %s",
    async (kind) => {
      const message = notificationMessage(
        notification(kind),
        links,
        await translator("uk"),
      );
      expect(message.actions).toEqual([
        { label: "Відкрити в кабінеті", url: links.manage },
      ]);
      expect(message.details).toContainEqual({
        label: "Клієнт",
        value: "Mark Taylor",
      });
      expect(message.details.map((row) => row.label)).not.toContain("Майстер");
    },
  );

  it("shows the master to a client", async () => {
    const message = notificationMessage(
      notification("confirmed"),
      links,
      await translator("uk"),
    );
    expect(message.details).toContainEqual({
      label: "Майстер",
      value: "Olena",
    });
  });

  it.each([
    ["declined", "Коментар майстра"],
    ["cancelledByMaster", "Коментар майстра"],
    ["cancelledByClient", "Коментар клієнта"],
  ] as const)("quotes the comment in %s", async (kind, label) => {
    const message = notificationMessage(
      notification(kind, {}, { status: "cancelled", cancelComment: "Хворію" }),
      links,
      await translator("uk"),
    );
    expect(message.comment).toEqual({ label, text: "Хворію" });
  });

  it("has no comment block without a comment", async () => {
    const message = notificationMessage(
      notification("cancelledByMaster", {}, { status: "cancelled" }),
      links,
      await translator("uk"),
    );
    expect(message.comment).toBeNull();
  });

  it("shows the previous and the new time of a reschedule in the master's zone", async () => {
    const message = notificationMessage(
      notification("rescheduledByMaster", {
        previousStartsAt: "2026-11-03T08:00:00Z",
      }),
      links,
      await translator("uk"),
    );
    const values = message.details.map((row) => row.value).join("\n");
    expect(values).toContain("10:00");
    expect(values).toContain("14:00");
    expect(message.details.map((row) => row.label)).toContain("Було");
  });

  it("tells the master until when the booking waits for them", async () => {
    const message = notificationMessage(
      notification(
        "decisionNeeded",
        {},
        { status: "pending", holdUntil: "2026-11-02T16:30:00Z" },
      ),
      links,
      await translator("uk"),
    );
    expect(message.note).toContain("2 листопада");
    expect(message.note).toContain("18:30");
  });

  it("asks for a decision on a client's reschedule only while it waits for one", async () => {
    const t = await translator("uk");
    const waiting = notificationMessage(
      notification(
        "rescheduledByClient",
        { previousStartsAt: "2026-11-03T08:00:00Z" },
        { status: "pending", holdUntil: "2026-11-02T16:30:00Z" },
      ),
      links,
      t,
    );
    const confirmed = notificationMessage(
      notification("rescheduledByClient", {
        previousStartsAt: "2026-11-03T08:00:00Z",
      }),
      links,
      t,
    );
    expect(waiting.note).toContain("2 листопада");
    expect(waiting.note).toContain("18:30");
    expect(confirmed.note).toBeNull();
  });

  it("writes in the notification's language", async () => {
    const message = notificationMessage(
      notification("confirmed", { locale: "en" }),
      links,
      await translator("en"),
    );
    expect(message.actions[0].label).toBe("Manage booking");
    expect(message.details).toContainEqual({
      label: "Service",
      value: "Manicure",
    });
  });
});
