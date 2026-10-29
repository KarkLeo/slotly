import { fn } from "storybook/test";
import {
  fetchAvailableDays,
  fetchAvailableSlots,
} from "@/landing/__mocks__/booking-api";
import type * as api from "../reschedule-api";

export const fetchRescheduleDays = fn<typeof api.fetchRescheduleDays>(
  (serviceId, _appointmentId, from, to) =>
    fetchAvailableDays(serviceId, from, to),
);

export const fetchRescheduleSlots = fn<typeof api.fetchRescheduleSlots>(
  (serviceId, _appointmentId, day) => fetchAvailableSlots(serviceId, day),
);
