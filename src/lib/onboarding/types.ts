export type OnboardingStepId =
  | "countries"
  | "inventory"
  | "pricing"
  | "stock"
  | "first_sale";

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  description: string;
  href: string;
  completed: boolean;
};

export type OnboardingProgress = {
  eligible: boolean;
  dismissed: boolean;
  started: boolean;
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  pendingCount: number;
  allComplete: boolean;
  inventoryHasCategory: boolean;
  inventoryHasItems: boolean;
  firstCountryName: string | null;
};
