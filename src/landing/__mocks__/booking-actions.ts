import { fn } from "storybook/test";
import type * as actions from "../booking-actions";

export const startBooking = fn<typeof actions.startBooking>(async () => ({
  status: "codeSent",
  appointmentId: "appointment-1",
  toast: { type: "success", key: "codeSent" },
}));

export const confirmBooking = fn<typeof actions.confirmBooking>(async () => ({
  status: "confirmed",
  toast: { type: "success", key: "bookingConfirmed" },
}));

export const resendCode = fn<typeof actions.resendCode>(async () => ({
  status: "sent",
  toast: { type: "success", key: "codeSent" },
}));
