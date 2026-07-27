export type StarkAnimationState =
  | "idle"
  | "runningRight"
  | "runningLeft"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "working"
  | "review";

export type StarkMissionStatus = "available" | "inProgress" | "completed" | "claimed";

export type StarkMissionType =
  | "registerExpense"
  | "registerIncome"
  | "reviewTransactions"
  | "completeWorkHours"
  | "checkMonthlySummary"
  | "buildEmergencyReserve"
  | "custom";

export interface StarkMission {
  id: string;
  groupId: string;
  assignedUserId?: string;
  title: string;
  description: string;
  type: StarkMissionType;
  status: StarkMissionStatus;
  progress: number;
  target: number;
  pointsReward: number;
  createdByUserId: string;
  createdAt: string;
  completedAt?: string;
  claimedAt?: string;
}

export interface StarkRewardAccount {
  userId: string;
  groupId: string;
  points: number;
  lifetimePoints: number;
  level: number;
  currentStreak: number;
  lastActivityAt?: string;
}

export interface StarkTip {
  id: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  actionLabel?: string;
  actionHref?: string;
}

export interface StarkContextualTipInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyBalance: number;
  transactionCount: number;
  hasRecentTransactions: boolean;
  hasWorkHoursThisMonth?: boolean;
  hasReviewedMonthlySummary?: boolean;
  hasRecurringExpensesDueSoon?: boolean;
}

export interface StarkMissionContext {
  groupId: string;
  userId: string;
  monthKey: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  transactionCount: number;
  hasRecentTransactions: boolean;
  hasWorkHoursThisMonth: boolean;
  hasReviewedMonthlySummary: boolean;
  hasRecurringExpensesToReview: boolean;
  createdByUserId: string;
}

export interface StarkRewardEvent {
  id: string;
  userId: string;
  groupId: string;
  missionId?: string;
  points: number;
  reason: string;
  createdAt: string;
}

export interface StarkStoredState {
  rewardAccount: StarkRewardAccount;
  claimedMissionIds: string[];
  rewardEvents: StarkRewardEvent[];
  reviewedMonthlySummaryKeys: string[];
  reviewedRecurringMonthKeys: string[];
  workHoursMonthKeys: string[];
}
