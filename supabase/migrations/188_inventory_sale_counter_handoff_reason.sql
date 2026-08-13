-- Counter handoff is an auditable sale fulfillment performed immediately at the office.
-- Migration 132 records this more precise reason, so the movement catalog must accept it.

alter table public.inventory_movements
  drop constraint if exists inventory_movements_reason_code_check;

alter table public.inventory_movements
  add constraint inventory_movements_reason_code_check check (
    reason_code in (
      'unspecified',
      'manual_entry',
      'manual_exit',
      'physical_count',
      'sale_fulfillment',
      'sale_counter_handoff',
      'warehouse_transfer_out',
      'warehouse_transfer_in',
      'warehouse_transfer_cancel',
      'assignment_issue',
      'assignment_return',
      'assignment_consume',
      'assignment_damage',
      'assignment_loss',
      'agency_delivery',
      'correction_reversal',
      'other'
    )
  );
