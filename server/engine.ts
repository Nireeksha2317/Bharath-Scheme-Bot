import { UserProfile, SchemeEligibilityRule, Scheme } from "@shared/schema";

export interface EligibilityResult {
  isEligible: boolean;
  score: number;
  reasons: string[];
}

/**
 * Evaluates a user profile against a set of rules for a scheme.
 */
export function evaluateEligibility(
  profile: Partial<UserProfile>,
  rules: SchemeEligibilityRule[]
): EligibilityResult {
  let isEligible = true;
  let passedRules = 0;
  const reasons: string[] = [];

  if (rules.length === 0) {
    return { isEligible: true, score: 100, reasons: ["Open to all citizens."] };
  }

  for (const rule of rules) {
    const profileValue = (profile as any)[rule.ruleType];
    
    if (profileValue === undefined || profileValue === null || profileValue === "") {
      isEligible = false;
      reasons.push(`Requires information: ${rule.ruleType}`);
      continue;
    }

    let rulePassed = false;
    
    switch (rule.operator) {
      case "==":
        rulePassed = String(profileValue).toLowerCase() === String(rule.value).toLowerCase();
        break;
      case ">=":
        rulePassed = Number(profileValue) >= Number(rule.value);
        break;
      case "<=":
        rulePassed = Number(profileValue) <= Number(rule.value);
        break;
      case "in":
        const allowedValues = String(rule.value).split(',').map(v => v.trim().toLowerCase());
        rulePassed = allowedValues.includes(String(profileValue).toLowerCase());
        break;
      default:
        // Unknown operator
        rulePassed = false;
    }

    if (!rulePassed) {
      isEligible = false;
      reasons.push(rule.description || `Does not meet requirement for ${rule.ruleType}`);
    } else {
      passedRules++;
    }
  }

  const score = rules.length > 0 ? Math.round((passedRules / rules.length) * 100) : 100;

  return {
    isEligible,
    score,
    reasons
  };
}

/**
 * Recommends and scores schemes based on intent, profile, and location.
 */
export function rankSchemes(
  schemes: Scheme[], 
  profile?: Partial<UserProfile>,
  intentCategory?: string,
  intentState?: string
): (Scheme & { score: number; matchReasons: string[] })[] {
  
  return schemes.map(scheme => {
    let score = 0;
    const matchReasons: string[] = [];

    // 1. Intent Matching (Category)
    if (intentCategory && scheme.category === intentCategory) {
      score += 40;
      matchReasons.push(`Matches your interest in ${intentCategory}`);
    }

    // 2. Location Matching
    if (intentState && scheme.state === intentState) {
      score += 20;
      matchReasons.push(`Specific to your state: ${intentState}`);
    } else if (scheme.state === "Pan India") {
      score += 10;
      matchReasons.push(`Available Pan India`);
    }

    // 3. Profile Matching (Simple heuristic if no strict rules applied yet)
    if (profile) {
      if (profile.occupation && scheme.beneficiaries?.toLowerCase().includes(profile.occupation.toLowerCase())) {
        score += 30;
        matchReasons.push(`Matches your occupation: ${profile.occupation}`);
      }
      if (profile.gender && profile.gender.toLowerCase() === 'female' && scheme.category === 'Women & Child Welfare') {
        score += 20;
        matchReasons.push(`Targeted for Women`);
      }
    }

    return {
      ...scheme,
      score,
      matchReasons
    };
  }).sort((a, b) => b.score - a.score);
}
