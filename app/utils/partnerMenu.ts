/**
 * Partner-section menu — the single source of truth for both the header
 * partner dropdown (AppHeader) and the in-page partner nav bar (PartnerNav).
 * Mirrors stargazer-high's PartnerHeader.vue menu. Routes are flat (matching
 * the existing /partner-deposit style); the sub-pages are UI-only placeholders
 * for now (data/API later).
 */

/** Column definition for the shared PartnerTable component. */
export interface PartnerColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  type?: "text" | "currency" | "number" | "profit" | "status" | "accent";
  /** Whether this column is click-to-sort. Defaults to true; set false for
   *  action / slot-only columns that have no comparable row value. */
  sortable?: boolean;
}

export interface PartnerSubItem {
  to: string;
  labelKey: string;
  /** i18n key for the page description shown under the title. */
  descKey?: string;
}

/**
 * A node in the partner member/agent tree (ports stargazer-high's
 * `MemberTree.vue` `ITreeViewItem`). `label` = username, `userlabel` =
 * nickname, `depth` = agent level, `memberCount` = lower-member count,
 * `status` = 0 new / 1 waiting / 2 normal / 3 stopped.
 */
export interface MemberTreeItem {
  id: string;
  label: string;
  userlabel: string;
  depth: number;
  memberCount: number;
  status?: number;
  expanded: boolean;
  nodes?: MemberTreeItem[];
}

/**
 * Placeholder member tree — mirrors the shape returned by
 * `GET /partner/member/tree` in stargazer-high. Swap for the real API later.
 *
 * @returns A fresh (mutable) tree so each mount can expand/collapse independently.
 */
export function mockMemberTree(): MemberTreeItem[] {
  return [
    {
      id: "1", label: "hoyaVIP", userlabel: "호야", depth: 1, memberCount: 24, status: 2, expanded: true,
      nodes: [
        {
          id: "1-1", label: "seoul_ace", userlabel: "서울에이스", depth: 2, memberCount: 9, status: 2, expanded: true,
          nodes: [
            { id: "1-1-1", label: "player_win7", userlabel: "위너세븐", depth: 3, memberCount: 0, status: 2, expanded: false },
            { id: "1-1-2", label: "star_777", userlabel: "스타", depth: 3, memberCount: 2, status: 1, expanded: false,
              nodes: [
                { id: "1-1-2-1", label: "moon_bet", userlabel: "문벳", depth: 4, memberCount: 0, status: 0, expanded: false },
                { id: "1-1-2-2", label: "daebak_lee", userlabel: "대박", depth: 4, memberCount: 0, status: 3, expanded: false },
              ],
            },
          ],
        },
        {
          id: "1-2", label: "lucky_jin", userlabel: "럭키진", depth: 2, memberCount: 5, status: 2, expanded: false,
          nodes: [
            { id: "1-2-1", label: "newbie_kang", userlabel: "강뉴비", depth: 3, memberCount: 0, status: 0, expanded: false },
          ],
        },
      ],
    },
  ];
}

export interface PartnerMenuItem {
  to: string;
  labelKey: string;
  /** Heroicon-style SVG path. */
  icon: string;
  /** i18n key for the page description shown under the title. */
  descKey?: string;
  children?: PartnerSubItem[];
}

export const PARTNER_MENU: PartnerMenuItem[] = [
  {
    to: "/partner-dashboard",
    labelKey: "partnerMenu.home",
    descKey: "partnerPages.welcome",
    icon: "m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  },
  {
    to: "/partner-members",
    labelKey: "partnerMenu.manageMembers",
    descKey: "partnerPages.desc.members",
    icon: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
    children: [
      { to: "/partner-members", labelKey: "partnerMenu.members" },
      { to: "/partner-members", labelKey: "partnerMenu.onlineMembers" },
      { to: "/partner-members", labelKey: "partnerMenu.shopTranHistory" },
    ],
  },
  {
    to: "/partner-bet-history",
    labelKey: "partnerMenu.bettings",
    descKey: "partnerPages.desc.bettings",
    icon: "M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z",
  },
  {
    to: "/partner",
    labelKey: "partnerMenu.transactions",
    descKey: "partnerPages.desc.transactions",
    icon: "M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-9L21 7.5m0 0L16.5 3m4.5 4.5H7.5",
    children: [
      { to: "/partner?tab=deposit", labelKey: "partner.deposits.title" },
      { to: "/partner?tab=withdraw", labelKey: "partner.withdrawals.title" },
      { to: "/partner?tab=history", labelKey: "partner.history.title" },
    ],
  },
  {
    to: "/partner-game-stats",
    labelKey: "partnerMenu.statistics",
    descKey: "partnerPages.desc.statistics",
    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
  },
  {
    to: "/partner-settlements",
    labelKey: "partnerMenu.settlement",
    descKey: "partnerPages.desc.settlement",
    icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z",
    children: [
      { to: "/partner-settlement-request", labelKey: "partnerMenu.settlementRequest", descKey: "partnerPages.desc.settlementRequest" },
      { to: "/partner-settlements", labelKey: "partnerMenu.settlementHistory" },
    ],
  },
];
