/**
 * Inquiry interfaces
 * Migrated from banana-lucky-next/components/interfaces/inquiry.ts
 */

export interface Reply {
  id: number;
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
