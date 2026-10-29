import { fn } from "storybook/test";
import {
  fetchAvailableDays,
  fetchAvailableSlots,
} from "@/landing/__mocks__/booking-api";
import type * as api from "../reschedule-api";

export const fetchRescheduleDays = fn<typeof api.fetchRescheduleDays>(
  (serviceId, _appointmentId, from, to, timeZone) =>
    fetchAvailableDays(serviceId, from, to, timeZone),
);

export const fetchRescheduleSlots = fn<typeof api.fetchRescheduleSlots>(
  (serviceId, _appointmentId, day, timeZone) =>
    fetchAvailableSlots(serviceId, day, timeZone),
);
