import { fn } from "storybook/test";
import type * as zone from "../browser-time-zone";

// Stories run in the zone of the machine, so the client's zone is set by each story that needs one.
export const useBrowserTimeZone = fn<typeof zone.useBrowserTimeZone>(
  () => null,
);
