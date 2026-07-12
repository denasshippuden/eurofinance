"use client";

import { useCallback, useEffect, useState } from "react";
import { normalizePeriod, type PeriodValue } from "@/lib/date-period";

interface UrlTransactionFilterState extends PeriodValue {
  walletUserId: string;
}

function readFiltersFromUrl(): UrlTransactionFilterState {
  if (typeof window === "undefined") {
    return { walletUserId: "all" };
  }

  const params = new URLSearchParams(window.location.search);
  const period = normalizePeriod({
    startDate: params.get("startDate") ?? undefined,
    endDate: params.get("endDate") ?? undefined
  });

  return {
    walletUserId: params.get("wallet") || "all",
    ...period
  };
}

export function useUrlTransactionFilters() {
  const [filters, setFilters] = useState<UrlTransactionFilterState>(() => readFiltersFromUrl());

  useEffect(() => {
    function syncFromHistory() {
      setFilters(readFiltersFromUrl());
    }

    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);

  const commitFilters = useCallback((nextFilters: UrlTransactionFilterState) => {
    const normalized = { ...nextFilters, ...normalizePeriod(nextFilters) };
    const params = new URLSearchParams(window.location.search);

    if (normalized.walletUserId && normalized.walletUserId !== "all") {
      params.set("wallet", normalized.walletUserId);
    } else {
      params.delete("wallet");
    }

    if (normalized.startDate) {
      params.set("startDate", normalized.startDate);
    } else {
      params.delete("startDate");
    }

    if (normalized.endDate) {
      params.set("endDate", normalized.endDate);
    } else {
      params.delete("endDate");
    }

    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    setFilters(normalized);
  }, []);

  return { filters, setFilters, commitFilters };
}
