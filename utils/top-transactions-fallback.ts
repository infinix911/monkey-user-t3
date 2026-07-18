export type TopTransactionRow = {
  member: string;
  amount: string | number;
};

export const fallbackTopWithdrawals: TopTransactionRow[] = [
  { member: "J***n", amount: "5250000" },
  { member: "M***a", amount: "3800000" },
  { member: "R***i", amount: "2950000" },
  { member: "S***o", amount: "2400000" },
  { member: "A***h", amount: "2100000" },
  { member: "B***y", amount: "1750000" },
  { member: "K***n", amount: "1500000" },
  { member: "D***a", amount: "1320000" },
  { member: "L***s", amount: "1180000" },
  { member: "T***g", amount: "950000" },
];

export const fallbackTopDeposits: TopTransactionRow[] = [
  { member: "W***i", amount: "6800000" },
  { member: "P***o", amount: "4500000" },
  { member: "C***l", amount: "3700000" },
  { member: "F***h", amount: "2900000" },
  { member: "G***k", amount: "2600000" },
  { member: "N***a", amount: "2200000" },
  { member: "H***t", amount: "1850000" },
  { member: "I***s", amount: "1500000" },
  { member: "E***r", amount: "1300000" },
  { member: "O***v", amount: "1100000" },
];
