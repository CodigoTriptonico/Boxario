export function formatScheduleDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/** Local calendar date (YYYY-MM-DD) for a stored schedule timestamp. */
export function scheduledAtToLocalDateInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const planWindowDate =
    /^(\d{4}-\d{2}-\d{2})T(?:-\d{2}:\d{2}|\d{2}:\d{2}\+|\d{2}:\d{2}-\d{2}:\d{2})$/.exec(
      value,
    )?.[1] || "";
  if (planWindowDate) {
    return planWindowDate;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    const planDate = /^(\d{4}-\d{2}-\d{2})T/.exec(value)?.[1] || "";
    return /^\d{4}-\d{2}-\d{2}$/.test(planDate) ? planDate : "";
  }

  return formatScheduleDateInput(date);
}

export function minScheduleDateInput(reference = new Date()) {
  return formatScheduleDateInput(reference);
}

export function minScheduleDatetimeInput(reference = new Date()) {
  return `${minScheduleDateInput(reference)}T00:00`;
}

export function resolveScheduleDate(date?: string, reference = new Date()) {
  const min = minScheduleDateInput(reference);
  if (!date) {
    return min;
  }

  return date < min ? min : date;
}

export function resolveScheduleDatetime(value?: string, reference = new Date()) {
  const min = minScheduleDatetimeInput(reference);
  if (!value) {
    return min;
  }

  return value < min ? min : value;
}
