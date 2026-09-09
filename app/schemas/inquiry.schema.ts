import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";

type TFn = (key: string) => string;

/**
 * Write inquiry form schema
 */
export const inquirySchema = (t: TFn) =>
  toTypedSchema(
    z.object({
      // 200 / 5000 are what `createInquirySchema` accepts in monkey-user-api.
      // Neither had a ceiling here, so a long title or body passed the form and
      // came back as a bare 400 the member could not act on.
      title: z
        .string()
        .min(1, t("inquiry.titleCheck"))
        .max(200, t("inquiry.titleTooLong")),
      content: z
        .string()
        .min(1, t("inquiry.bodyCheck"))
        .max(5000, t("inquiry.bodyTooLong")),
    }),
  );
