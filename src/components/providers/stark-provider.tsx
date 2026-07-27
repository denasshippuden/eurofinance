"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { StarkAssistant } from "@/components/stark/stark-assistant";
import { useAuth } from "@/components/providers/auth-provider";
import { useFinance } from "@/components/providers/finance-provider";
import { getBusinessMonthKey, getDueDateForMonth } from "@/lib/date-period";
import { getMonthlySummary } from "@/lib/finance";
import { buildAutomaticStarkMissions } from "@/lib/stark/missions";
import { createStarkRepository, type StarkRepository } from "@/lib/stark/repository";
import { createRewardEvent, readJsonValue, starkStorageKeys } from "@/lib/stark/storage";
import { getContextualTips } from "@/lib/stark/get-contextual-tips";
import type {
  StarkAnimationState,
  StarkContextualTipInput,
  StarkMission,
  StarkRewardAccount,
  StarkRewardEvent,
  StarkStoredState,
  StarkTip
} from "@/lib/stark/types";

interface StarkContextValue {
  animationState: StarkAnimationState;
  isAssistantOpen: boolean;
  activeTip: StarkTip | null;
  activeMissions: StarkMission[];
  rewardAccount: StarkRewardAccount;
  rewardEvents: StarkRewardEvent[];
  openAssistant(): void;
  closeAssistant(): void;
  setAnimationState(state: StarkAnimationState): void;
  claimMissionReward(missionId: string): void;
  updateContextualTip(input: StarkContextualTipInput): void;
  markMonthlySummaryReviewed(monthKey?: string): void;
  markRecurringExpensesReviewed(monthKey?: string): void;
  markWorkHoursRecorded(monthKey?: string): void;
}

interface StoredWorkEntry {
  workDate?: string;
}

const StarkContext = createContext<StarkContextValue | undefined>(undefined);

function getLevel(lifetimePoints: number) {
  return Math.max(1, Math.floor(lifetimePoints / 100) + 1);
}

function hasLocalWorkHoursThisMonth(userId: string, monthKey: string) {
  const entries = readJsonValue<StoredWorkEntry[]>(starkStorageKeys.workHours(userId), []);
  return entries.some((entry) => typeof entry.workDate === "string" && entry.workDate.startsWith(monthKey));
}

