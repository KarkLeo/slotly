import { fn } from "storybook/test";
import type * as actions from "../actions";

export const setTheme = fn<typeof actions.setTheme>(async () => {});
