/**
 * Inquiry interfaces
 * Migrated from banana-lucky-next/components/interfaces/inquiry.ts
 */

import { z } from "zod";

export interface Reply {
  id: string | number;
  sender_type: string;
  sender_id: string;
  sender: string;
  message: string | null;
  created_at: string;
  created_by_type?: string;
}

export interface RepliesResponse {
  has_more: boolean;
  prev_cursor: string;
  next_cursor: string;
  data: Reply[];
}

export interface InquiryItem {
  id: string;
  title: string;
  message: string;
  status: number;
  created_at: string;
  updated_at: string;
  replies_count: number;
  member_unread: number;
  created_by_type: string;
  last_reply_by: string;
}

// ===========================================================================
// Backend contracts + normalization (monkey-user-api /inquiries)
// Wire shapes are camelCase with a { data, meta } envelope; the consumers use
// the snake_case shapes above with { pages, rows, data }. Validate + map at the
// fetch points.
// ===========================================================================

/** Wire shape of a list item (getInquiriesSchema.data[]). */
export const inquiryListItemWireSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  status: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  repliesCount: z.number(),
  memberUnread: z.number(),
  createdByType: z.string(),
  lastReplyBy: z.string(),
});

/** Wire shape of the paginated inquiries list ({ data, meta }). */
export const inquiriesResponseWireSchema = z.object({
  data: z.array(inquiryListItemWireSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});
export type InquiriesResponseWire = z.infer<typeof inquiriesResponseWireSchema>;

/** Normalized inquiries list — the { pages, rows, data } shape consumers use. */
export interface InquiriesResponse {
  pages: number;
  rows: number;
  data: InquiryItem[];
}

export const mapInquiryListItem = (
  w: z.infer<typeof inquiryListItemWireSchema>,
): InquiryItem => ({
  id: w.id,
  title: w.title,
  message: w.message,
  status: w.status,
  created_at: w.createdAt,
  updated_at: w.updatedAt,
  replies_count: w.repliesCount,
  member_unread: w.memberUnread,
  created_by_type: w.createdByType,
  last_reply_by: w.lastReplyBy,
});

export const mapInquiriesResponse = (
  w: InquiriesResponseWire,
): InquiriesResponse => ({
  pages: w.meta.totalPages,
  rows: w.meta.total,
  data: w.data.map(mapInquiryListItem),
});

/** Wire shape of a reply row (getInquiryRepliesSchema.data[]). */
export const inquiryReplyWireSchema = z.object({
  id: z.string(),
  senderType: z.string(),
  message: z.string(),
  createdAt: z.string(),
});

/** Wire shape of the replies response ({ data, meta }). */
export const inquiryRepliesResponseWireSchema = z.object({
  data: z.array(inquiryReplyWireSchema),
  meta: z.object({
    hasMore: z.boolean(),
    prevCursor: z.string().optional(),
    nextCursor: z.string().optional(),
  }),
});
export type InquiryRepliesResponseWire = z.infer<
  typeof inquiryRepliesResponseWireSchema
>;

export const mapReply = (
  w: z.infer<typeof inquiryReplyWireSchema>,
): Reply => ({
  id: w.id,
  sender_type: w.senderType,
  sender_id: "",
  sender: "",
  message: w.message,
  created_at: w.createdAt,
});

export const mapRepliesResponse = (
  w: InquiryRepliesResponseWire,
): RepliesResponse => ({
  has_more: w.meta.hasMore,
  prev_cursor: w.meta.prevCursor ?? "",
  next_cursor: w.meta.nextCursor ?? "",
  data: w.data.map(mapReply),
});
