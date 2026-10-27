import { fn } from "storybook/test";
import type * as actions from "../actions";

export const cancelBooking = fn<typeof actions.cancelBooking>(async () => ({}));

export const rescheduleBooking = fn<typeof actions.rescheduleBooking>(
  async () => ({ status: "slotTaken" }),
);
