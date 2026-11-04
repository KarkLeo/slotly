import { fn } from "storybook/test";
import type * as actions from "../actions";

export const saveTemplateDays = fn<typeof actions.saveTemplateDays>(
  async () => ({}),
);

export const saveException = fn<typeof actions.saveException>(async () => ({}));

export const deleteException = fn<typeof actions.deleteException>(
  async () => ({}),
);

export const updateBookingParam = fn<typeof actions.updateBookingParam>(
  async () => ({}),
);

export const setAutoConfirm = fn<typeof actions.setAutoConfirm>(
  async () => ({}),
);
