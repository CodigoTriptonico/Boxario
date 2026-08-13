"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Building2, Loader2, Route } from "lucide-react";
import { assignAgencyRequestToRouteAction, listLogisticsAgencyRequestsAction, type LogisticsAgencyRequest } from "@/app/actions/agency-operations";
import { listAgencyRouteProposalsAction, reviewAgencyRouteProposalAction, type AgencyRouteProposal } from "@/app/actions/agencies";
import { listLogisticsRoutesAction } from "@/app/actions/logistics-routes";
import type { LogisticsRouteRow } from "@/lib/logistics-routing";
import { LOGISTICS_ROUTES_PAGE_SIZE } from "@/lib/logistics-routes-pagination";
import { useNotify } from "@/hooks/use-notify";
import { CompactInfoDisclosure, Panel, primaryButtonClass } from "@/components/ui-blocks";
import {
  agencyAlreadyAssignedUserMessage,
  agencyAssignIdempotencyKey,
  agencyIdempotencyConflictUserMessage,
  AGENCY_IDEMPOTENCY_CONFLICT,
  AGENCY_REQUEST_ALREADY_ASSIGNED,
  isDefinitiveAgencyClientError,
} from "@/lib/agency-idempotency";
import {
  beginAgencyAssignIntention,
  clearPendingAgencyAssignIntention,
  resolveAgencyAssignIntention,
} from "@/lib/agency-pending";

const serviceLabels: Record<string,string> = { agency_office_empty_box_delivery:"Entregar vacías en agencia",agency_office_full_box_pickup:"Recoger llenas en agencia",customer_home_delivery:"Domicilio de cliente",customer_empty_box_delivery:"Entregar vacía al cliente",customer_full_box_pickup:"Recoger llena del cliente" };

function newAssignmentIdempotencyKey(requestId: string, routeId: string) {
  return agencyAssignIdempotencyKey(requestId, routeId);
}

