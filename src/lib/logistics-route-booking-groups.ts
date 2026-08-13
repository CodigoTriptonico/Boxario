import type { CustomerRouteAssignmentRequestRow } from "@/lib/customer-route-assignment-types";
import type { LogisticsRouteRow } from "@/lib/logistics-routing";

export function bookingGroupKey(booking: CustomerRouteAssignmentRequestRow) {
  return `${booking.routeDate}|${booking.routeDefinitionId || booking.routeTemplateId || `day:${booking.routeWeekday}`}|${booking.routeScheduleId || "general"}`;
}

export function routeMatchesBooking(
  route: LogisticsRouteRow,
  booking: CustomerRouteAssignmentRequestRow,
) {
  return route.status === "draft" && routeMatchesBookingIdentity(route, booking);
}

export function routeMatchesBookingIdentity(
  route: LogisticsRouteRow,
  booking: CustomerRouteAssignmentRequestRow,
) {
  if (route.routeDate !== booking.routeDate) return false;
  if (booking.routeScheduleId) return route.routeScheduleId === booking.routeScheduleId;
  if (booking.routeDefinitionId) return route.routeDefinitionId === booking.routeDefinitionId;
  if (booking.routeTemplateId) return route.routeTemplateId === booking.routeTemplateId;
  return !route.routeTemplateId && route.name === booking.routeTemplateName;
}

export function groupPendingBookings(bookings: CustomerRouteAssignmentRequestRow[]) {
  const groups = new Map<string, CustomerRouteAssignmentRequestRow[]>();
  for (const booking of bookings) {
    const key = bookingGroupKey(booking);
    groups.set(key, [...(groups.get(key) || []), booking]);
  }
  return groups;
}

export function findPendingBookingGroupForTask(
  bookings: CustomerRouteAssignmentRequestRow[],
  taskId: string,
) {
  const booking = bookings.find((entry) => entry.taskId === taskId);
  if (!booking) {
    return null;
  }

  const key = bookingGroupKey(booking);
  const items = bookings.filter((entry) => bookingGroupKey(entry) === key);
  return { key, items, first: booking };
}

export function findOpenRouteForBooking(
  routes: LogisticsRouteRow[],
  booking: CustomerRouteAssignmentRequestRow,
) {
  return routes.find((route) => routeMatchesBooking(route, booking)) || null;
}