function hasRecurringExpenseDueSoon(monthKey: string, recurringExpenses: ReturnType<typeof useFinance>["recurringExpenses"]) {
  const today = new Date().toISOString().slice(0, 10);

  return recurringExpenses.some((item) => {
    if (item.status !== "active") {
      return false;
    }

    const dueDate = getDueDateForMonth(monthKey, item.dueDay);
    const daysUntilDue = Math.ceil((new Date(`${dueDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000);
    return daysUntilDue >= 0 && daysUntilDue <= 7;
  });
}

export function StarkProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile, transactions, recurringExpenses } = useFinance();
  const repository = useRef<StarkRepository | null>(null);
  const scope = useMemo(() => ({ groupId: profile.groupId, userId: profile.appUserId }), [profile.appUserId, profile.groupId]);
  const [storedState, setStoredState] = useState<StarkStoredState | null>(null);
  const [animationState, setAnimationState] = useState<StarkAnimationState>("idle");
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [activeTip, setActiveTip] = useState<StarkTip | null>(null);
  const monthKey = getBusinessMonthKey();

  useEffect(() => {
    let mounted = true;
    repository.current = createStarkRepository(scope);

    repository.current.load().then((state) => {
      if (mounted) {
        setStoredState(state);
      }
    });

    return () => {
      mounted = false;
    };
  }, [scope]);

  const monthly = useMemo(() => getMonthlySummary(transactions, profile.defaultCurrency), [profile.defaultCurrency, transactions]);

  const activeMissions = useMemo(() => {
    if (!storedState) {
      return [];
    }

    const context = {
      groupId: profile.groupId,
      userId: profile.appUserId,
      monthKey,
      monthlyIncome: monthly.income,
      monthlyExpenses: monthly.expenses,
      transactionCount: transactions.length,
      hasRecentTransactions: transactions.some((transaction) => {
        const age = Date.now() - new Date(`${transaction.date}T00:00:00`).getTime();
        return age >= 0 && age <= 7 * 86400000;
      }),
      hasWorkHoursThisMonth:
        storedState.workHoursMonthKeys.includes(monthKey) || hasLocalWorkHoursThisMonth(profile.appUserId, monthKey),
      hasReviewedMonthlySummary: storedState.reviewedMonthlySummaryKeys.includes(monthKey),
      hasRecurringExpensesToReview:
        storedState.reviewedRecurringMonthKeys.includes(monthKey) ||
        recurringExpenses.some((item) => item.status === "active" && item.autoGenerate),
      createdByUserId: profile.role === "master" ? profile.appUserId : "system"
    };

    return buildAutomaticStarkMissions(context, storedState.claimedMissionIds);
  }, [monthKey, monthly.expenses, monthly.income, profile.appUserId, profile.groupId, profile.role, recurringExpenses, storedState, transactions]);

  useEffect(() => {
    if (!activeTip && storedState) {
      const tips = getContextualTips({
        monthlyIncome: monthly.income,
        monthlyExpenses: monthly.expenses,
        monthlyBalance: monthly.net,
        transactionCount: transactions.length,
        hasRecentTransactions: activeMissions.some((mission) => mission.type === "reviewTransactions" && mission.progress > 0),
        hasWorkHoursThisMonth: activeMissions.some((mission) => mission.type === "completeWorkHours" && mission.progress > 0),
        hasReviewedMonthlySummary: storedState.reviewedMonthlySummaryKeys.includes(monthKey),
        hasRecurringExpensesDueSoon: hasRecurringExpenseDueSoon(monthKey, recurringExpenses)
      });
      setActiveTip(tips[0] ?? null);
    }
  }, [activeMissions, activeTip, monthKey, monthly.expenses, monthly.income, monthly.net, recurringExpenses, storedState, transactions.length]);

  const persistState = useCallback(
    (updater: (current: StarkStoredState) => StarkStoredState) => {
      setStoredState((current) => {
        if (!current) {
          return current;
        }

        const next = updater(current);
        void repository.current?.save(next);
        return next;
      });
    },
    []
  );

  const markMonthKey = useCallback(
    (field: "reviewedMonthlySummaryKeys" | "reviewedRecurringMonthKeys" | "workHoursMonthKeys", value = monthKey) => {
      persistState((current) =>
        current[field].includes(value)
          ? current
          : {
              ...current,
              [field]: [...current[field], value]
            }
      );
    },
    [monthKey, persistState]
  );

  const openAssistant = useCallback(() => {
    setIsAssistantOpen(true);
    setAnimationState("waving");
  }, []);

  const closeAssistant = useCallback(() => {
    setIsAssistantOpen(false);
    setAnimationState(activeMissions.some((mission) => mission.status === "completed") ? "waiting" : "idle");
  }, [activeMissions]);

  const claimMissionReward = useCallback(
    (missionId: string) => {
      const mission = activeMissions.find((item) => item.id === missionId);

      if (!mission || mission.status !== "completed") {
        return;
      }

      persistState((current) => {
        if (current.claimedMissionIds.includes(missionId)) {
          return current;
        }

        const nextLifetimePoints = current.rewardAccount.lifetimePoints + mission.pointsReward;
        const event = createRewardEvent({
          userId: scope.userId,
          groupId: scope.groupId,
          missionId,
          points: mission.pointsReward,
          reason: mission.title
        });

        return {
          ...current,
          claimedMissionIds: [...current.claimedMissionIds, missionId],
          rewardAccount: {
            ...current.rewardAccount,
            points: current.rewardAccount.points + mission.pointsReward,
            lifetimePoints: nextLifetimePoints,
            level: getLevel(nextLifetimePoints),
            currentStreak: Math.max(current.rewardAccount.currentStreak, 1),
            lastActivityAt: event.createdAt
          },
          rewardEvents: [event, ...current.rewardEvents].slice(0, 50)
        };
      });
      setAnimationState("jumping");
      window.setTimeout(() => setAnimationState(isAssistantOpen ? "waving" : "idle"), 1800);
    },
    [activeMissions, isAssistantOpen, persistState, scope.groupId, scope.userId]
  );

  const updateContextualTip = useCallback((input: StarkContextualTipInput) => {
    const tips = getContextualTips(input);
    setActiveTip(tips[0] ?? null);
  }, []);

  const markMonthlySummaryReviewed = useCallback(
    (valueMonthKey?: string) => markMonthKey("reviewedMonthlySummaryKeys", valueMonthKey),
    [markMonthKey]
  );

  const markRecurringExpensesReviewed = useCallback(
    (valueMonthKey?: string) => markMonthKey("reviewedRecurringMonthKeys", valueMonthKey),
    [markMonthKey]
  );

  const markWorkHoursRecorded = useCallback(
    (valueMonthKey?: string) => markMonthKey("workHoursMonthKeys", valueMonthKey),
    [markMonthKey]
  );

  const value = useMemo<StarkContextValue>(() => {
    const rewardAccount = storedState?.rewardAccount ?? {
      userId: scope.userId,
      groupId: scope.groupId,
      points: 0,
      lifetimePoints: 0,
      level: 1,
      currentStreak: 0
    };

    return {
      animationState,
      isAssistantOpen,
      activeTip,
      activeMissions,
      rewardAccount,
      rewardEvents: storedState?.rewardEvents ?? [],
      openAssistant,
      closeAssistant,
      setAnimationState,
      claimMissionReward,
      updateContextualTip,
      markMonthlySummaryReviewed,
      markRecurringExpensesReviewed,
      markWorkHoursRecorded
    };
  }, [
    activeMissions,
    activeTip,
    animationState,
    claimMissionReward,
    closeAssistant,
    isAssistantOpen,
    markMonthlySummaryReviewed,
    markRecurringExpensesReviewed,
    markWorkHoursRecorded,
    openAssistant,
    scope.groupId,
    scope.userId,
    storedState,
    updateContextualTip
  ]);

  return (
    <StarkContext.Provider value={value}>
      {children}
      {user && storedState ? <StarkAssistant /> : null}
    </StarkContext.Provider>
  );
}

export function useStark() {
  const context = useContext(StarkContext);

  if (!context) {
    throw new Error("useStark precisa estar dentro de StarkProvider.");
  }

  return context;
}
