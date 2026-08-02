"use client";

import { ChevronDown, Copy, MessageSquare } from "lucide-react";
import {
  flowIntroClass,
  flowSummaryDlClass,
  flowSummaryItemClass,
  flowWizardActionsClass,
  flowWizardStackClass,
} from "@/components/flow-form-styles";
import { FlowStepTitle } from "@/components/flow-step-title";
import { Panel, primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import {
  createOrgPanelContentClass,
  createOrgStepBodyClass,
  formatContactList,
  shareMenuItemClass,
} from "@/components/platform/platform-create-client-wizard-helpers";
import {
  formatInitialTeamPlan,
  initialAdditionalUserLimit,
} from "@/lib/organizations/initial-team-plan";

type CreatedCredentials = {
  orgName: string;
  email: string;
  phones: string[];
  password: string;
  maxUsers: number;
  maxWarehouses: number;
  agenciesEnabled: boolean;
};

type PlatformCreateClientCredentialsPanelProps = {
  createdCredentials: CreatedCredentials;
  shareMenuOpen: boolean;
  shareMenuRef: React.RefObject<HTMLDivElement | null>;
  onToggleShareMenu: () => void;
  onCopyCredentials: () => void;
  onSendCredentialsBySms: () => void;
  onFinish: () => void;
};

export function PlatformCreateClientCredentialsPanel({
  createdCredentials,
  shareMenuOpen,
  shareMenuRef,
  onToggleShareMenu,
  onCopyCredentials,
  onSendCredentialsBySms,
  onFinish,
}: PlatformCreateClientCredentialsPanelProps) {
  return (
    <Panel
      clipContent={false}
      contentClassName={createOrgPanelContentClass}
      title={<FlowStepTitle stepNumber={2} done label="Listo — credenciales" />}
    >
      <div className={createOrgStepBodyClass}>
        <div className={flowWizardStackClass}>
          <p
            className={`${flowIntroClass} rounded-lg border border-emerald-400/20 bg-emerald-950/25 px-4 py-3 text-left text-emerald-100`}
          >
            Comparte estas credenciales con el dueño para que entre a operar su empresa.
          </p>
          <dl className={flowSummaryDlClass}>
            <div className={`${flowSummaryItemClass} sm:col-span-2`}>
              <dt className="text-[11px] font-black uppercase text-slate-500">Empresa</dt>
              <dd className="mt-0.5 font-black text-[#f8fafc]">{createdCredentials.orgName}</dd>
            </div>
            <div className={`${flowSummaryItemClass} sm:col-span-2`}>
              <dt className="text-[11px] font-black uppercase text-slate-500">Correo</dt>
              <dd className="mt-0.5 break-all font-black text-[#f8fafc]">{createdCredentials.email}</dd>
            </div>
            <div className={`${flowSummaryItemClass} sm:col-span-2`}>
              <dt className="text-[11px] font-black uppercase text-slate-500">Plan</dt>
              <dd className="mt-0.5 font-black text-[#f8fafc]">
                {createdCredentials.maxUsers === initialAdditionalUserLimit
                  ? formatInitialTeamPlan()
                  : `${createdCredentials.maxUsers} usuario${createdCredentials.maxUsers === 1 ? "" : "s"} adicional${createdCredentials.maxUsers === 1 ? "" : "es"}`}{" "}
                · {createdCredentials.maxWarehouses}{" "}
                {createdCredentials.maxWarehouses === 1 ? "bodega máxima" : "bodegas máximas"} ·
                Agencias {createdCredentials.agenciesEnabled ? "incluidas" : "no incluidas"}
              </dd>
            </div>
            <div className={flowSummaryItemClass}>
              <dt className="text-[11px] font-black uppercase text-slate-500">Celular</dt>
              <dd className="mt-0.5 font-black text-[#f8fafc]">
                {formatContactList(createdCredentials.phones)}
              </dd>
            </div>
            <div className={flowSummaryItemClass}>
              <dt className="text-[11px] font-black uppercase text-slate-500">Contraseña</dt>
              <dd className="mt-0.5 font-mono text-sm font-black text-slate-200">
                {createdCredentials.password}
              </dd>
            </div>
          </dl>
          <div className={flowWizardActionsClass}>
            <div ref={shareMenuRef} className="relative">
              <button
                type="button"
                className={`${primaryButtonClass} gap-1 pr-2`}
                onClick={onToggleShareMenu}
                aria-expanded={shareMenuOpen}
                aria-haspopup="menu"
              >
                <Copy className="h-4 w-4" />
                Compartir credenciales
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${shareMenuOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {shareMenuOpen ? (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-[200] mt-1 min-w-[15rem] overflow-hidden rounded-lg border border-white/10 bg-[#2b3833] py-1 shadow-[0_14px_34px_rgba(0,0,0,0.35)]"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className={shareMenuItemClass}
                    onClick={onCopyCredentials}
                  >
                    <Copy className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                    Copiar
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={shareMenuItemClass}
                    onClick={onSendCredentialsBySms}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                    Enviar por mensaje de texto
                  </button>
                </div>
              ) : null}
            </div>
            <button type="button" className={secondaryButtonClass} onClick={onFinish}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
