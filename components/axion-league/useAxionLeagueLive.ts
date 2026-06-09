"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { supabase } from "@/lib/supabaseClient";

import type { LeagueEvent, LeagueSnapshot } from "./types";

type UseAxionLeagueLiveOptions = {
  enableGoalOverlay?: boolean;
};

export function useAxionLeagueLive(options: UseAxionLeagueLiveOptions = {}) {
  const [snapshot, setSnapshot] = useState<LeagueSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goalOverlayEvent, setGoalOverlayEvent] = useState<LeagueEvent | null>(null);
  const overlayQueueRef = useRef<LeagueEvent[]>([]);
  const overlayActiveRef = useRef(false);
  const lastOverlayEventId = useRef<string | null>(null);

  const loadSnapshot = useEffectEvent(async () => {
    try {
      const response = await fetch("/api/axion-league", {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Erro ao carregar Axion League.");
      }

      setSnapshot(payload as LeagueSnapshot);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar Axion League.");
    } finally {
      setLoading(false);
    }
  });

  const loadGoalOverlay = useEffectEvent(async (goalId: string) => {
    if (!options.enableGoalOverlay || lastOverlayEventId.current === goalId) {
      return;
    }

    try {
      const response = await fetch(`/api/axion-league/events/${goalId}`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Erro ao carregar evento.");
      }

      lastOverlayEventId.current = goalId;
      const event = payload as LeagueEvent;

      if (overlayActiveRef.current) {
        overlayQueueRef.current.push(event);
      } else {
        overlayActiveRef.current = true;
        setGoalOverlayEvent(event);
      }
    } catch {
      // Mantem a arena estavel mesmo se um evento individual falhar.
    }
  });

  useEffect(() => {
    loadSnapshot();

    const channel = supabase
      .channel(`axion-league-live-${options.enableGoalOverlay ? "arena" : "portal"}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "goals" },
        async (payload) => {
          const goalId = String(payload.new.id);
          await loadGoalOverlay(goalId);
          await loadSnapshot();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        async () => {
          await loadSnapshot();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employees" },
        async () => {
          await loadSnapshot();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.enableGoalOverlay]);

  useEffect(() => {
    if (!goalOverlayEvent) {
      if (overlayQueueRef.current.length > 0) {
        overlayActiveRef.current = true;
        const nextEvent = overlayQueueRef.current.shift() ?? null;
        setGoalOverlayEvent(nextEvent);
      } else {
        overlayActiveRef.current = false;
      }
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setGoalOverlayEvent(null);
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  }, [goalOverlayEvent]);

  return {
    snapshot,
    loading,
    error,
    goalOverlayEvent,
    clearGoalOverlay: () => setGoalOverlayEvent(null),
  };
}
