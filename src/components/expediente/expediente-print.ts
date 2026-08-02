export function expedientePrintTargetId(invoiceNumber: string) {
  return `expediente-document-${invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function printExpedienteDocuments(targetIds: string | string[]) {
  const ids = Array.isArray(targetIds) ? targetIds : [targetIds];
  const targets = ids
    .map((id) => document.getElementById(id))
    .filter((node): node is HTMLElement => Boolean(node));

  if (!targets.length) {
    return;
  }

  const root = document.documentElement;
  const cleanup = () => {
    root.classList.remove("sale-print-single");
    for (const target of targets) {
      target.classList.remove("sale-document-print-selected");
    }
  };

  root.classList.add("sale-print-single");
  for (const target of targets) {
    target.classList.add("sale-document-print-selected");
  }

  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
}
