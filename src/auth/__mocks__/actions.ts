import { fn } from "storybook/test";
import type * as actions from "../actions";

export const signIn = fn<typeof actions.signIn>(async (_state, formData) => ({
  step: "code",
  email: String(formData.get("email")),
  toast: { type: "success", key: "codeSent" },
}));
export const signOut = fn<typeof actions.signOut>();
