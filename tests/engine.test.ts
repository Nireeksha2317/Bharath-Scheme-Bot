import { describe, it, expect } from 'vitest';
import { rankSchemes } from '../server/engine';

describe('Recommendation Engine', () => {
  const dummySchemes = [
    {
      id: 1,
      name: "Student Scholarship",
      category: "Education & Students",
      eligibility: "Must be a student",
      state: "Pan India",
      beneficiaries: "Student"
    },
    {
      id: 2,
      name: "Farmer Loan",
      category: "Agriculture & Farmers",
      eligibility: "Must be a farmer",
      state: "Pan India",
      beneficiaries: "Farmer"
    }
  ] as any[];

  it('should boost schemes matching the user profile occupation', () => {
    const profile = {
      occupation: "Farmer",
      studentStatus: "Not a student"
    } as any;

    const ranked = rankSchemes(dummySchemes, profile, null, null);
    
    // Farmer scheme should be ranked higher
    expect(ranked[0].id).toBe(2);
  });

  it('should boost schemes matching the student status', () => {
    const profile = {
      studentStatus: "High School"
    } as any;

    const ranked = rankSchemes(dummySchemes, profile, null, null);
    
    // Student scheme should be ranked higher
    expect(ranked[0].id).toBe(1);
  });
});
