"use client";

import { type ReactNode } from "react";
import {
  flowPersonToolbarActionsClass,
  flowPersonToolbarRecentsClass,
  flowPersonToolbarSearchSlotClass,
  flowPersonToolbarShellClass,
  flowToolbarInlineCreateClass,
} from "@/components/flow-form-styles";

type SalePersonListToolbarProps = {
  search: ReactNode;
  createIcon: ReactNode;
  createLabel: string;
  createShortLabel: string;
  onCreate: () => void;
  createOnboardingTarget?: string;
  recents?: ReactNode;
};

export function SalePersonListToolbar({
  search,
  createIcon,
  createLabel,
  createShortLabel,
  onCreate,
  createOnboardingTarget,
  recents,
}: SalePersonListToolbarProps) {
  return (
    <div className={flowPersonToolbarShellClass}>
      {recents ? <div className={flowPersonToolbarRecentsClass}>{recents}</div> : null}
      <div className="flex min-w-0 flex-1 items-stretch gap-2">
        <div className={`${flowPersonToolbarSearchSlotClass} flex-1`}>{search}</div>
        <div className={flowPersonToolbarActionsClass}>
          <button
            type="button"
            onClick={onCreate}
            className={flowToolbarInlineCreateClass}
            data-onboarding-target={createOnboardingTarget}
          >
            {createIcon}
            <span className="hidden md:inline">{createLabel}</span>
            <span className="md:hidden">{createShortLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
