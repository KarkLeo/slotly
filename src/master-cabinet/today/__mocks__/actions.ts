import { fn } from "storybook/test";
import type * as actions from "../actions";

export const confirmAppointment = fn<typeof actions.confirmAppointment>(
  async () => ({}),
);

export const cancelAppointment = fn<typeof actions.cancelAppointment>(
  async () => ({}),
);
