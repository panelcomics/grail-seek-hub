// Crowdfunding creator in-product tips — additive, non-intrusive
import { useState, useEffect, useMemo } from "react";

export type CampaignPhase = "day0" | "day3" | "mid-campaign" | null;

interface CampaignPhaseTipData {
  phase: CampaignPhase;
  tipCopy: string;
  ctaLabel: string;
  dismissLabel: string;
}

interface UseCampaignPhaseTipsProps {
  campaignCreatedAt: string | null;
  campaignStatus: string;
  updatesCount: number;
  lastUpdateAt: string | null;
  backersCount: number;
}

const DISMISSED_TIPS_KEY = "crowdfund_dismissed_tips";

export function useCampaignPhaseTips({
  campaignCreatedAt,
  campaignStatus,
  updatesCount,
  lastUpdateAt,
  backersCount,
}: UseCampaignPhaseTipsProps) {
  const [dismissedPhases, setDismissedPhases] = useState<string[]>([]);

  // Load dismissed tips from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_TIPS_KEY);
      if (stored) {
        setDismissedPhases(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const dismissTip = (phase: CampaignPhase) => {
    if (!phase) return;
    const newDismissed = [...dismissedPhases, phase];
    setDismissedPhases(newDismissed);
    try {
      localStorage.setItem(DISMISSED_TIPS_KEY, JSON.stringify(newDismissed));
    } catch {
      // Ignore localStorage errors
    }
  };

  const currentTip = useMemo((): CampaignPhaseTipData | null => {
    if (!campaignCreatedAt || campaignStatus !== "live") return null;

    const createdAt = new Date(campaignCreatedAt).getTime();
    const now = Date.now();
    const hoursSinceLaunch = (now - createdAt) / (1000 * 60 * 60);
    const daysSinceLaunch = hoursSinceLaunch / 24;

    // Calculate hours since last update
    let hoursSinceLastUpdate = Infinity;
    if (lastUpdateAt) {
      hoursSinceLastUpdate = (now - new Date(lastUpdateAt).getTime()) / (1000 * 60 * 60);
    }

    // PHASE 1 — DAY 0: No updates yet, just launched
    if (updatesCount === 0 && daysSinceLaunch < 3 && !dismissedPhases.includes("day0")) {
      return {
        phase: "day0",
        tipCopy: "Posting a short launch update helps backers feel confident you're present.",
        ctaLabel: "Post First Update",
        dismissLabel: "Got it",
      };
    }

    // PHASE 2 — DAY 3: ~72 hours, has activity, no recent update
    if (
      daysSinceLaunch >= 2 &&
      daysSinceLaunch < 7 &&
      (backersCount > 0 || updatesCount > 0) &&
      hoursSinceLastUpdate > 48 &&
      !dismissedPhases.includes("day3")
    ) {
      return {
        phase: "day3",
        tipCopy: "Sharing what's coming next builds confidence and keeps momentum steady.",
        ctaLabel: "Post Update",
        dismissLabel: "Later",
      };
    }

    // PHASE 3 — MID-CAMPAIGN: >7 days, no update in 7-10 days
    if (
      daysSinceLaunch > 7 &&
      hoursSinceLastUpdate > 7 * 24 &&
      !dismissedPhases.includes("mid-campaign")
    ) {
      return {
        phase: "mid-campaign",
        tipCopy: "Consistent updates reassure backers, even when progress is steady.",
        ctaLabel: "Share Progress Update",
        dismissLabel: "Dismiss",
      };
    }

    return null;
  }, [campaignCreatedAt, campaignStatus, updatesCount, lastUpdateAt, backersCount, dismissedPhases]);

  return {
    currentTip,
    dismissTip,
  };
}
