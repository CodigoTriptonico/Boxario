import { isDayAsRouteTemplateId } from "@/lib/logistics-day-route";

export function resolveLogisticsDefaultDriverId(input: {
  weekday: number;
  routeTemplateId?: string | null;
  templates: Array<{ id: string; weekday: number; defaultDriverId?: string | null }>;
  defaultDriverByWeekday: Array<string | null>;
}) {
  const routeTemplateId = String(input.routeTemplateId || "").trim();
  if (routeTemplateId && !isDayAsRouteTemplateId(routeTemplateId)) {
    return input.templates.find((template) => template.id === routeTemplateId)?.defaultDriverId || "";
  }

  const dayHasSubroutes = input.templates.some(
    (template) => Number(template.weekday) === input.weekday,
  );
  if (dayHasSubroutes) {
    return "";
  }

  return input.defaultDriverByWeekday[input.weekday] || "";
}
