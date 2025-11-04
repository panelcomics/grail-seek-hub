export const CURRENT_TERMS_VERSION = "1.0.1";

export interface UserProfile {
  terms_version_accepted?: string | null;
}

export const hasAcceptedLatestTerms = (profile: UserProfile | null): boolean => {
  if (!profile) return false;
  return profile.terms_version_accepted === CURRENT_TERMS_VERSION;
};
