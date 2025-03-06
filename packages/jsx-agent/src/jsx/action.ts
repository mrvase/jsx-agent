import type { z, ZodTypeAny } from "zod";

export type ActionType<TConfig extends ZodTypeAny = any> = {
  name: string;
  parameters: TConfig;
  description: string;
  execute: (params: TConfig["_output"]) => unknown;
  permanent?: boolean;
};
