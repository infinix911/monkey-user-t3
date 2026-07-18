import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";

type TFn = (key: string) => string;

/**
 * Write inquiry form schema
 */
export const inquirySchema = (t: TFn) =>
  toTypedSchema(
    z.object({
      title: z.string().min(1, t("inquiry.titleCheck")),
      content: z.string().min(1, t("inquiry.bodyCheck")),
    }),
  );
