import { fn } from "storybook/test";
import type * as actions from "../oauth-actions";

export const decideAuthorization = fn<typeof actions.decideAuthorization>(
  async () => ({}),
);
