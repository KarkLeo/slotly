import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";
import en from "../../messages/emails/en.json";
import ru from "../../messages/emails/ru.json";
import uk from "../../messages/emails/uk.json";
import { isLocale, type Locale } from "@/i18n/locales";
import { notificationMessage } from "@/notifications/message";
import type {
  Notification,
  NotificationKind,
} from "@/notifications/notification";
import { testNotification } from "@/notifications/test-notification";
import { renderNotificationEmail, type RenderedEmail } from "./render";
import { translator } from "./translator";

const dictionaries = { uk, ru, en };

const localeOf = (value: unknown): Locale => (isLocale(value) ? value : "uk");

const links = {
  manage: "https://slotly.karkleo.com/auth/link?token=x",
  bookAgain: "https://slotly.karkleo.com/olena",
};

type Args = {
  kind: NotificationKind;
  notification?: Partial<Omit<Notification, "appointment">>;
  appointment?: Partial<Notification["appointment"]>;
};

const appointment: Partial<Notification["appointment"]> = {
  masterName: "Олена Мельник",
  clientName: "Ірина Коваленко",
  service: { uk: "Манікюр з покриттям", en: "Gel manicure" },
  startsAt: "2026-10-29T09:45:00Z",
  endsAt: "2026-10-29T11:15:00Z",
  price: 900,
};

function EmailPreview({ email }: { email: RenderedEmail }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <p className="text-sm text-muted-foreground">{email.to}</p>
      <p className="font-semibold">{email.subject}</p>
      <iframe
        title={email.subject}
        srcDoc={email.html}
        className="h-[720px] w-full rounded-xl border border-border"
      />
    </div>
  );
}

const meta = {
  title: "Emails/NotificationEmail",
  parameters: { layout: "fullscreen" },
  args: { kind: "confirmed" },
  loaders: [
    async ({ args, globals }) => {
      const locale = localeOf(globals.locale);
      const notification = testNotification(
        args.kind,
        { ...args.notification, locale },
        { ...appointment, ...args.appointment },
      );
      const message = notificationMessage(
        notification,
        links,
        await translator(locale),
      );
      return {
        email: await renderNotificationEmail(
          message,
          "iryna@example.com",
          locale,
        ),
      };
    },
  ],
  render: (_args, { loaded }) => (
    <EmailPreview email={(loaded as { email: RenderedEmail }).email} />
  ),
  play: async ({ args, canvasElement, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].notifications;
    const body = await emailBody(canvasElement);
    await expect(body.textContent).toContain(t[args.kind].title);
    await expect(body.textContent).toContain(
      args.kind === "decisionNeeded" ||
        args.kind === "cancelledByClient" ||
        args.kind === "rescheduledByClient"
        ? t.openCabinet
        : t.manage,
    );
  },
} satisfies Meta<Args>;

export default meta;

type Story = StoryObj<Args>;

async function emailBody(canvasElement: HTMLElement) {
  const frame = canvasElement.querySelector("iframe")!;
  await waitFor(() =>
    expect(frame.contentDocument?.body.textContent).toBeTruthy(),
  );
  return frame.contentDocument!.body;
}

export const DecisionNeeded: Story = {
  args: {
    kind: "decisionNeeded",
    appointment: { status: "pending", holdUntil: "2026-10-28T15:20:00Z" },
  },
};

export const Confirmed: Story = {};

export const ConfirmedRussian: Story = { globals: { locale: "ru" } };

export const ConfirmedEnglish: Story = { globals: { locale: "en" } };

export const Declined: Story = {
  args: {
    kind: "declined",
    appointment: {
      status: "cancelled",
      cancelComment: "Вибачте, цього дня я на навчанні.",
    },
  },
  play: async (context) => {
    await meta.play(context);
    const t = dictionaries[localeOf(context.globals.locale)].notifications;
    const body = await emailBody(context.canvasElement);
    await expect(body.textContent).toContain(t.bookAgain);
    await expect(body.textContent).toContain(
      "Вибачте, цього дня я на навчанні.",
    );
  },
};

export const DeclinedEnglish: Story = {
  ...Declined,
  globals: { locale: "en" },
};

export const CancelledByMaster: Story = {
  args: { kind: "cancelledByMaster", appointment: { status: "cancelled" } },
};

export const CancelledByClient: Story = {
  args: {
    kind: "cancelledByClient",
    appointment: { status: "cancelled", cancelComment: "Захворіла дитина." },
  },
};

export const RescheduledByMaster: Story = {
  args: {
    kind: "rescheduledByMaster",
    notification: { previousStartsAt: "2026-10-28T07:00:00Z" },
  },
  play: async (context) => {
    await meta.play(context);
    const t = dictionaries[localeOf(context.globals.locale)].notifications;
    const body = await emailBody(context.canvasElement);
    await expect(body.textContent).toContain(t.previously);
  },
};

export const RescheduledByClient: Story = {
  args: {
    kind: "rescheduledByClient",
    notification: { previousStartsAt: "2026-10-28T07:00:00Z" },
    appointment: { status: "pending", holdUntil: "2026-10-28T15:20:00Z" },
  },
};

export const MasterDidNotRespond: Story = {
  args: { kind: "masterDidNotRespond", appointment: { status: "cancelled" } },
};

export const BookedByMaster: Story = { args: { kind: "bookedByMaster" } };

export const Reminder: Story = { args: { kind: "reminder" } };

export const ReminderRussian: Story = {
  args: { kind: "reminder" },
  globals: { locale: "ru" },
};

export const LongTexts: Story = {
  args: {
    kind: "declined",
    appointment: {
      status: "cancelled",
      masterName: "Олександра-Вікторія Шевченко-Коваленко",
      service: {
        uk: "Комплексний догляд: манікюр, педикюр, парафінотерапія і масаж рук",
      },
      address:
        "вул. Велика Васильківська, 128, під’їзд 3, поверх 14, квартира 287, домофон 287В",
      cancelComment:
        "Дуже перепрошую, але на цей день у мене змінилися плани через навчання, тому прийняти вас не зможу. Оберіть, будь ласка, інший день — буду рада бачити вас наступного тижня.",
    },
  },
};
