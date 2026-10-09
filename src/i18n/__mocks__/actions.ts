import { fn } from "storybook/test";
import type * as actions from "../actions";

export const setLocale = fn<typeof actions.setLocale>(async () => {});
