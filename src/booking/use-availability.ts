"use client";

import { useEffect, useRef, useState } from "react";
import { dayRanges, horizonDates, localDate } from "./dates";

export type Loadable<T> =
  { status: "loading" } | { status: "error" } | { status: "ready"; value: T };

// Days are calendar dates in the given zone.
export type AvailabilitySource = {
  fetchDays: (from: string, to: string, timeZone: string) => Promise<string[]>;
  fetchSlots: (day: string, timeZone: string) => Promise<string[]>;
};

export type Availability = ReturnType<typeof useAvailability>;

// Free dates for the horizon, the nearest free slot, and the slots of the chosen date,
// in the client's zone when there is one and the client has not switched to the master's.
export function useAvailability({
  timeZone: masterTimeZone,
  clientTimeZone,
  horizonDays,
  fetchDays,
  fetchSlots,
}: AvailabilitySource & {
  timeZone: string;
  clientTimeZone: string | null;
  horizonDays: number;
}) {
  const [masterZoneChosen, setMasterZoneChosen] = useState(false);
  const timeZone =
    clientTimeZone && !masterZoneChosen ? clientTimeZone : masterTimeZone;
  const [attempt, setAttempt] = useState(0);
  const [dates, setDates] = useState<
    Loadable<{ date: string; available: boolean }[]>
  >({ status: "loading" });
  const [nearest, setNearest] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Loadable<string[]> | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const slotRequest = useRef(0);

  useEffect(() => {
    let current = true;
    const all = horizonDates(localDate(new Date(), timeZone), horizonDays);
    Promise.all(
      dayRanges(all).map(([from, to]) => fetchDays(from, to, timeZone)),
    )
      .then(async (chunks) => {
        const free = new Set(chunks.flat());
        const first = all.find((date) => free.has(date));
        // The nearest-time hint is optional: if its slots fail to load, the strip still works.
        const firstSlots = first
          ? await fetchSlots(first, timeZone).catch(() => [])
          : [];
        if (!current) return;
        // Shown together, so the hint does not push the strip down under a tapping finger.
        setNearest(firstSlots[0] ?? null);
        setDates({
          status: "ready",
          value: all.map((date) => ({ date, available: free.has(date) })),
        });
      })
      .catch(() => {
        if (current) setDates({ status: "error" });
      });
    return () => {
      current = false;
    };
  }, [attempt, timeZone, horizonDays, fetchDays, fetchSlots]);

  function loadSlots(date: string, slot: string | null, zone = timeZone) {
    const request = ++slotRequest.current;
    setSelectedDate(date);
    setSelectedSlot(slot);
    setSlots({ status: "loading" });
    fetchSlots(date, zone)
      .then((value) => {
        if (request !== slotRequest.current) return;
        setSlots({ status: "ready", value });
        // The chosen time may have been booked by someone else meanwhile.
        if (slot && !value.includes(slot)) setSelectedSlot(null);
      })
      .catch(() => {
        if (request === slotRequest.current) setSlots({ status: "error" });
      });
  }

  // The chosen time stays chosen and shows up on its date in the other zone.
  function chooseMasterZone(chosen: boolean) {
    const zone = clientTimeZone && !chosen ? clientTimeZone : masterTimeZone;
    setMasterZoneChosen(chosen);
    setDates({ status: "loading" });
    if (selectedSlot) {
      loadSlots(localDate(new Date(selectedSlot), zone), selectedSlot, zone);
    } else {
      slotRequest.current++;
      setSelectedDate(null);
      setSlots(null);
    }
  }

  return {
    timeZone,
    zones: clientTimeZone
      ? {
          client: clientTimeZone,
          master: masterTimeZone,
          masterChosen: masterZoneChosen,
        }
      : null,
    chooseMasterZone,
    dates,
    nearest,
    selectedDate,
    slots,
    selectedSlot,
    selectDate: (date: string) => loadSlots(date, null),
    selectSlot: setSelectedSlot,
    pickNearest: () => {
      if (nearest) loadSlots(localDate(new Date(nearest), timeZone), nearest);
    },
    retryDates: () => {
      setDates({ status: "loading" });
      setAttempt((value) => value + 1);
    },
    retrySlots: () => {
      if (selectedDate) loadSlots(selectedDate, selectedSlot);
    },
    // After a booking the free dates and the nearest time change too; the old ones stay shown until the new arrive.
    refresh: () => {
      setAttempt((value) => value + 1);
      if (selectedDate) loadSlots(selectedDate, selectedSlot);
    },
  };
}
