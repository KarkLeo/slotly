import en from "../../../messages/en.json";
import ru from "../../../messages/ru.json";
import uk from "../../../messages/uk.json";
import { isLocale, type Locale } from "@/i18n/locales";
import { type ServiceData, type ServicesData, toServicesView } from "./view";

const dictionaries = { uk, ru, en };

export const localeOf = (value: unknown): Locale =>
  isLocale(value) ? (value as Locale) : "uk";

export const textsOf = (locale: unknown) => dictionaries[localeOf(locale)];

export const ids = {
  nails: "11111111-1111-4111-8111-111111111111",
  brows: "22222222-2222-4222-8222-222222222222",
  gel: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  removal: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
  home: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
  consult: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
  french: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5",
};

const service = (
  patch: Partial<ServiceData> & { id: string },
): ServiceData => ({
  categoryId: null,
  position: 0,
  name: { uk: "Послуга" },
  description: {},
  durationMinutes: 60,
  bufferMinutes: 0,
  priceKind: "fixed",
  price: 500,
  format: "on_site",
  archived: false,
  ...patch,
});

const full: ServicesData = {
  currency: "UAH",
  primaryLocale: "uk",
  locales: ["uk", "en"],
  categories: [
    { id: ids.nails, position: 0, name: { uk: "Нігті", en: "Nails" } },
    { id: ids.brows, position: 1, name: { uk: "Брови" } },
  ],
  services: [
    service({
      id: ids.gel,
      categoryId: ids.nails,
      name: { uk: "Манікюр з покриттям", en: "Gel manicure" },
      description: { uk: "Догляд, форма та покриття.", en: "Care and polish." },
      durationMinutes: 90,
      bufferMinutes: 15,
      price: 900,
    }),
    service({
      id: ids.removal,
      categoryId: ids.nails,
      position: 1,
      name: { uk: "Зняття покриття" },
      durationMinutes: 30,
      price: 250.5,
    }),
    service({
      id: ids.home,
      name: { uk: "Манікюр вдома" },
      priceKind: "from",
      price: 1200,
      format: "at_client",
      durationMinutes: 120,
      bufferMinutes: 45,
    }),
    service({
      id: ids.consult,
      position: 1,
      name: { uk: "Онлайн-консультація" },
      priceKind: "none",
      price: null,
      format: "online",
      durationMinutes: 30,
    }),
    service({
      id: ids.french,
      categoryId: ids.nails,
      position: 2,
      name: { uk: "Френч" },
      archived: true,
    }),
  ],
};

const longName = "Комплексний догляд за руками й нігтями з масажем".repeat(2);

export const servicesStories = {
  full,
  noCategories: {
    ...full,
    locales: ["uk"],
    categories: [],
    services: full.services
      .filter((s) => !s.archived)
      .map((s) => ({ ...s, categoryId: null })),
  },
  empty: { ...full, categories: [], services: [] },
  archivedOnly: {
    ...full,
    services: full.services.map((s) => ({ ...s, archived: true })),
  },
  longTexts: {
    ...full,
    categories: [{ id: ids.nails, position: 0, name: { uk: longName } }],
    services: [
      service({
        id: ids.gel,
        categoryId: ids.nails,
        name: { uk: longName },
        durationMinutes: 720,
        bufferMinutes: 240,
        priceKind: "from",
        price: 99999999.99,
        format: "at_client",
      }),
      service({
        id: ids.french,
        name: { uk: longName },
        archived: true,
      }),
    ],
  },
} satisfies Record<string, ServicesData>;

export const servicesView = (data: ServicesData, locale: Locale) =>
  toServicesView(data, locale);