export function AgencyLogisticsPanel({
  organizationId = "",
}: {
  organizationId?: string;
}) {
  const notify=useNotify(); const [requests,setRequests]=useState<LogisticsAgencyRequest[]>([]); const [routes,setRoutes]=useState<LogisticsRouteRow[]>([]); const [proposals,setProposals]=useState<AgencyRouteProposal[]>([]); const [routeByRequest,setRouteByRequest]=useState<Record<string,string>>({}); const [pending,startTransition]=useTransition();
  const busyRef = useRef(false);
  const assignmentKeyByRequestRef = useRef<Record<string, string>>({});
  const scopeOrganizationId = organizationId.trim();

  const reload=useCallback(async()=>{const [requestResult,routeResult,proposalResult]=await Promise.all([listLogisticsAgencyRequestsAction(),listLogisticsRoutesAction({ statusMode: "active", limit: LOGISTICS_ROUTES_PAGE_SIZE, offset: 0 }),listAgencyRouteProposalsAction()]);if(requestResult.ok)setRequests(requestResult.data);if(routeResult.ok)setRoutes(routeResult.data);if(proposalResult.ok)setProposals(proposalResult.data);},[]);
  useEffect(()=>{const timer=window.setTimeout(()=>{void reload();},0);return()=>window.clearTimeout(timer);},[reload]);

  function assign(request: LogisticsAgencyRequest) {
    const routeId = routeByRequest[request.id];
    if (!routeId) return notify.error("Selecciona una ruta para la visita.");
    if (busyRef.current || pending) return;

    const orgKey = scopeOrganizationId || request.agencyId;
    const mintId = () => newAssignmentIdempotencyKey(request.id, routeId);
    const pendingIntention = orgKey
      ? resolveAgencyAssignIntention({
          organizationId: orgKey,
          requestId: request.id,
          routeId,
          mintId,
        })
      : null;
    const remembered = assignmentKeyByRequestRef.current[`${request.id}:${routeId}`];
    const idempotencyKey =
      (pendingIntention?.restored ? pendingIntention.clientAssignmentId : null) ||
      remembered ||
      pendingIntention?.clientAssignmentId ||
      mintId();
    assignmentKeyByRequestRef.current[`${request.id}:${routeId}`] = idempotencyKey;
    if (orgKey) {
      beginAgencyAssignIntention({
        organizationId: orgKey,
        requestId: request.id,
        routeId,
        clientAssignmentId: idempotencyKey,
      });
    }

    busyRef.current = true;
    startTransition(async () => {
      try {
        const result = await assignAgencyRequestToRouteAction({
          requestId: request.id,
          routeId,
          idempotencyKey,
        });
        if (!result.ok) {
          const error = result.error;
          if (
            error.includes(AGENCY_REQUEST_ALREADY_ASSIGNED) ||
            error === agencyAlreadyAssignedUserMessage()
          ) {
            notify.error(agencyAlreadyAssignedUserMessage());
            clearPendingAgencyAssignIntention(orgKey, request.id);
            delete assignmentKeyByRequestRef.current[`${request.id}:${routeId}`];
            await reload();
            return;
          }
          if (
            error.includes(AGENCY_IDEMPOTENCY_CONFLICT) ||
            error === agencyIdempotencyConflictUserMessage()
          ) {
            notify.error(agencyIdempotencyConflictUserMessage());
            clearPendingAgencyAssignIntention(orgKey, request.id);
            delete assignmentKeyByRequestRef.current[`${request.id}:${routeId}`];
            return;
          }
          notify.error(error);
          if (isDefinitiveAgencyClientError(error)) {
            clearPendingAgencyAssignIntention(orgKey, request.id);
            delete assignmentKeyByRequestRef.current[`${request.id}:${routeId}`];
          }
          return;
        }
        notify.success(
          result.data.replayed
            ? `Visita de ${request.agencyName} ya estaba asignada; se reutilizó el resultado.`
            : `Visita de ${request.agencyName} asignada a la ruta.`,
        );
        clearPendingAgencyAssignIntention(orgKey, request.id);
        delete assignmentKeyByRequestRef.current[`${request.id}:${routeId}`];
        await reload();
      } finally {
        busyRef.current = false;
      }
    });
  }

  function reviewProposal(proposal:AgencyRouteProposal,decision:"approved"|"rejected"){if(busyRef.current||pending)return;busyRef.current=true;startTransition(async()=>{try{const result=await reviewAgencyRouteProposalAction({proposalId:proposal.id,decision});if(!result.ok)return notify.error(result.error);notify.success(decision==="approved"?`Ruta de ${proposal.agencyName} aprobada.`:"Propuesta rechazada.");await reload();}finally{busyRef.current=false;}});}
  return <Panel title="Visitas de agencias" action={<><Building2 className="h-5 w-5 text-emerald-300"/><CompactInfoDisclosure ariaLabel="Información logística de agencias">Movimientos de oficina y domicilios de clientes se identifican por separado, pero pueden viajar en la misma ruta. Aquí no se configuran precios ni saldos.</CompactInfoDisclosure></>}>
    {proposals.length?<div className="mb-3 grid gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3"><p className="text-sm font-black text-amber-100">Rutas propuestas por agencias</p>{proposals.map((proposal)=><div key={proposal.id} className="flex flex-wrap items-center gap-2 rounded-md bg-surface-inset p-2 text-sm"><span className="min-w-0 flex-1 font-bold text-slate-200">{proposal.agencyName}: {proposal.name} · día {proposal.weekday}</span><button type="button" className={primaryButtonClass} disabled={pending} onClick={()=>reviewProposal(proposal,"approved")}>Aprobar y crear ruta</button><button type="button" className="text-xs font-black text-rose-200" disabled={pending} onClick={()=>reviewProposal(proposal,"rejected")}>Rechazar</button></div>)}</div>:null}
    <div className="grid gap-2">{requests.length?requests.map((request)=><article key={request.id} className="grid gap-3 rounded-lg border border-black bg-surface-list-row p-3 lg:grid-cols-[minmax(0,1fr)_16rem_auto] lg:items-center"><div className="min-w-0"><p className="font-black text-slate-100">{request.agencyName} <span className="text-xs text-emerald-300">{request.code}</span></p><p className="truncate text-xs font-bold text-slate-400">{request.requestScope==="agency_customer"?"Cliente de agencia":"Oficina de agencia"} · {request.lines.map((line)=>`${serviceLabels[line.serviceCode]||line.serviceCode} ${line.requestedQuantity}`).join(" · ")}</p>{request.address?<p className="truncate text-xs font-bold text-slate-500">{request.address}</p>:null}</div><select className="h-9 rounded-lg border border-black bg-surface-inset px-2 text-sm font-black text-slate-100" value={routeByRequest[request.id]||""} onChange={(event)=>setRouteByRequest((current)=>({...current,[request.id]:event.target.value}))}><option value="">Asignar a ruta</option>{routes.map((route)=><option key={route.id} value={route.id}>{route.name} · {route.routeDate}</option>)}</select><button type="button" className={primaryButtonClass} onClick={()=>assign(request)} disabled={pending}><Route className="h-4 w-4"/>{pending?<Loader2 className="h-4 w-4 animate-spin"/>:"Asignar"}</button></article>):<div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm font-bold text-slate-400">No hay solicitudes de agencias pendientes.</div>}</div>
  </Panel>;
}
