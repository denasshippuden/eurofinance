"use client";

import { useEffect, useState } from "react";
import type { StarkAnimationState } from "@/lib/stark/types";
import { cn } from "@/lib/format";

interface StarkPetProps {
  state: StarkAnimationState;
  size?: "sm" | "md" | "lg";
  label?: string;
  interactive?: boolean;
  onClick?: () => void;
}

const starkAnimationSources: Record<StarkAnimationState, string> = {
  idle: "/pets/stark/idle.gif",
  runningRight: "/pets/stark/running-right.gif",
  runningLeft: "/pets/stark/running-left.gif",
  waving: "/pets/stark/waving.gif",
  jumping: "/pets/stark/jumping.gif",
  failed: "/pets/stark/failed.gif",
  waiting: "/pets/stark/waiting.gif",
  working: "/pets/stark/working.gif",
  review: "/pets/stark/review.gif"
};

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-36 w-36"
};

const fallbackSizeClasses = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl"
};

const stateLabels: Record<StarkAnimationState, string> = {
  idle: "Stark em repouso",
  runningRight: "Stark correndo para a direita",
  runningLeft: "Stark correndo para a esquerda",
  waving: "Stark acenando",
  jumping: "Stark celebrando",
  failed: "Stark indicando erro",
  waiting: "Stark aguardando acao",
  working: "Stark trabalhando",
  review: "Stark revisando informacoes"
};

export function StarkPet({ state, size = "md", label, interactive = false, onClick }: StarkPetProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const alt = label ?? stateLabels[state];

  useEffect(() => {
    setHasImageError(false);
  }, [state]);

  const content = (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-elevated shadow-line",
        sizeClasses[size],
        !interactive && "pointer-events-none"
      )}
    >
      {!hasImageError ? (
        <img
          className="stark-pet-gif h-full w-full object-contain"
          src={starkAnimationSources[state]}
          alt={alt}
          draggable={false}
          onError={() => setHasImageError(true)}
        />
      ) : null}
      <span
        aria-hidden={!hasImageError}
        className={cn(
          "stark-pet-fallback absolute inset-0 flex items-center justify-center bg-elevated font-semibold text-foreground",
          fallbackSizeClasses[size],
          hasImageError ? "flex" : "hidden"
        )}
      >
        S
      </span>
    </span>
  );

  if (!interactive) {
    return content;
  }

  return (
    <button
      type="button"
      className="inline-flex rounded-full outline-none transition hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-accent/40"
      aria-label={alt}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

export { starkAnimationSources };
