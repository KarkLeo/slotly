import { fn } from "storybook/test";
import type * as actions from "../actions";

export const saveService = fn<typeof actions.saveService>(async () => ({}));

export const archiveService = fn<typeof actions.archiveService>(
  async () => ({}),
);

export const restoreService = fn<typeof actions.restoreService>(
  async () => ({}),
);

export const saveCategory = fn<typeof actions.saveCategory>(async () => ({}));

export const deleteCategory = fn<typeof actions.deleteCategory>(
  async () => ({}),
);

export const reorderServices = fn<typeof actions.reorderServices>(
  async () => ({}),
);

export const reorderCategories = fn<typeof actions.reorderCategories>(
  async () => ({}),
);
