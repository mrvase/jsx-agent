import type { z } from "zod";

export type ActionType<TConfig extends z.ZodTypeAny = any> = {
  name: string;
  parameters: NoInfer<TConfig>;
  description: string;
  execute: (params: z.infer<TConfig>) => unknown;
  permanent?: boolean;
};
