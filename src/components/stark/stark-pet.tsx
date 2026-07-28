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

function StarkMascotIllustration({ state }: { state: StarkAnimationState }) {
  return (
    <svg
      className="stark-mascot h-full w-full"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      data-state={state}
    >
      <ellipse className="stark-mascot__shadow" cx="64" cy="111" rx="29" ry="6" fill="#05070b" opacity="0.34" />
      <g className="stark-mascot__body">
        <path d="M44 71c-12 7-21 21-21 33 12 2 27-6 35-18 5-8 2-19-7-23-2 3-4 5-7 8Z" fill="#0d76e5" />
        <path d="M84 71c12 7 21 21 21 33-12 2-27-6-35-18-5-8-2-19 7-23 2 3 4 5 7 8Z" fill="#075dcc" />
        <path
          className="stark-mascot__wing stark-mascot__wing--left"
          d="M50 62c-16 10-25 24-27 43 15-2 30-13 39-32 3-7-5-15-12-11Z"
          fill="#06a8ff"
        />
        <path
          className="stark-mascot__wing stark-mascot__wing--right"
          d="M78 62c16 10 25 24 27 43-15-2-30-13-39-32-3-7 5-15 12-11Z"
          fill="#0087ef"
        />
        <path d="M42 87c8-6 16-11 26-14" stroke="#54e5ff" strokeWidth="5" strokeLinecap="round" opacity="0.76" />
        <path d="M86 87c-8-6-16-11-26-14" stroke="#2ad4ff" strokeWidth="5" strokeLinecap="round" opacity="0.58" />
        <path d="M35 54c0-21 13-37 31-37 17 0 29 14 29 33 0 24-12 39-31 39-17 0-29-14-29-35Z" fill="#0b8bff" />
        <path d="M47 36c4-11 13-18 25-18 12 5 19 17 19 32 0 22-10 35-27 35-9 0-16-4-21-11 22-2 39-20 39-43-9 2-20 4-35 5Z" fill="#0069d9" opacity="0.7" />
        <path d="M43 72c10 10 31 11 42 0-4 12-11 18-21 18-9 0-17-6-21-18Z" fill="#004eaa" opacity="0.55" />
        <path d="M38 51c-15 2-23 9-24 18 10 2 25-1 34-9 7-7 2-11-10-9Z" fill="#111827" />
        <path d="M16 68c6 9 21 10 32-8-9 7-22 8-32 8Z" fill="#05070b" />
        <path d="M18 66c8-2 15-5 21-10" stroke="#2d3748" strokeWidth="3" strokeLinecap="round" />
        <circle cx="66" cy="47" r="14" fill="#e9f7ff" />
        <circle className="stark-mascot__eye" cx="67" cy="47" r="8" fill="#f7c948" />
        <circle cx="68" cy="47" r="4" fill="#07111f" />
        <circle cx="70.5" cy="44.5" r="1.8" fill="#ffffff" />
        <path d="M51 21c5-9 17-10 29-6-8 2-15 5-20 11l-9-5Z" fill="#20d3ff" />
        <path d="M59 16c10-7 22-6 31 1-9 0-17 2-25 7l-6-8Z" fill="#0b8bff" />
        <path d="M71 15c8-3 17-1 23 5-7 0-13 1-20 4l-3-9Z" fill="#015ec5" />
        <path d="M55 89c-2 8-4 16-6 24" stroke="#737b8c" strokeWidth="5" strokeLinecap="round" />
        <path d="M73 89c2 8 4 16 6 24" stroke="#737b8c" strokeWidth="5" strokeLinecap="round" />
        <path d="M43 114c6-4 12-4 18 0" stroke="#a6adbb" strokeWidth="4" strokeLinecap="round" />
        <path d="M67 114c6-4 12-4 18 0" stroke="#a6adbb" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

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
        aria-label={hasImageError ? alt : undefined}
        role={hasImageError ? "img" : undefined}
        className={cn(
          "stark-pet-fallback absolute inset-0 flex items-center justify-center bg-elevated p-1",
          hasImageError ? "flex" : "hidden"
        )}
      >
        <StarkMascotIllustration state={state} />
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
