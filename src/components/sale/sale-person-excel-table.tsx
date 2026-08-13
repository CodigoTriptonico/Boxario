"use client";

import type { MouseEvent, ReactNode } from "react";

export type SalePersonExcelColumn<Row> = {
  label: string;
  className?: string;
  render: (row: Row) => ReactNode;
};

type SalePersonExcelRowMeta = {
  className?: string;
  contextProps?: Record<string, string | undefined>;
  onContextMenu?: (event: MouseEvent<HTMLTableRowElement>) => void;
};

export function SalePersonExcelTable<Row>({
  rows,
  caption,
  emptyLabel,
  columns,
  getRowKey,
  getRowLabel,
  getRowMeta,
  onChoose,
  actions,
}: {
  rows: Row[];
  caption: string;
  emptyLabel: string;
  columns: SalePersonExcelColumn<Row>[];
  getRowKey: (row: Row) => string;
  getRowLabel: (row: Row) => string;
  getRowMeta?: (row: Row) => SalePersonExcelRowMeta;
  onChoose: (row: Row) => void;
  actions?: (row: Row) => ReactNode;
}) {
  return (
    <div className="min-h-0 overflow-x-auto rounded-lg border border-black bg-surface-card">
      <table className="min-w-[980px] w-full border-collapse text-left text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 z-10 bg-surface-card-header text-[10px] font-black uppercase tracking-wide text-slate-400">
          <tr>
            {columns.map((column) => (
              <th key={column.label} scope="col" className={`border-b border-black px-3 py-2 ${column.className || ""}`}>
                {column.label}
              </th>
            ))}
            {actions ? <th scope="col" className="min-w-[9rem] border-b border-black px-3 py-2">Acciones</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row) => {
            const meta = getRowMeta?.(row);
            return (
              <tr
                key={getRowKey(row)}
                {...meta?.contextProps}
                role="button"
                tabIndex={0}
                aria-label={`Seleccionar ${getRowLabel(row)}`}
                className={`cursor-pointer text-slate-200 transition hover:bg-surface-inset focus-visible:bg-surface-inset focus-visible:outline-none ${meta?.className || ""}`}
                onClick={() => onChoose(row)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  onChoose(row);
                }}
                onContextMenu={meta?.onContextMenu}
              >
                {columns.map((column) => (
                  <td key={column.label} className={`border-b border-black/70 px-3 py-2 align-middle ${column.className || ""}`}>
                    {column.render(row)}
                  </td>
                ))}
                {actions ? (
                  <td className="min-w-[9rem] border-b border-black/70 px-3 py-2 align-middle" onClick={(event) => event.stopPropagation()}>
                    <div className="flex flex-wrap items-center gap-1.5">{actions(row)}</div>
                  </td>
                ) : null}
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-8 text-center text-sm font-black text-slate-400">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
