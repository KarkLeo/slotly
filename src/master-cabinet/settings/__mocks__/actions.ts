import { fn } from "storybook/test";
import type * as actions from "../actions";

export const updateName = fn<typeof actions.updateName>(async () => ({}));

export const changeSlug = fn<typeof actions.changeSlug>(async () => ({}));

export const updateLocales = fn<typeof actions.updateLocales>(async () => ({}));

export const updateTimeZone = fn<typeof actions.updateTimeZone>(
  async () => ({}),
);

export const updateCurrency = fn<typeof actions.updateCurrency>(
  async () => ({}),
);

export const setPublished = fn<typeof actions.setPublished>(async () => ({}));

export const checkSlug = fn<typeof actions.checkSlug>(async () => "available");
