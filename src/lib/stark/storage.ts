import type { StarkRewardAccount, StarkRewardEvent, StarkStoredState } from "@/lib/stark/types";

const STARK_STORAGE_PREFIX = "financeos:stark:v1";

interface StarkStorageScope {
  groupId: string;
  userId: string;
}

export const starkStorageKeys = {
  state({ groupId, userId }: StarkStorageScope) {
    return `${STARK_STORAGE_PREFIX}:state:${groupId}:${userId}`;
  },
  workHours(userId: string) {
    return `financeos:work-hours:${userId}`;
  }
};

export function readJsonValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

export function writeJsonValue<T>(key: string, value: T) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

export function createDefaultRewardAccount(scope: StarkStorageScope): StarkRewardAccount {
  return {
    userId: scope.userId,
    groupId: scope.groupId,
    points: 0,
    lifetimePoints: 0,
    level: 1,
    currentStreak: 0
  };
}

export function normalizeStarkStoredState(scope: StarkStorageScope, stored?: Partial<StarkStoredState> | null): StarkStoredState {
  const account = stored?.rewardAccount;

  return {
    rewardAccount: {
      ...createDefaultRewardAccount(scope),
      ...(account && account.userId === scope.userId && account.groupId === scope.groupId ? account : {}),
      level: Math.max(1, account?.level ?? 1)
    },
    claimedMissionIds: Array.isArray(stored?.claimedMissionIds) ? stored.claimedMissionIds.filter(Boolean) : [],
    rewardEvents: Array.isArray(stored?.rewardEvents) ? (stored.rewardEvents as StarkRewardEvent[]) : [],
    reviewedMonthlySummaryKeys: Array.isArray(stored?.reviewedMonthlySummaryKeys)
      ? stored.reviewedMonthlySummaryKeys.filter(Boolean)
      : [],
    reviewedRecurringMonthKeys: Array.isArray(stored?.reviewedRecurringMonthKeys)
      ? stored.reviewedRecurringMonthKeys.filter(Boolean)
      : [],
    workHoursMonthKeys: Array.isArray(stored?.workHoursMonthKeys) ? stored.workHoursMonthKeys.filter(Boolean) : []
  };
}

export function loadStarkStoredState(scope: StarkStorageScope): StarkStoredState {
  const key = starkStorageKeys.state(scope);
  const state = normalizeStarkStoredState(scope, readJsonValue<Partial<StarkStoredState> | null>(key, null));
  writeJsonValue(key, state);
  return state;
}

export function saveStarkStoredState(scope: StarkStorageScope, state: StarkStoredState) {
  writeJsonValue(starkStorageKeys.state(scope), state);
}

export function createRewardEvent(input: Omit<StarkRewardEvent, "id" | "createdAt">): StarkRewardEvent {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `stark-event-${crypto.randomUUID()}`
      : `stark-event-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    ...input,
    id,
    createdAt: new Date().toISOString()
  };
}
