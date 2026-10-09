import type { Meta, StoryObj } from "@storybook/nextjs-vite";

function Typography() {
  return (
    <div className="flex flex-col gap-4 bg-background p-4 text-foreground">
      <h1 className="text-3xl font-extrabold tracking-[-0.03em]">
        Оберіть{" "}
        <span className="font-accent text-4xl font-medium tracking-normal italic">
          час
        </span>
      </h1>
      <h2 className="text-xl font-extrabold tracking-[-0.03em]">
        Записи на сьогодні
      </h2>
      <p className="font-normal">
        400 — Мінілендинг і онлайн-запис для майстрів.
      </p>
      <p className="font-medium">
        500 — Мінілендинг і онлайн-запис для майстрів.
      </p>
      <p className="font-semibold">
        600 — Мінілендинг і онлайн-запис для майстрів.
      </p>
      <p className="font-bold">
        700 — Мінілендинг і онлайн-запис для майстрів.
      </p>
      <p className="text-sm text-muted-foreground">
        Другорядний текст: чекає підтвердження.
      </p>
    </div>
  );
}

const meta = {
  title: "Foundations/Typography",
  component: Typography,
} satisfies Meta<typeof Typography>;

export default meta;

export const Scale: StoryObj<typeof meta> = {};
