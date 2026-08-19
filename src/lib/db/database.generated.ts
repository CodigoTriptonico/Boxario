export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by_membership_id: string | null
          created_at: string
          ends_on: string
          id: string
          matrix_organization_id: string
          starts_on: string
          status: string
          tenant_id: string
        }
        Insert: {
          closed_at?: string | null
          closed_by_membership_id?: string | null
          created_at?: string
          ends_on: string
          id?: string
          matrix_organization_id: string
          starts_on: string
          status?: string
          tenant_id: string
        }
        Update: {
          closed_at?: string | null
          closed_by_membership_id?: string | null
          created_at?: string
          ends_on?: string
          id?: string
          matrix_organization_id?: string
          starts_on?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_closed_by_membership_id_fkey"
            columns: ["closed_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_periods_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_history: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          organization_id: string
          title: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          organization_id: string
          title: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          organization_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          archived_at: string | null
          code: string
          created_at: string
          id: string
          legacy_distribution_partner_id: string | null
          matrix_organization_id: string
          max_administrators: number
          max_sellers: number
          organization_id: string
          status: string
          status_version: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          code: string
          created_at?: string
          id?: string
          legacy_distribution_partner_id?: string | null
          matrix_organization_id: string
          max_administrators?: number
          max_sellers?: number
          organization_id: string
          status?: string
          status_version?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          code?: string
          created_at?: string
          id?: string
          legacy_distribution_partner_id?: string | null
          matrix_organization_id?: string
          max_administrators?: number
          max_sellers?: number
          organization_id?: string
          status?: string
          status_version?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agencies_legacy_distribution_partner_id_fkey"
            columns: ["legacy_distribution_partner_id"]
            isOneToOne: true
            referencedRelation: "distribution_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencies_tenant_id_matrix_organization_id_fkey"
            columns: ["tenant_id", "matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "agencies_tenant_id_matrix_organization_id_fkey1"
            columns: ["tenant_id", "matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id", "matrix_organization_id"]
          },
          {
            foreignKeyName: "agencies_tenant_id_organization_id_fkey"
            columns: ["tenant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      agency_adjustments: {
        Row: {
          agency_organization_id: string
          amount_cents: number
          charge_id: string
          created_at: string
          created_by_membership_id: string | null
          currency: string
          id: string
          idempotency_key: string
          matrix_organization_id: string
          reason: string
          tenant_id: string
        }
        Insert: {
          agency_organization_id: string
          amount_cents: number
          charge_id: string
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          id?: string
          idempotency_key: string
          matrix_organization_id: string
          reason: string
          tenant_id: string
        }
        Update: {
          agency_organization_id?: string
          amount_cents?: number
          charge_id?: string
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          id?: string
          idempotency_key?: string
          matrix_organization_id?: string
          reason?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_adjustments_agency_organization_id_fkey"
            columns: ["agency_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_adjustments_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "agency_charge_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_adjustments_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "agency_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_adjustments_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_adjustments_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_box_allocations: {
        Row: {
          agency_id: string
          allocated_at: string
          id: string
          lot_id: string
          organization_id: string
          quantity: number
          shipment_box_source_id: string
          shipment_id: string
          tenant_id: string
        }
        Insert: {
          agency_id: string
          allocated_at?: string
          id?: string
          lot_id: string
          organization_id: string
          quantity: number
          shipment_box_source_id: string
          shipment_id: string
          tenant_id: string
        }
        Update: {
          agency_id?: string
          allocated_at?: string
          id?: string
          lot_id?: string
          organization_id?: string
          quantity?: number
          shipment_box_source_id?: string
          shipment_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_box_allocations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_allocations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "agency_box_lot_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_allocations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "agency_box_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_allocations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_allocations_shipment_box_source_id_fkey"
            columns: ["shipment_box_source_id"]
            isOneToOne: false
            referencedRelation: "agency_shipment_box_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_allocations_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_allocations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_box_batches: {
        Row: {
          agency_id: string
          created_at: string
          delivered_at: string
          delivered_by_membership_id: string
          id: string
          organization_id: string
          source_visit_id: string
          tenant_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          delivered_at: string
          delivered_by_membership_id: string
          id?: string
          organization_id: string
          source_visit_id: string
          tenant_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          delivered_at?: string
          delivered_by_membership_id?: string
          id?: string
          organization_id?: string
          source_visit_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_box_batches_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_batches_delivered_by_membership_id_fkey"
            columns: ["delivered_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_batches_source_visit_id_fkey"
            columns: ["source_visit_id"]
            isOneToOne: true
            referencedRelation: "agency_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_box_custody_events: {
        Row: {
          agency_id: string
          evidence: Json
          holder_id: string | null
          holder_type: string
          id: string
          movement_type: string
          occurred_at: string
          quantity: number
          request_line_id: string
          tenant_id: string
          visit_line_id: string | null
        }
        Insert: {
          agency_id: string
          evidence?: Json
          holder_id?: string | null
          holder_type: string
          id?: string
          movement_type: string
          occurred_at?: string
          quantity: number
          request_line_id: string
          tenant_id: string
          visit_line_id?: string | null
        }
        Update: {
          agency_id?: string
          evidence?: Json
          holder_id?: string | null
          holder_type?: string
          id?: string
          movement_type?: string
          occurred_at?: string
          quantity?: number
          request_line_id?: string
          tenant_id?: string
          visit_line_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_box_custody_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_custody_events_request_line_id_fkey"
            columns: ["request_line_id"]
            isOneToOne: false
            referencedRelation: "agency_service_request_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_custody_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_custody_events_visit_line_id_fkey"
            columns: ["visit_line_id"]
            isOneToOne: false
            referencedRelation: "agency_visit_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_box_lots: {
        Row: {
          agency_id: string
          batch_id: string
          box_size: string
          created_at: string
          delivered_at: string
          delivered_quantity: number
          id: string
          inventory_item_id: string
          organization_id: string
          product_key: string
          source_visit_line_id: string
          tenant_id: string
        }
        Insert: {
          agency_id: string
          batch_id: string
          box_size: string
          created_at?: string
          delivered_at: string
          delivered_quantity: number
          id?: string
          inventory_item_id: string
          organization_id: string
          product_key: string
          source_visit_line_id: string
          tenant_id: string
        }
        Update: {
          agency_id?: string
          batch_id?: string
          box_size?: string
          created_at?: string
          delivered_at?: string
          delivered_quantity?: number
          id?: string
          inventory_item_id?: string
          organization_id?: string
          product_key?: string
          source_visit_line_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_box_lots_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_lots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "agency_box_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_lots_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_lots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_lots_source_visit_line_id_fkey"
            columns: ["source_visit_line_id"]
            isOneToOne: true
            referencedRelation: "agency_visit_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_lots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_box_movements: {
        Row: {
          actor_membership_id: string | null
          agency_id: string
          id: string
          lot_id: string | null
          movement_type: string
          occurred_at: string
          organization_id: string
          quantity_delta: number
          reason: string
          source_operation_id: string
          source_operation_type: string
          tenant_id: string
        }
        Insert: {
          actor_membership_id?: string | null
          agency_id: string
          id?: string
          lot_id?: string | null
          movement_type: string
          occurred_at?: string
          organization_id: string
          quantity_delta: number
          reason?: string
          source_operation_id: string
          source_operation_type: string
          tenant_id: string
        }
        Update: {
          actor_membership_id?: string | null
          agency_id?: string
          id?: string
          lot_id?: string | null
          movement_type?: string
          occurred_at?: string
          organization_id?: string
          quantity_delta?: number
          reason?: string
          source_operation_id?: string
          source_operation_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_box_movements_actor_membership_id_fkey"
            columns: ["actor_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_movements_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_movements_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "agency_box_lot_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_movements_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "agency_box_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_captor_assignments: {
        Row: {
          agency_id: string
          assigned_by_membership_id: string | null
          captor_membership_id: string
          created_at: string
          ended_at: string | null
          id: string
          reason: string
          started_at: string
          tenant_id: string
        }
        Insert: {
          agency_id: string
          assigned_by_membership_id?: string | null
          captor_membership_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          reason: string
          started_at?: string
          tenant_id: string
        }
        Update: {
          agency_id?: string
          assigned_by_membership_id?: string | null
          captor_membership_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          reason?: string
          started_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_captor_assignments_tenant_id_agency_id_fkey"
            columns: ["tenant_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "agency_captor_assignments_tenant_id_assigned_by_membership_fkey"
            columns: ["tenant_id", "assigned_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "agency_captor_assignments_tenant_id_captor_membership_id_fkey"
            columns: ["tenant_id", "captor_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "agency_captor_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_charges: {
        Row: {
          agency_organization_id: string
          amount_cents: number
          concept: string
          created_at: string
          created_by_membership_id: string | null
          currency: string
          due_at: string | null
          id: string
          idempotency_key: string | null
          matrix_organization_id: string
          metadata: Json
          package_id: string | null
          posted_at: string
          sale_id: string | null
          shipment_id: string | null
          source_operation_id: string
          source_operation_type: string
          tenant_id: string
        }
        Insert: {
          agency_organization_id: string
          amount_cents: number
          concept: string
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          due_at?: string | null
          id?: string
          idempotency_key?: string | null
          matrix_organization_id: string
          metadata?: Json
          package_id?: string | null
          posted_at?: string
          sale_id?: string | null
          shipment_id?: string | null
          source_operation_id: string
          source_operation_type: string
          tenant_id: string
        }
        Update: {
          agency_organization_id?: string
          amount_cents?: number
          concept?: string
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          due_at?: string | null
          id?: string
          idempotency_key?: string | null
          matrix_organization_id?: string
          metadata?: Json
          package_id?: string | null
          posted_at?: string
          sale_id?: string | null
          shipment_id?: string | null
          source_operation_id?: string
          source_operation_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_charges_agency_organization_id_fkey"
            columns: ["agency_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_charges_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_charges_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_charges_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "shipment_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_charges_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_charges_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_credits: {
        Row: {
          agency_organization_id: string
          amount_cents: number
          charge_id: string
          created_at: string
          created_by_membership_id: string | null
          currency: string
          id: string
          idempotency_key: string
          matrix_organization_id: string
          reason: string
          tenant_id: string
        }
        Insert: {
          agency_organization_id: string
          amount_cents: number
          charge_id: string
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          id?: string
          idempotency_key: string
          matrix_organization_id: string
          reason: string
          tenant_id: string
        }
        Update: {
          agency_organization_id?: string
          amount_cents?: number
          charge_id?: string
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          id?: string
          idempotency_key?: string
          matrix_organization_id?: string
          reason?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_credits_agency_organization_id_fkey"
            columns: ["agency_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_credits_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "agency_charge_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_credits_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "agency_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_credits_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_credits_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_credits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_daily_closure_events: {
        Row: {
          actor_id: string
          closure_id: string
          created_at: string
          event_type: string
          id: string
          organization_id: string
          snapshot: Json
        }
        Insert: {
          actor_id: string
          closure_id: string
          created_at?: string
          event_type: string
          id?: string
          organization_id: string
          snapshot?: Json
        }
        Update: {
          actor_id?: string
          closure_id?: string
          created_at?: string
          event_type?: string
          id?: string
          organization_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "agency_daily_closure_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_daily_closure_events_closure_id_fkey"
            columns: ["closure_id"]
            isOneToOne: false
            referencedRelation: "agency_daily_closures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_daily_closure_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_daily_closures: {
        Row: {
          counted_cash_cents: number
          created_at: string
          difference_cents: number | null
          difference_reason: string
          expected_cash_cents: number
          finalized_at: string | null
          finalized_by: string | null
          id: string
          idempotency_key: string
          operating_date: string
          organization_id: string
          prepared_at: string
          prepared_by: string
          status: string
          summary: Json
          timezone: string
        }
        Insert: {
          counted_cash_cents: number
          created_at?: string
          difference_cents?: number | null
          difference_reason?: string
          expected_cash_cents: number
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          idempotency_key: string
          operating_date: string
          organization_id: string
          prepared_at?: string
          prepared_by: string
          status?: string
          summary?: Json
          timezone?: string
        }
        Update: {
          counted_cash_cents?: number
          created_at?: string
          difference_cents?: number | null
          difference_reason?: string
          expected_cash_cents?: number
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          idempotency_key?: string
          operating_date?: string
          organization_id?: string
          prepared_at?: string
          prepared_by?: string
          status?: string
          summary?: Json
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_daily_closures_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_daily_closures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_daily_closures_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_default_route_assignments: {
        Row: {
          agency_id: string
          assigned_by_membership_id: string
          created_at: string
          ended_at: string | null
          id: string
          organization_id: string
          reason: string
          route_template_id: string
          started_at: string
          tenant_id: string
        }
        Insert: {
          agency_id: string
          assigned_by_membership_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          organization_id: string
          reason?: string
          route_template_id: string
          started_at?: string
          tenant_id: string
        }
        Update: {
          agency_id?: string
          assigned_by_membership_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          organization_id?: string
          reason?: string
          route_template_id?: string
          started_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_default_route_assignments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_default_route_assignments_assigned_by_membership_id_fkey"
            columns: ["assigned_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_default_route_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_default_route_assignments_route_template_id_fkey"
            columns: ["route_template_id"]
            isOneToOne: false
            referencedRelation: "logistics_route_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_default_route_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_financial_reversals: {
        Row: {
          agency_organization_id: string
          amount_cents: number
          created_at: string
          created_by_membership_id: string | null
          currency: string
          id: string
          idempotency_key: string
          matrix_organization_id: string
          reason: string
          target_id: string
          target_type: string
          tenant_id: string
        }
        Insert: {
          agency_organization_id: string
          amount_cents: number
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          id?: string
          idempotency_key: string
          matrix_organization_id: string
          reason: string
          target_id: string
          target_type: string
          tenant_id: string
        }
        Update: {
          agency_organization_id?: string
          amount_cents?: number
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          id?: string
          idempotency_key?: string
          matrix_organization_id?: string
          reason?: string
          target_id?: string
          target_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_financial_reversals_agency_organization_id_fkey"
            columns: ["agency_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_financial_reversals_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_financial_reversals_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_financial_reversals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_payment_application_reversals: {
        Row: {
          application_id: string
          created_at: string
          created_by_membership_id: string | null
          id: string
          reason: string
          tenant_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by_membership_id?: string | null
          id?: string
          reason: string
          tenant_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by_membership_id?: string | null
          id?: string
          reason?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_payment_application_revers_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_payment_application_reversals_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "agency_payment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_payment_application_reversals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_payment_applications: {
        Row: {
          agency_organization_id: string
          amount_cents: number
          applied_at: string
          applied_by_membership_id: string | null
          charge_id: string
          created_at: string
          id: string
          matrix_organization_id: string
          payment_id: string
          tenant_id: string
        }
        Insert: {
          agency_organization_id: string
          amount_cents: number
          applied_at?: string
          applied_by_membership_id?: string | null
          charge_id: string
          created_at?: string
          id?: string
          matrix_organization_id: string
          payment_id: string
          tenant_id: string
        }
        Update: {
          agency_organization_id?: string
          amount_cents?: number
          applied_at?: string
          applied_by_membership_id?: string | null
          charge_id?: string
          created_at?: string
          id?: string
          matrix_organization_id?: string
          payment_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_payment_applications_agency_organization_id_fkey"
            columns: ["agency_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_payment_applications_applied_by_membership_id_fkey"
            columns: ["applied_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_payment_applications_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "agency_charge_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_payment_applications_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "agency_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_payment_applications_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_payment_applications_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "agency_payment_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_payment_applications_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "agency_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_payment_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_payments: {
        Row: {
          agency_organization_id: string
          amount_cents: number
          created_at: string
          created_by_membership_id: string | null
          currency: string
          id: string
          idempotency_key: string
          matrix_organization_id: string
          metadata: Json
          method: string
          received_at: string
          reference: string
          tenant_id: string
        }
        Insert: {
          agency_organization_id: string
          amount_cents: number
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          id?: string
          idempotency_key: string
          matrix_organization_id: string
          metadata?: Json
          method: string
          received_at?: string
          reference?: string
          tenant_id: string
        }
        Update: {
          agency_organization_id?: string
          amount_cents?: number
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          id?: string
          idempotency_key?: string
          matrix_organization_id?: string
          metadata?: Json
          method?: string
          received_at?: string
          reference?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_payments_agency_organization_id_fkey"
            columns: ["agency_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_payments_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_payments_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_price_list_lines: {
        Row: {
          amount_cents: number
          concept: string
          created_at: string
          currency: string
          destination_code: string
          id: string
          price_list_version_id: string
          product_code: string
          snapshot: Json
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          concept: string
          created_at?: string
          currency?: string
          destination_code: string
          id?: string
          price_list_version_id: string
          product_code: string
          snapshot?: Json
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          concept?: string
          created_at?: string
          currency?: string
          destination_code?: string
          id?: string
          price_list_version_id?: string
          product_code?: string
          snapshot?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_price_list_lines_price_list_version_id_fkey"
            columns: ["price_list_version_id"]
            isOneToOne: false
            referencedRelation: "agency_price_list_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_price_list_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_price_list_versions: {
        Row: {
          agency_organization_id: string
          created_at: string
          created_by_membership_id: string | null
          id: string
          name: string
          status: string
          tenant_id: string
          valid_from: string
          valid_until: string | null
          version: number
        }
        Insert: {
          agency_organization_id: string
          created_at?: string
          created_by_membership_id?: string | null
          id?: string
          name: string
          status?: string
          tenant_id: string
          valid_from: string
          valid_until?: string | null
          version: number
        }
        Update: {
          agency_organization_id?: string
          created_at?: string
          created_by_membership_id?: string | null
          id?: string
          name?: string
          status?: string
          tenant_id?: string
          valid_from?: string
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agency_price_list_versions_agency_organization_id_fkey"
            columns: ["agency_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_price_list_versions_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_price_list_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_request_status_history: {
        Row: {
          actor_membership_id: string | null
          id: string
          occurred_at: string
          organization_id: string
          previous_status: string
          reason: string
          request_id: string
          status: string
          status_version: number
          tenant_id: string
        }
        Insert: {
          actor_membership_id?: string | null
          id?: string
          occurred_at?: string
          organization_id: string
          previous_status: string
          reason?: string
          request_id: string
          status: string
          status_version: number
          tenant_id: string
        }
        Update: {
          actor_membership_id?: string | null
          id?: string
          occurred_at?: string
          organization_id?: string
          previous_status?: string
          reason?: string
          request_id?: string
          status?: string
          status_version?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_request_status_history_actor_membership_id_fkey"
            columns: ["actor_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_request_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "agency_service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_request_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_route_proposals: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          name: string
          note: string
          organization_id: string
          review_note: string
          reviewed_at: string | null
          reviewed_by_membership_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          name: string
          note?: string
          organization_id: string
          review_note?: string
          reviewed_at?: string | null
          reviewed_by_membership_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          name?: string
          note?: string
          organization_id?: string
          review_note?: string
          reviewed_at?: string | null
          reviewed_by_membership_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "agency_route_proposals_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_route_proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_route_proposals_reviewed_by_membership_id_fkey"
            columns: ["reviewed_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_route_proposals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_service_request_lines: {
        Row: {
          box_size: string
          commercial_price_snapshot: Json
          confirmed_quantity: number
          created_at: string
          currency: string
          details: Json
          id: string
          inventory_item_id: string | null
          matrix_warehouse_id: string | null
          organization_id: string
          product_key: string
          request_id: string
          requested_quantity: number
          service_code: string
          service_kind: string
          tenant_id: string
          unit_charge_amount_cents: number
          updated_at: string
        }
        Insert: {
          box_size?: string
          commercial_price_snapshot?: Json
          confirmed_quantity?: number
          created_at?: string
          currency?: string
          details?: Json
          id?: string
          inventory_item_id?: string | null
          matrix_warehouse_id?: string | null
          organization_id: string
          product_key?: string
          request_id: string
          requested_quantity: number
          service_code: string
          service_kind: string
          tenant_id: string
          unit_charge_amount_cents?: number
          updated_at?: string
        }
        Update: {
          box_size?: string
          commercial_price_snapshot?: Json
          confirmed_quantity?: number
          created_at?: string
          currency?: string
          details?: Json
          id?: string
          inventory_item_id?: string | null
          matrix_warehouse_id?: string | null
          organization_id?: string
          product_key?: string
          request_id?: string
          requested_quantity?: number
          service_code?: string
          service_kind?: string
          tenant_id?: string
          unit_charge_amount_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_service_request_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_service_request_lines_matrix_warehouse_id_fkey"
            columns: ["matrix_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_service_request_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_service_request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "agency_service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_service_request_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_service_requests: {
        Row: {
          address_snapshot: Json
          agency_customer_id: string | null
          agency_id: string
          code: string
          created_at: string
          created_by_membership_id: string
          id: string
          notes: string
          organization_id: string
          request_scope: string
          requested_service_date: string | null
          status: string
          status_version: number
          submitted_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address_snapshot?: Json
          agency_customer_id?: string | null
          agency_id: string
          code: string
          created_at?: string
          created_by_membership_id?: string
          id?: string
          notes?: string
          organization_id?: string
          request_scope?: string
          requested_service_date?: string | null
          status?: string
          status_version?: number
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          address_snapshot?: Json
          agency_customer_id?: string | null
          agency_id?: string
          code?: string
          created_at?: string
          created_by_membership_id?: string
          id?: string
          notes?: string
          organization_id?: string
          request_scope?: string
          requested_service_date?: string | null
          status?: string
          status_version?: number
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_service_requests_agency_customer_id_fkey"
            columns: ["agency_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_service_requests_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_service_requests_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_service_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_service_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_shipment_box_sources: {
        Row: {
          agency_id: string
          allocation_status: string
          box_size: string
          created_at: string
          created_by_membership_id: string
          id: string
          inventory_item_id: string | null
          organization_id: string
          product_key: string
          quantity: number
          shipment_id: string
          source: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          allocation_status?: string
          box_size?: string
          created_at?: string
          created_by_membership_id: string
          id?: string
          inventory_item_id?: string | null
          organization_id: string
          product_key?: string
          quantity?: number
          shipment_id: string
          source: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          allocation_status?: string
          box_size?: string
          created_at?: string
          created_by_membership_id?: string
          id?: string
          inventory_item_id?: string | null
          organization_id?: string
          product_key?: string
          quantity?: number
          shipment_id?: string
          source?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_shipment_box_sources_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_shipment_box_sources_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_shipment_box_sources_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_shipment_box_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_shipment_box_sources_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: true
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_shipment_box_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_status_history: {
        Row: {
          actor_membership_id: string | null
          agency_id: string
          id: string
          occurred_at: string
          previous_status: string | null
          reason: string
          status: string
          tenant_id: string
          version: number
        }
        Insert: {
          actor_membership_id?: string | null
          agency_id: string
          id?: string
          occurred_at?: string
          previous_status?: string | null
          reason: string
          status: string
          tenant_id: string
          version: number
        }
        Update: {
          actor_membership_id?: string | null
          agency_id?: string
          id?: string
          occurred_at?: string
          previous_status?: string | null
          reason?: string
          status?: string
          tenant_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agency_status_history_tenant_id_actor_membership_id_fkey"
            columns: ["tenant_id", "actor_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "agency_status_history_tenant_id_agency_id_fkey"
            columns: ["tenant_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "agency_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_support_delegations: {
        Row: {
          agency_id: string
          created_at: string
          delegate_membership_id: string
          granted_by_membership_id: string
          id: string
          permissions: string[]
          reason: string
          revoked_at: string | null
          tenant_id: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          delegate_membership_id: string
          granted_by_membership_id: string
          id?: string
          permissions?: string[]
          reason: string
          revoked_at?: string | null
          tenant_id: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          delegate_membership_id?: string
          granted_by_membership_id?: string
          id?: string
          permissions?: string[]
          reason?: string
          revoked_at?: string | null
          tenant_id?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_support_delegations_tenant_id_agency_id_fkey"
            columns: ["tenant_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "agency_support_delegations_tenant_id_delegate_membership_i_fkey"
            columns: ["tenant_id", "delegate_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "agency_support_delegations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_support_delegations_tenant_id_granted_by_membership_fkey"
            columns: ["tenant_id", "granted_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      agency_visit_lines: {
        Row: {
          confirmed_at: string | null
          confirmed_quantity: number | null
          created_at: string
          difference_quantity: number | null
          difference_reason: string
          evidence: Json
          id: string
          organization_id: string
          request_line_id: string
          requested_quantity: number
          responsible_membership_id: string | null
          tenant_id: string
          updated_at: string
          visit_id: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_quantity?: number | null
          created_at?: string
          difference_quantity?: number | null
          difference_reason?: string
          evidence?: Json
          id?: string
          organization_id: string
          request_line_id: string
          requested_quantity: number
          responsible_membership_id?: string | null
          tenant_id: string
          updated_at?: string
          visit_id: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_quantity?: number | null
          created_at?: string
          difference_quantity?: number | null
          difference_reason?: string
          evidence?: Json
          id?: string
          organization_id?: string
          request_line_id?: string
          requested_quantity?: number
          responsible_membership_id?: string | null
          tenant_id?: string
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_visit_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_visit_lines_request_line_id_fkey"
            columns: ["request_line_id"]
            isOneToOne: false
            referencedRelation: "agency_service_request_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_visit_lines_responsible_membership_id_fkey"
            columns: ["responsible_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_visit_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_visit_lines_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "agency_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_visit_status_history: {
        Row: {
          actor_membership_id: string | null
          id: string
          occurred_at: string
          organization_id: string
          previous_status: string
          reason: string
          status: string
          status_version: number
          tenant_id: string
          visit_id: string
        }
        Insert: {
          actor_membership_id?: string | null
          id?: string
          occurred_at?: string
          organization_id: string
          previous_status: string
          reason?: string
          status: string
          status_version: number
          tenant_id: string
          visit_id: string
        }
        Update: {
          actor_membership_id?: string | null
          id?: string
          occurred_at?: string
          organization_id?: string
          previous_status?: string
          reason?: string
          status?: string
          status_version?: number
          tenant_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_visit_status_history_actor_membership_id_fkey"
            columns: ["actor_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_visit_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_visit_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_visit_status_history_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "agency_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_visits: {
        Row: {
          address_snapshot: Json
          agency_id: string
          confirmed_at: string | null
          confirmed_by_membership_id: string | null
          created_at: string
          created_by_membership_id: string
          id: string
          notes: string
          organization_id: string
          route_id: string | null
          scheduled_for: string | null
          status: string
          status_version: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address_snapshot?: Json
          agency_id: string
          confirmed_at?: string | null
          confirmed_by_membership_id?: string | null
          created_at?: string
          created_by_membership_id: string
          id?: string
          notes?: string
          organization_id: string
          route_id?: string | null
          scheduled_for?: string | null
          status?: string
          status_version?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address_snapshot?: Json
          agency_id?: string
          confirmed_at?: string | null
          confirmed_by_membership_id?: string | null
          created_at?: string
          created_by_membership_id?: string
          id?: string
          notes?: string
          organization_id?: string
          route_id?: string | null
          scheduled_for?: string | null
          status?: string
          status_version?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_visits_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_visits_confirmed_by_membership_id_fkey"
            columns: ["confirmed_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_visits_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_visits_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "logistics_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      app_schema_migrations: {
        Row: {
          applied_at: string
          name: string
        }
        Insert: {
          applied_at?: string
          name: string
        }
        Update: {
          applied_at?: string
          name?: string
        }
        Relationships: []
      }
      business_tenants: {
        Row: {
          archived_at: string | null
          code: string
          created_at: string
          id: string
          matrix_organization_id: string | null
          max_agencies_per_captor: number
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          code: string
          created_at?: string
          id?: string
          matrix_organization_id?: string | null
          max_agencies_per_captor?: number
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          code?: string
          created_at?: string
          id?: string
          matrix_organization_id?: string | null
          max_agencies_per_captor?: number
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_tenants_matrix_organization_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_tenants_matrix_scope_fkey"
            columns: ["id", "matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      captor_supervisor_assignments: {
        Row: {
          assigned_by_membership_id: string | null
          captor_membership_id: string
          created_at: string
          ended_at: string | null
          id: string
          reason: string
          started_at: string
          supervisor_membership_id: string
          tenant_id: string
        }
        Insert: {
          assigned_by_membership_id?: string | null
          captor_membership_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          reason: string
          started_at?: string
          supervisor_membership_id: string
          tenant_id: string
        }
        Update: {
          assigned_by_membership_id?: string | null
          captor_membership_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          reason?: string
          started_at?: string
          supervisor_membership_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "captor_supervisor_assignments_tenant_id_assigned_by_member_fkey"
            columns: ["tenant_id", "assigned_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "captor_supervisor_assignments_tenant_id_captor_membership__fkey"
            columns: ["tenant_id", "captor_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "captor_supervisor_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captor_supervisor_assignments_tenant_id_supervisor_members_fkey"
            columns: ["tenant_id", "supervisor_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      commercial_entity_profiles: {
        Row: {
          address: Json
          can_modify_public_price: boolean
          contact: Json
          country_code: string
          created_at: string
          created_by_membership_id: string | null
          enabled_services: string[]
          entity_id: string
          entity_type: string
          id: string
          logistics_options: Json
          matrix_organization_id: string
          max_discount_bps: number
          operational_status: string
          tenant_id: string
          territory: string
          updated_at: string
          updated_by_membership_id: string | null
          visit_frequency: string
          warehouse_id: string | null
          zone: string
        }
        Insert: {
          address?: Json
          can_modify_public_price?: boolean
          contact?: Json
          country_code?: string
          created_at?: string
          created_by_membership_id?: string | null
          enabled_services?: string[]
          entity_id: string
          entity_type: string
          id?: string
          logistics_options?: Json
          matrix_organization_id: string
          max_discount_bps?: number
          operational_status?: string
          tenant_id: string
          territory?: string
          updated_at?: string
          updated_by_membership_id?: string | null
          visit_frequency?: string
          warehouse_id?: string | null
          zone?: string
        }
        Update: {
          address?: Json
          can_modify_public_price?: boolean
          contact?: Json
          country_code?: string
          created_at?: string
          created_by_membership_id?: string | null
          enabled_services?: string[]
          entity_id?: string
          entity_type?: string
          id?: string
          logistics_options?: Json
          matrix_organization_id?: string
          max_discount_bps?: number
          operational_status?: string
          tenant_id?: string
          territory?: string
          updated_at?: string
          updated_by_membership_id?: string | null
          visit_frequency?: string
          warehouse_id?: string | null
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_entity_profiles_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_entity_profiles_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_entity_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_entity_profiles_updated_by_membership_id_fkey"
            columns: ["updated_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_entity_profiles_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_invoice_counters: {
        Row: {
          last_number: number
          organization_id: string
        }
        Insert: {
          last_number?: number
          organization_id: string
        }
        Update: {
          last_number?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_invoice_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_pricing_overrides: {
        Row: {
          amount_cents: number
          audience: string
          calculation_rule: Json
          created_at: string
          created_by_membership_id: string
          currency: string
          destination_code: string
          entity_id: string | null
          id: string
          matrix_organization_id: string
          minimum_amount_cents: number | null
          price_kind: string
          product_code: string
          service_concept: string
          tenant_id: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          amount_cents: number
          audience: string
          calculation_rule?: Json
          created_at?: string
          created_by_membership_id: string
          currency?: string
          destination_code: string
          entity_id?: string | null
          id?: string
          matrix_organization_id: string
          minimum_amount_cents?: number | null
          price_kind: string
          product_code?: string
          service_concept: string
          tenant_id: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          amount_cents?: number
          audience?: string
          calculation_rule?: Json
          created_at?: string
          created_by_membership_id?: string
          currency?: string
          destination_code?: string
          entity_id?: string | null
          id?: string
          matrix_organization_id?: string
          minimum_amount_cents?: number | null
          price_kind?: string
          product_code?: string
          service_concept?: string
          tenant_id?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_pricing_overrides_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_pricing_overrides_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_pricing_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      country_commercial_service_settings: {
        Row: {
          amount_cents: number
          calculation_rule: Json
          created_at: string
          created_by_membership_id: string | null
          currency: string
          destination_code: string
          id: string
          is_active: boolean
          matrix_organization_id: string
          service_concept: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          calculation_rule?: Json
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          destination_code: string
          id?: string
          is_active?: boolean
          matrix_organization_id: string
          service_concept: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          calculation_rule?: Json
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          destination_code?: string
          id?: string
          is_active?: boolean
          matrix_organization_id?: string
          service_concept?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_commercial_service_settin_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "country_commercial_service_settings_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "country_commercial_service_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_credit_notes: {
        Row: {
          amount_cents: number
          created_at: string
          created_by_membership_id: string | null
          currency: string
          id: string
          invoice_id: string
          organization_id: string
          reason: string
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          id?: string
          invoice_id: string
          organization_id: string
          reason: string
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          id?: string
          invoice_id?: string
          organization_id?: string
          reason?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_credit_notes_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credit_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credit_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_invoice_lines: {
        Row: {
          amount_cents: number | null
          created_at: string
          currency: string
          description: string
          id: string
          invoice_id: string
          line_number: number
          organization_id: string
          quantity: number
          sale_line_id: string | null
          tenant_id: string
          unit_amount_cents: number
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          currency?: string
          description: string
          id?: string
          invoice_id: string
          line_number: number
          organization_id: string
          quantity: number
          sale_line_id?: string | null
          tenant_id: string
          unit_amount_cents: number
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          currency?: string
          description?: string
          id?: string
          invoice_id?: string
          line_number?: number
          organization_id?: string
          quantity?: number
          sale_line_id?: string | null
          tenant_id?: string
          unit_amount_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoice_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoice_lines_sale_line_id_fkey"
            columns: ["sale_line_id"]
            isOneToOne: false
            referencedRelation: "sale_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoice_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_invoices: {
        Row: {
          amount_cents: number
          created_at: string
          created_by_membership_id: string | null
          currency: string
          customer_id: string | null
          due_at: string | null
          id: string
          invoice_number: string
          issued_at: string
          lifecycle_status: string
          organization_id: string
          sale_id: string
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          customer_id?: string | null
          due_at?: string | null
          id?: string
          invoice_number: string
          issued_at?: string
          lifecycle_status?: string
          organization_id: string
          sale_id: string
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          customer_id?: string | null
          due_at?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string
          lifecycle_status?: string
          organization_id?: string
          sale_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_invoices_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payment_application_reversals: {
        Row: {
          application_id: string
          created_at: string
          created_by_membership_id: string | null
          id: string
          organization_id: string
          reason: string
          tenant_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by_membership_id?: string | null
          id?: string
          organization_id: string
          reason: string
          tenant_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by_membership_id?: string | null
          id?: string
          organization_id?: string
          reason?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payment_application_reve_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_application_reversals_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "customer_payment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_application_reversals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_application_reversals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payment_applications: {
        Row: {
          amount_cents: number
          applied_at: string
          applied_by_membership_id: string | null
          created_at: string
          id: string
          invoice_id: string
          organization_id: string
          payment_id: string
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          applied_at?: string
          applied_by_membership_id?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          organization_id: string
          payment_id: string
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          applied_at?: string
          applied_by_membership_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          organization_id?: string
          payment_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payment_applications_applied_by_membership_id_fkey"
            columns: ["applied_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_applications_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_applications_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_applications_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_applications_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "customer_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payment_reversals: {
        Row: {
          created_at: string
          created_by_membership_id: string | null
          id: string
          organization_id: string
          payment_id: string
          reason: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by_membership_id?: string | null
          id?: string
          organization_id: string
          payment_id: string
          reason: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by_membership_id?: string | null
          id?: string
          organization_id?: string
          payment_id?: string
          reason?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payment_reversals_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_reversals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_reversals_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "customer_payment_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_reversals_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "customer_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_reversals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payments: {
        Row: {
          amount_cents: number
          created_at: string
          created_by_membership_id: string | null
          currency: string
          customer_id: string | null
          id: string
          idempotency_key: string
          metadata: Json
          method: string
          organization_id: string
          received_at: string
          reference: string
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          customer_id?: string | null
          id?: string
          idempotency_key: string
          metadata?: Json
          method: string
          organization_id: string
          received_at?: string
          reference?: string
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by_membership_id?: string | null
          currency?: string
          customer_id?: string | null
          id?: string
          idempotency_key?: string
          metadata?: Json
          method?: string
          organization_id?: string
          received_at?: string
          reference?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_recipients: {
        Row: {
          address_reference: string
          address_verified: boolean
          card_style: string
          city: string
          country: string
          country_id: string | null
          created_at: string
          customer_id: string
          email: string
          emails: string[]
          exact_entrance_confirmed_at: string | null
          exact_entrance_confirmed_by: string | null
          exact_entrance_heading: number | null
          exact_entrance_lat: number | null
          exact_entrance_lng: number | null
          exact_entrance_note: string
          exact_entrance_pano_id: string | null
          exact_entrance_pitch: number | null
          first_name: string
          formatted_address: string | null
          geo_updated_at: string | null
          house_number: string
          id: string
          is_active: boolean
          last_name: string
          lat: number | null
          lng: number | null
          neighborhood: string
          organization_id: string
          phone: string
          place_id: string | null
          postal_code: string
          state: string
          street: string
          updated_at: string
        }
        Insert: {
          address_reference?: string
          address_verified?: boolean
          card_style?: string
          city?: string
          country: string
          country_id?: string | null
          created_at?: string
          customer_id: string
          email?: string
          emails?: string[]
          exact_entrance_confirmed_at?: string | null
          exact_entrance_confirmed_by?: string | null
          exact_entrance_heading?: number | null
          exact_entrance_lat?: number | null
          exact_entrance_lng?: number | null
          exact_entrance_note?: string
          exact_entrance_pano_id?: string | null
          exact_entrance_pitch?: number | null
          first_name: string
          formatted_address?: string | null
          geo_updated_at?: string | null
          house_number?: string
          id?: string
          is_active?: boolean
          last_name: string
          lat?: number | null
          lng?: number | null
          neighborhood?: string
          organization_id: string
          phone: string
          place_id?: string | null
          postal_code?: string
          state?: string
          street?: string
          updated_at?: string
        }
        Update: {
          address_reference?: string
          address_verified?: boolean
          card_style?: string
          city?: string
          country?: string
          country_id?: string | null
          created_at?: string
          customer_id?: string
          email?: string
          emails?: string[]
          exact_entrance_confirmed_at?: string | null
          exact_entrance_confirmed_by?: string | null
          exact_entrance_heading?: number | null
          exact_entrance_lat?: number | null
          exact_entrance_lng?: number | null
          exact_entrance_note?: string
          exact_entrance_pano_id?: string | null
          exact_entrance_pitch?: number | null
          first_name?: string
          formatted_address?: string | null
          geo_updated_at?: string | null
          house_number?: string
          id?: string
          is_active?: boolean
          last_name?: string
          lat?: number | null
          lng?: number | null
          neighborhood?: string
          organization_id?: string
          phone?: string
          place_id?: string | null
          postal_code?: string
          state?: string
          street?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_recipients_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "pricing_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_recipients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_recipients_exact_entrance_confirmed_by_fkey"
            columns: ["exact_entrance_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_recipients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_route_assignment_requests: {
        Row: {
          address_fingerprint: string | null
          box_count: number
          coverage_status: string
          created_at: string
          customer_id: string
          driver_id: string | null
          id: string
          organization_id: string
          postal_code: string | null
          requested_by: string | null
          review_note: string
          reviewed_at: string | null
          reviewed_by: string | null
          route_date: string
          route_definition_id: string | null
          route_id: string | null
          route_name: string
          route_schedule_id: string | null
          route_template_id: string | null
          route_weekday: number
          scheduled_at: string
          shipment_id: string
          status: string
          task_id: string
          updated_at: string
          zone_key: string
        }
        Insert: {
          address_fingerprint?: string | null
          box_count?: number
          coverage_status?: string
          created_at?: string
          customer_id: string
          driver_id?: string | null
          id?: string
          organization_id: string
          postal_code?: string | null
          requested_by?: string | null
          review_note?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          route_date: string
          route_definition_id?: string | null
          route_id?: string | null
          route_name?: string
          route_schedule_id?: string | null
          route_template_id?: string | null
          route_weekday: number
          scheduled_at: string
          shipment_id: string
          status?: string
          task_id: string
          updated_at?: string
          zone_key: string
        }
        Update: {
          address_fingerprint?: string | null
          box_count?: number
          coverage_status?: string
          created_at?: string
          customer_id?: string
          driver_id?: string | null
          id?: string
          organization_id?: string
          postal_code?: string | null
          requested_by?: string | null
          review_note?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          route_date?: string
          route_definition_id?: string | null
          route_id?: string | null
          route_name?: string
          route_schedule_id?: string | null
          route_template_id?: string | null
          route_weekday?: number
          scheduled_at?: string
          shipment_id?: string
          status?: string
          task_id?: string
          updated_at?: string
          zone_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_route_assignment_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_route_assignment_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_route_assignment_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_route_assignment_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_route_assignment_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_route_assignment_requests_route_definition_id_fkey"
            columns: ["route_definition_id"]
            isOneToOne: false
            referencedRelation: "logistics_route_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_route_assignment_requests_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "logistics_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_route_assignment_requests_route_schedule_id_fkey"
            columns: ["route_schedule_id"]
            isOneToOne: false
            referencedRelation: "logistics_route_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_route_assignment_requests_route_template_id_fkey"
            columns: ["route_template_id"]
            isOneToOne: false
            referencedRelation: "logistics_route_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_route_assignment_requests_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_route_assignment_requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "shipment_logistics_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_route_verifications: {
        Row: {
          created_at: string
          customer_id: string
          end_reason: string
          ended_at: string | null
          id: string
          organization_id: string
          route_template_id: string
          started_at: string
          verified_at: string
          verified_by: string | null
          zone_key: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          end_reason?: string
          ended_at?: string | null
          id?: string
          organization_id: string
          route_template_id: string
          started_at?: string
          verified_at?: string
          verified_by?: string | null
          zone_key: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          end_reason?: string
          ended_at?: string | null
          id?: string
          organization_id?: string
          route_template_id?: string
          started_at?: string
          verified_at?: string
          verified_by?: string | null
          zone_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_route_verifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_route_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_route_verifications_route_template_id_fkey"
            columns: ["route_template_id"]
            isOneToOne: false
            referencedRelation: "logistics_route_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_route_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_reference: string
          address_verified: boolean
          card_style: string
          city: string
          country: string
          created_at: string
          email: string
          emails: string[]
          exact_entrance_confirmed_at: string | null
          exact_entrance_confirmed_by: string | null
          exact_entrance_heading: number | null
          exact_entrance_lat: number | null
          exact_entrance_lng: number | null
          exact_entrance_note: string
          exact_entrance_pano_id: string | null
          exact_entrance_pitch: number | null
          first_name: string
          formatted_address: string | null
          geo_updated_at: string | null
          house_number: string
          id: string
          is_active: boolean
          last_name: string
          lat: number | null
          lng: number | null
          neighborhood: string
          organization_id: string
          phones: string[]
          place_id: string | null
          postal_code: string
          referred_by_customer_id: string | null
          state: string
          street: string
          updated_at: string
        }
        Insert: {
          address_reference?: string
          address_verified?: boolean
          card_style?: string
          city?: string
          country?: string
          created_at?: string
          email?: string
          emails?: string[]
          exact_entrance_confirmed_at?: string | null
          exact_entrance_confirmed_by?: string | null
          exact_entrance_heading?: number | null
          exact_entrance_lat?: number | null
          exact_entrance_lng?: number | null
          exact_entrance_note?: string
          exact_entrance_pano_id?: string | null
          exact_entrance_pitch?: number | null
          first_name: string
          formatted_address?: string | null
          geo_updated_at?: string | null
          house_number?: string
          id?: string
          is_active?: boolean
          last_name: string
          lat?: number | null
          lng?: number | null
          neighborhood?: string
          organization_id: string
          phones?: string[]
          place_id?: string | null
          postal_code?: string
          referred_by_customer_id?: string | null
          state?: string
          street?: string
          updated_at?: string
        }
        Update: {
          address_reference?: string
          address_verified?: boolean
          card_style?: string
          city?: string
          country?: string
          created_at?: string
          email?: string
          emails?: string[]
          exact_entrance_confirmed_at?: string | null
          exact_entrance_confirmed_by?: string | null
          exact_entrance_heading?: number | null
          exact_entrance_lat?: number | null
          exact_entrance_lng?: number | null
          exact_entrance_note?: string
          exact_entrance_pano_id?: string | null
          exact_entrance_pitch?: number | null
          first_name?: string
          formatted_address?: string | null
          geo_updated_at?: string | null
          house_number?: string
          id?: string
          is_active?: boolean
          last_name?: string
          lat?: number | null
          lng?: number | null
          neighborhood?: string
          organization_id?: string
          phones?: string[]
          place_id?: string | null
          postal_code?: string
          referred_by_customer_id?: string | null
          state?: string
          street?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_exact_entrance_confirmed_by_fkey"
            columns: ["exact_entrance_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_referred_by_customer_id_fkey"
            columns: ["referred_by_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_partner_ledger: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          kind: string
          note: string
          partner_id: string
          shipment_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          note?: string
          partner_id: string
          shipment_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          note?: string
          partner_id?: string
          shipment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_partner_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_partner_ledger_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "distribution_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_partner_ledger_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_partner_offers: {
        Row: {
          catalog_key: string
          country_name: string
          created_at: string
          id: string
          is_active: boolean
          partner_id: string
          product_name: string
          public_price: number | null
          updated_at: string
          wholesale_price: number
        }
        Insert: {
          catalog_key: string
          country_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          partner_id: string
          product_name: string
          public_price?: number | null
          updated_at?: string
          wholesale_price: number
        }
        Update: {
          catalog_key?: string
          country_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          partner_id?: string
          product_name?: string
          public_price?: number | null
          updated_at?: string
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "distribution_partner_offers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "distribution_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_partner_owner_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          owner_id: string | null
          partner_id: string
          previous_owner_id: string | null
          reason: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          owner_id?: string | null
          partner_id: string
          previous_owner_id?: string | null
          reason?: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          owner_id?: string | null
          partner_id?: string
          previous_owner_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_partner_owner_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_partner_owner_history_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_partner_owner_history_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "distribution_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_partner_owner_history_previous_owner_id_fkey"
            columns: ["previous_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_partners: {
        Row: {
          acquisition_owner_id: string | null
          created_at: string
          credit_limit: number
          distributor_organization_id: string
          id: string
          is_active: boolean
          parent_organization_id: string
        }
        Insert: {
          acquisition_owner_id?: string | null
          created_at?: string
          credit_limit: number
          distributor_organization_id: string
          id?: string
          is_active?: boolean
          parent_organization_id: string
        }
        Update: {
          acquisition_owner_id?: string | null
          created_at?: string
          credit_limit?: number
          distributor_organization_id?: string
          id?: string
          is_active?: boolean
          parent_organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_partners_acquisition_owner_id_fkey"
            columns: ["acquisition_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_partners_distributor_organization_id_fkey"
            columns: ["distributor_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_partners_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_country_boxes: {
        Row: {
          country_id: string
          distributor_id: string
          id: string
          organization_id: string
          price: string
          size: string
        }
        Insert: {
          country_id: string
          distributor_id: string
          id?: string
          organization_id: string
          price?: string
          size: string
        }
        Update: {
          country_id?: string
          distributor_id?: string
          id?: string
          organization_id?: string
          price?: string
          size?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributor_country_boxes_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "pricing_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributor_country_boxes_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributor_country_boxes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      distributors: {
        Row: {
          contact: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          phone: string
        }
        Insert: {
          contact?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          phone?: string
        }
        Update: {
          contact?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_cash_custody_events: {
        Row: {
          amount_cents: number
          beneficiary_organization_id: string
          collected_at: string
          created_at: string
          currency: string
          driver_membership_id: string
          evidence: Json
          id: string
          idempotency_key: string
          matrix_organization_id: string
          source_id: string
          source_type: string
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          beneficiary_organization_id: string
          collected_at: string
          created_at?: string
          currency?: string
          driver_membership_id: string
          evidence?: Json
          id?: string
          idempotency_key: string
          matrix_organization_id: string
          source_id: string
          source_type: string
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          beneficiary_organization_id?: string
          collected_at?: string
          created_at?: string
          currency?: string
          driver_membership_id?: string
          evidence?: Json
          id?: string
          idempotency_key?: string
          matrix_organization_id?: string
          source_id?: string
          source_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_cash_custody_events_beneficiary_organization_id_fkey"
            columns: ["beneficiary_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_cash_custody_events_driver_membership_id_fkey"
            columns: ["driver_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_cash_custody_events_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_cash_custody_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_settlement_lines: {
        Row: {
          amount_cents: number
          created_at: string
          custody_event_id: string
          id: string
          settlement_id: string
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          custody_event_id: string
          id?: string
          settlement_id: string
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          custody_event_id?: string
          id?: string
          settlement_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_settlement_lines_custody_event_id_fkey"
            columns: ["custody_event_id"]
            isOneToOne: false
            referencedRelation: "driver_cash_custody_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_settlement_lines_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "driver_settlement_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_settlement_lines_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "driver_settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_settlement_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_settlement_reversals: {
        Row: {
          created_at: string
          id: string
          idempotency_key: string
          matrix_organization_id: string
          reason: string
          reversed_by_membership_id: string
          settlement_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idempotency_key: string
          matrix_organization_id: string
          reason: string
          reversed_by_membership_id: string
          settlement_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idempotency_key?: string
          matrix_organization_id?: string
          reason?: string
          reversed_by_membership_id?: string
          settlement_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_settlement_reversals_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_settlement_reversals_reversed_by_membership_id_fkey"
            columns: ["reversed_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_settlement_reversals_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: true
            referencedRelation: "driver_settlement_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_settlement_reversals_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: true
            referencedRelation: "driver_settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_settlement_reversals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_settlements: {
        Row: {
          counted_cents: number
          created_at: string
          currency: string
          difference_cents: number | null
          driver_membership_id: string
          evidence: Json
          expected_cents: number
          id: string
          idempotency_key: string
          matrix_organization_id: string
          reason: string
          reconciled_at: string
          reconciled_by_membership_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          counted_cents: number
          created_at?: string
          currency?: string
          difference_cents?: number | null
          driver_membership_id: string
          evidence?: Json
          expected_cents: number
          id?: string
          idempotency_key: string
          matrix_organization_id: string
          reason?: string
          reconciled_at?: string
          reconciled_by_membership_id: string
          status: string
          tenant_id: string
        }
        Update: {
          counted_cents?: number
          created_at?: string
          currency?: string
          difference_cents?: number | null
          driver_membership_id?: string
          evidence?: Json
          expected_cents?: number
          id?: string
          idempotency_key?: string
          matrix_organization_id?: string
          reason?: string
          reconciled_at?: string
          reconciled_by_membership_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_settlements_driver_membership_id_fkey"
            columns: ["driver_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_settlements_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_settlements_reconciled_by_membership_id_fkey"
            columns: ["reconciled_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_settlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_hold_events: {
        Row: {
          actor_membership_id: string | null
          created_at: string
          evidence: Json
          hold_id: string
          id: string
          reason: string
          status: string
          tenant_id: string
        }
        Insert: {
          actor_membership_id?: string | null
          created_at?: string
          evidence?: Json
          hold_id: string
          id?: string
          reason?: string
          status: string
          tenant_id: string
        }
        Update: {
          actor_membership_id?: string | null
          created_at?: string
          evidence?: Json
          hold_id?: string
          id?: string
          reason?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_hold_events_actor_membership_id_fkey"
            columns: ["actor_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_hold_events_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "current_financial_holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_hold_events_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "financial_holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_hold_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_hold_policies: {
        Row: {
          manual_release_requires_second_approval: boolean
          tenant_id: string
          updated_at: string
          updated_by_membership_id: string | null
        }
        Insert: {
          manual_release_requires_second_approval?: boolean
          tenant_id: string
          updated_at?: string
          updated_by_membership_id?: string | null
        }
        Update: {
          manual_release_requires_second_approval?: boolean
          tenant_id?: string
          updated_at?: string
          updated_by_membership_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_hold_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_hold_policies_updated_by_membership_id_fkey"
            columns: ["updated_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_hold_release_approvals: {
        Row: {
          approved_by_membership_id: string
          created_at: string
          id: string
          request_id: string
          tenant_id: string
        }
        Insert: {
          approved_by_membership_id: string
          created_at?: string
          id?: string
          request_id: string
          tenant_id: string
        }
        Update: {
          approved_by_membership_id?: string
          created_at?: string
          id?: string
          request_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_hold_release_approvals_approved_by_membership_id_fkey"
            columns: ["approved_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_hold_release_approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "financial_hold_release_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_hold_release_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_hold_release_requests: {
        Row: {
          created_at: string
          evidence: Json
          hold_id: string
          id: string
          idempotency_key: string
          reason: string
          requested_by_membership_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          evidence: Json
          hold_id: string
          id?: string
          idempotency_key: string
          reason: string
          requested_by_membership_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          evidence?: Json
          hold_id?: string
          id?: string
          idempotency_key?: string
          reason?: string
          requested_by_membership_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_hold_release_requests_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "current_financial_holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_hold_release_requests_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "financial_holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_hold_release_requests_requested_by_membership_id_fkey"
            columns: ["requested_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_hold_release_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_holds: {
        Row: {
          agency_charge_id: string
          agency_organization_id: string
          created_at: string
          id: string
          matrix_organization_id: string
          package_id: string | null
          sale_id: string | null
          shipment_id: string | null
          tenant_id: string
        }
        Insert: {
          agency_charge_id: string
          agency_organization_id: string
          created_at?: string
          id?: string
          matrix_organization_id: string
          package_id?: string | null
          sale_id?: string | null
          shipment_id?: string | null
          tenant_id: string
        }
        Update: {
          agency_charge_id?: string
          agency_organization_id?: string
          created_at?: string
          id?: string
          matrix_organization_id?: string
          package_id?: string | null
          sale_id?: string | null
          shipment_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_holds_agency_charge_id_fkey"
            columns: ["agency_charge_id"]
            isOneToOne: true
            referencedRelation: "agency_charge_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_holds_agency_charge_id_fkey"
            columns: ["agency_charge_id"]
            isOneToOne: true
            referencedRelation: "agency_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_holds_agency_organization_id_fkey"
            columns: ["agency_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_holds_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_holds_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "shipment_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_holds_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_holds_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_holds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          matrix_organization_id: string
          name: string
          normal_balance: string
          tenant_id: string
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          matrix_organization_id: string
          name: string
          normal_balance: string
          tenant_id: string
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          matrix_organization_id?: string
          name?: string
          normal_balance?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gl_accounts_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_operations: {
        Row: {
          actor_membership_id: string | null
          completed_at: string | null
          created_at: string
          error_code: string | null
          id: string
          idempotency_key: string
          operation_type: string
          request_hash: string | null
          result: Json | null
          status: string
          tenant_id: string
        }
        Insert: {
          actor_membership_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          id?: string
          idempotency_key: string
          operation_type: string
          request_hash?: string | null
          result?: Json | null
          status?: string
          tenant_id: string
        }
        Update: {
          actor_membership_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          id?: string
          idempotency_key?: string
          operation_type?: string
          request_hash?: string | null
          result?: Json | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_operations_actor_membership_id_fkey"
            columns: ["actor_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idempotency_operations_tenant_actor_membership_fkey"
            columns: ["tenant_id", "actor_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "idempotency_operations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      immutable_audit_events: {
        Row: {
          action: string
          actor_membership_id: string | null
          actor_user_id: string | null
          after_state: Json | null
          before_state: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          idempotency_key: string | null
          metadata: Json
          occurred_at: string
          organization_id: string | null
          reason: string
          request_id: string | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_membership_id?: string | null
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          occurred_at?: string
          organization_id?: string | null
          reason?: string
          request_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_membership_id?: string | null
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          occurred_at?: string
          organization_id?: string | null
          reason?: string
          request_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "immutable_audit_events_actor_membership_id_fkey"
            columns: ["actor_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immutable_audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immutable_audit_events_tenant_actor_membership_fkey"
            columns: ["tenant_id", "actor_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "immutable_audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immutable_audit_events_tenant_organization_fkey"
            columns: ["tenant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      internal_rate_lines: {
        Row: {
          amount_cents: number
          concept: string
          created_at: string
          currency: string
          destination_code: string
          id: string
          product_code: string
          rate_version_id: string
          snapshot: Json
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          concept: string
          created_at?: string
          currency?: string
          destination_code: string
          id?: string
          product_code: string
          rate_version_id: string
          snapshot?: Json
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          concept?: string
          created_at?: string
          currency?: string
          destination_code?: string
          id?: string
          product_code?: string
          rate_version_id?: string
          snapshot?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_rate_lines_rate_version_id_fkey"
            columns: ["rate_version_id"]
            isOneToOne: false
            referencedRelation: "internal_rate_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_rate_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_rate_versions: {
        Row: {
          agency_organization_id: string | null
          created_at: string
          created_by_membership_id: string | null
          id: string
          matrix_organization_id: string
          name: string
          status: string
          tenant_id: string
          valid_from: string
          valid_until: string | null
          version: number
        }
        Insert: {
          agency_organization_id?: string | null
          created_at?: string
          created_by_membership_id?: string | null
          id?: string
          matrix_organization_id: string
          name: string
          status?: string
          tenant_id: string
          valid_from: string
          valid_until?: string | null
          version: number
        }
        Update: {
          agency_organization_id?: string | null
          created_at?: string
          created_by_membership_id?: string | null
          id?: string
          matrix_organization_id?: string
          name?: string
          status?: string
          tenant_id?: string
          valid_from?: string
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "internal_rate_versions_agency_organization_id_fkey"
            columns: ["agency_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_rate_versions_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_rate_versions_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_rate_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignee_id: string
          closed_at: string | null
          closed_by: string | null
          expected_return_at: string | null
          id: string
          item_id: string
          item_name: string
          note: string
          organization_id: string
          outcome: string | null
          purpose: string
          qty_assigned: number
          qty_consumed: number
          qty_damaged: number
          qty_lost: number
          qty_returned: number
          status: string
          warehouse_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignee_id: string
          closed_at?: string | null
          closed_by?: string | null
          expected_return_at?: string | null
          id?: string
          item_id: string
          item_name: string
          note?: string
          organization_id: string
          outcome?: string | null
          purpose?: string
          qty_assigned: number
          qty_consumed?: number
          qty_damaged?: number
          qty_lost?: number
          qty_returned?: number
          status?: string
          warehouse_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignee_id?: string
          closed_at?: string | null
          closed_by?: string | null
          expected_return_at?: string | null
          id?: string
          item_id?: string
          item_name?: string
          note?: string
          organization_id?: string
          outcome?: string | null
          purpose?: string
          qty_assigned?: number
          qty_consumed?: number
          qty_damaged?: number
          qty_lost?: number
          qty_returned?: number
          status?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_assignments_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_assignments_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_assignments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_assignments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_bin_stock: {
        Row: {
          bin_id: string
          id: string
          item_id: string
          organization_id: string
          quantity: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          bin_id: string
          id?: string
          item_id: string
          organization_id: string
          quantity?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          bin_id?: string
          id?: string
          item_id?: string
          organization_id?: string
          quantity?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_bin_stock_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "warehouse_bins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_bin_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_bin_stock_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_bin_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          tree_data: Json
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          tree_data?: Json
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          tree_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          archived_at: string | null
          barcode: string | null
          category_id: string
          created_at: string
          description: string
          id: string
          inventory_class: string
          is_active: boolean
          is_commercial: boolean
          kind: string
          location: string | null
          name: string
          organization_id: string
          photo_url: string
          preferred_supplier: string
          requires_expiry_tracking: boolean
          requires_lot_tracking: boolean
          requires_serial_tracking: boolean
          size: string | null
          sku: string | null
          subcategory: string | null
          unit: string | null
        }
        Insert: {
          archived_at?: string | null
          barcode?: string | null
          category_id: string
          created_at?: string
          description?: string
          id?: string
          inventory_class?: string
          is_active?: boolean
          is_commercial?: boolean
          kind: string
          location?: string | null
          name: string
          organization_id: string
          photo_url?: string
          preferred_supplier?: string
          requires_expiry_tracking?: boolean
          requires_lot_tracking?: boolean
          requires_serial_tracking?: boolean
          size?: string | null
          sku?: string | null
          subcategory?: string | null
          unit?: string | null
        }
        Update: {
          archived_at?: string | null
          barcode?: string | null
          category_id?: string
          created_at?: string
          description?: string
          id?: string
          inventory_class?: string
          is_active?: boolean
          is_commercial?: boolean
          kind?: string
          location?: string | null
          name?: string
          organization_id?: string
          photo_url?: string
          preferred_supplier?: string
          requires_expiry_tracking?: boolean
          requires_lot_tracking?: boolean
          requires_serial_tracking?: boolean
          size?: string | null
          sku?: string | null
          subcategory?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          assignee_id: string | null
          assignment_id: string | null
          created_at: string
          created_by: string | null
          evidence: Json
          from_location_id: string | null
          from_location_label: string
          from_location_type: string | null
          id: string
          item_id: string
          item_name: string
          movement_key: string | null
          note: string
          organization_id: string
          qty: number
          reason_code: string
          reference_id: string | null
          reference_type: string | null
          reversal_of_movement_id: string | null
          to_location_id: string | null
          to_location_label: string
          to_location_type: string | null
          total_cost: number | null
          type: string
          unit_cost: number | null
          warehouse_id: string
          warehouse_transfer_id: string | null
        }
        Insert: {
          assignee_id?: string | null
          assignment_id?: string | null
          created_at?: string
          created_by?: string | null
          evidence?: Json
          from_location_id?: string | null
          from_location_label?: string
          from_location_type?: string | null
          id?: string
          item_id: string
          item_name: string
          movement_key?: string | null
          note?: string
          organization_id: string
          qty: number
          reason_code?: string
          reference_id?: string | null
          reference_type?: string | null
          reversal_of_movement_id?: string | null
          to_location_id?: string | null
          to_location_label?: string
          to_location_type?: string | null
          total_cost?: number | null
          type: string
          unit_cost?: number | null
          warehouse_id: string
          warehouse_transfer_id?: string | null
        }
        Update: {
          assignee_id?: string | null
          assignment_id?: string | null
          created_at?: string
          created_by?: string | null
          evidence?: Json
          from_location_id?: string | null
          from_location_label?: string
          from_location_type?: string | null
          id?: string
          item_id?: string
          item_name?: string
          movement_key?: string | null
          note?: string
          organization_id?: string
          qty?: number
          reason_code?: string
          reference_id?: string | null
          reference_type?: string | null
          reversal_of_movement_id?: string | null
          to_location_id?: string | null
          to_location_label?: string
          to_location_type?: string | null
          total_cost?: number | null
          type?: string
          unit_cost?: number | null
          warehouse_id?: string
          warehouse_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "inventory_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_reversal_of_movement_id_fkey"
            columns: ["reversal_of_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_transfer_id_fkey"
            columns: ["warehouse_transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouse_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_sale_reservations: {
        Row: {
          created_at: string
          created_by: string | null
          fulfilled_at: string | null
          id: string
          item_id: string
          item_name: string
          organization_id: string
          qty: number
          released_at: string | null
          shipment_id: string
          status: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fulfilled_at?: string | null
          id?: string
          item_id: string
          item_name: string
          organization_id: string
          qty: number
          released_at?: string | null
          shipment_id: string
          status?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fulfilled_at?: string | null
          id?: string
          item_id?: string
          item_name?: string
          organization_id?: string
          qty?: number
          released_at?: string | null
          shipment_id?: string
          status?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_sale_reservations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_sale_reservations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_sale_reservations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_sale_reservations_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_sale_reservations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_shipment_ref_links: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          link_source: string
          match_detail: string
          movement_id: string
          organization_id: string
          shipment_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          link_source: string
          match_detail?: string
          movement_id: string
          organization_id: string
          shipment_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          link_source?: string
          match_detail?: string
          movement_id?: string
          organization_id?: string
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_shipment_ref_links_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_shipment_ref_links_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_shipment_ref_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_shipment_ref_links_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock: {
        Row: {
          assigned: number
          avg_cost: number
          id: string
          item_id: string
          max_stock: number | null
          min_stock: number
          organization_id: string
          reserved: number
          stock: number
          unavailable: number
          warehouse_id: string
        }
        Insert: {
          assigned?: number
          avg_cost?: number
          id?: string
          item_id: string
          max_stock?: number | null
          min_stock?: number
          organization_id: string
          reserved?: number
          stock?: number
          unavailable?: number
          warehouse_id: string
        }
        Update: {
          assigned?: number
          avg_cost?: number
          id?: string
          item_id?: string
          max_stock?: number | null
          min_stock?: number
          organization_id?: string
          reserved?: number
          stock?: number
          unavailable?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_warehouse_transfers: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          from_warehouse_id: string
          id: string
          inbound_movement_id: string | null
          item_id: string
          item_name: string
          note: string
          organization_id: string
          outbound_movement_id: string | null
          qty: number
          received_at: string | null
          received_by: string | null
          status: string
          to_warehouse_id: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          from_warehouse_id: string
          id?: string
          inbound_movement_id?: string | null
          item_id: string
          item_name: string
          note?: string
          organization_id: string
          outbound_movement_id?: string | null
          qty: number
          received_at?: string | null
          received_by?: string | null
          status?: string
          to_warehouse_id: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string
          id?: string
          inbound_movement_id?: string | null
          item_id?: string
          item_name?: string
          note?: string
          organization_id?: string
          outbound_movement_id?: string | null
          qty?: number
          received_at?: string | null
          received_by?: string | null
          status?: string
          to_warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_warehouse_transfers_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_inbound_movement_id_fkey"
            columns: ["inbound_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_outbound_movement_id_fkey"
            columns: ["outbound_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by_membership_id: string | null
          description: string
          entry_number: number
          id: string
          matrix_organization_id: string
          occurred_at: string
          period_id: string | null
          reversal_of_entry_id: string | null
          source_id: string
          source_type: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by_membership_id?: string | null
          description: string
          entry_number: number
          id?: string
          matrix_organization_id: string
          occurred_at?: string
          period_id?: string | null
          reversal_of_entry_id?: string | null
          source_id: string
          source_type: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by_membership_id?: string | null
          description?: string
          entry_number?: number
          id?: string
          matrix_organization_id?: string
          occurred_at?: string
          period_id?: string | null
          reversal_of_entry_id?: string | null
          source_id?: string
          source_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversal_of_entry_id_fkey"
            columns: ["reversal_of_entry_id"]
            isOneToOne: true
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_counters: {
        Row: {
          last_number: number
          matrix_organization_id: string
        }
        Insert: {
          last_number?: number
          matrix_organization_id: string
        }
        Update: {
          last_number?: number
          matrix_organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_counters_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          agency_organization_id: string | null
          created_at: string
          credit_cents: number
          currency: string
          debit_cents: number
          description: string
          id: string
          journal_entry_id: string
          line_number: number
          matrix_organization_id: string
          tenant_id: string
        }
        Insert: {
          account_id: string
          agency_organization_id?: string | null
          created_at?: string
          credit_cents?: number
          currency?: string
          debit_cents?: number
          description?: string
          id?: string
          journal_entry_id: string
          line_number: number
          matrix_organization_id: string
          tenant_id: string
        }
        Update: {
          account_id?: string
          agency_organization_id?: string | null
          created_at?: string
          credit_cents?: number
          currency?: string
          debit_cents?: number
          description?: string
          id?: string
          journal_entry_id?: string
          line_number?: number
          matrix_organization_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_agency_organization_id_fkey"
            columns: ["agency_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_census_place_geometry_cache: {
        Row: {
          bounds: Json
          census_geoid: string | null
          census_layer: string | null
          census_name: string | null
          census_vintage: string
          fetched_at: string
          found: boolean
          geojson: Json
          place_id: string
          updated_at: string
        }
        Insert: {
          bounds?: Json
          census_geoid?: string | null
          census_layer?: string | null
          census_name?: string | null
          census_vintage?: string
          fetched_at?: string
          found?: boolean
          geojson: Json
          place_id: string
          updated_at?: string
        }
        Update: {
          bounds?: Json
          census_geoid?: string | null
          census_layer?: string | null
          census_name?: string | null
          census_vintage?: string
          fetched_at?: string
          found?: boolean
          geojson?: Json
          place_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      logistics_place_children_cache: {
        Row: {
          children: Json
          fetched_at: string
          parent_display_name: string
          parent_place_id: string
          updated_at: string
        }
        Insert: {
          children?: Json
          fetched_at?: string
          parent_display_name?: string
          parent_place_id: string
          updated_at?: string
        }
        Update: {
          children?: Json
          fetched_at?: string
          parent_display_name?: string
          parent_place_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      logistics_route_address_approvals: {
        Row: {
          address_fingerprint: string
          approved_at: string
          approved_by: string | null
          created_at: string
          customer_id: string
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          place_id: string
          postal_code: string | null
          revocation_reason: string
          revoked_at: string | null
          revoked_by: string | null
          route_definition_id: string
          valid_from: string
        }
        Insert: {
          address_fingerprint: string
          approved_at?: string
          approved_by?: string | null
          created_at?: string
          customer_id: string
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          place_id?: string
          postal_code?: string | null
          revocation_reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          route_definition_id: string
          valid_from?: string
        }
        Update: {
          address_fingerprint?: string
          approved_at?: string
          approved_by?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          place_id?: string
          postal_code?: string | null
          revocation_reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          route_definition_id?: string
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_route_address_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_address_approvals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_address_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_address_approvals_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_address_approvals_route_definition_id_fkey"
            columns: ["route_definition_id"]
            isOneToOne: false
            referencedRelation: "logistics_route_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_route_change_audit: {
        Row: {
          actor_id: string | null
          actor_name: string
          after_value: Json
          before_value: Json
          change_type: string
          created_at: string
          id: string
          organization_id: string
          reason: string
          route_id: string
          stop_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string
          after_value?: Json
          before_value?: Json
          change_type: string
          created_at?: string
          id?: string
          organization_id: string
          reason: string
          route_id: string
          stop_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_name?: string
          after_value?: Json
          before_value?: Json
          change_type?: string
          created_at?: string
          id?: string
          organization_id?: string
          reason?: string
          route_id?: string
          stop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistics_route_change_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_change_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_change_audit_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "logistics_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_change_audit_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "logistics_route_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_route_coverage_places: {
        Row: {
          bounds: Json
          color: string
          created_at: string
          created_by: string | null
          display_name: string
          id: string
          kind: string
          lat: number | null
          lng: number | null
          organization_id: string
          parent_place_id: string | null
          place_id: string
          route_definition_id: string
          selection_role: string
        }
        Insert: {
          bounds?: Json
          color?: string
          created_at?: string
          created_by?: string | null
          display_name: string
          id?: string
          kind: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          parent_place_id?: string | null
          place_id: string
          route_definition_id: string
          selection_role: string
        }
        Update: {
          bounds?: Json
          color?: string
          created_at?: string
          created_by?: string | null
          display_name?: string
          id?: string
          kind?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          parent_place_id?: string | null
          place_id?: string
          route_definition_id?: string
          selection_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_route_coverage_places_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_coverage_places_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_coverage_places_route_definition_id_fkey"
            columns: ["route_definition_id"]
            isOneToOne: false
            referencedRelation: "logistics_route_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_route_definitions: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          color: string
          coverage_mode: string
          created_at: string
          created_by: string | null
          id: string
          is_system_general: boolean
          name: string
          organization_id: string
          status: string
          system_weekday: number | null
          updated_at: string
          zone_name: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          color?: string
          coverage_mode?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_system_general?: boolean
          name: string
          organization_id: string
          status?: string
          system_weekday?: number | null
          updated_at?: string
          zone_name?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          color?: string
          coverage_mode?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_system_general?: boolean
          name?: string
          organization_id?: string
          status?: string
          system_weekday?: number | null
          updated_at?: string
          zone_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_route_definitions_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_definitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_route_notifications: {
        Row: {
          actor_id: string | null
          actor_name: string
          change_type: string
          created_at: string
          id: string
          idempotency_key: string
          organization_id: string
          read_at: string | null
          recipient_id: string
          route_id: string
          stop_id: string | null
          summary: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string
          change_type: string
          created_at?: string
          id?: string
          idempotency_key: string
          organization_id: string
          read_at?: string | null
          recipient_id: string
          route_id: string
          stop_id?: string | null
          summary?: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string
          change_type?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          organization_id?: string
          read_at?: string | null
          recipient_id?: string
          route_id?: string
          stop_id?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_route_notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_notifications_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "logistics_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_notifications_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "logistics_route_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_route_postal_codes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          postal_code: string
          route_definition_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          postal_code: string
          route_definition_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          postal_code?: string
          route_definition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_route_postal_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_postal_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_postal_codes_route_definition_id_fkey"
            columns: ["route_definition_id"]
            isOneToOne: false
            referencedRelation: "logistics_route_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_route_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          default_driver_id: string | null
          estimated_end_time: string | null
          id: string
          is_active: boolean
          max_boxes: number | null
          max_stops: number | null
          organization_id: string
          route_definition_id: string
          start_time: string
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_driver_id?: string | null
          estimated_end_time?: string | null
          id?: string
          is_active?: boolean
          max_boxes?: number | null
          max_stops?: number | null
          organization_id: string
          route_definition_id: string
          start_time: string
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_driver_id?: string | null
          estimated_end_time?: string | null
          id?: string
          is_active?: boolean
          max_boxes?: number | null
          max_stops?: number | null
          organization_id?: string
          route_definition_id?: string
          start_time?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "logistics_route_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_schedules_default_driver_id_fkey"
            columns: ["default_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_schedules_route_definition_id_fkey"
            columns: ["route_definition_id"]
            isOneToOne: false
            referencedRelation: "logistics_route_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_route_stops: {
        Row: {
          address_snapshot: Json
          agency_visit_id: string | null
          city: string
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          outcome: string | null
          outcome_at: string | null
          postal_code: string
          release_reason: string
          released_at: string | null
          route_id: string
          stop_order: number
          task_id: string | null
          updated_at: string
        }
        Insert: {
          address_snapshot?: Json
          agency_visit_id?: string | null
          city?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          outcome?: string | null
          outcome_at?: string | null
          postal_code?: string
          release_reason?: string
          released_at?: string | null
          route_id: string
          stop_order?: number
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          address_snapshot?: Json
          agency_visit_id?: string | null
          city?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          outcome?: string | null
          outcome_at?: string | null
          postal_code?: string
          release_reason?: string
          released_at?: string | null
          route_id?: string
          stop_order?: number
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_route_stops_agency_visit_id_fkey"
            columns: ["agency_visit_id"]
            isOneToOne: false
            referencedRelation: "agency_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_stops_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "logistics_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_stops_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "shipment_logistics_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_route_templates: {
        Row: {
          covered_postal_codes: string[]
          created_at: string
          created_by: string | null
          default_driver_id: string | null
          estimated_end_time: string | null
          id: string
          max_boxes: number | null
          max_stops: number | null
          name: string
          organization_id: string
          start_time: string | null
          updated_at: string
          weekday: number
          zone_key: string
        }
        Insert: {
          covered_postal_codes?: string[]
          created_at?: string
          created_by?: string | null
          default_driver_id?: string | null
          estimated_end_time?: string | null
          id?: string
          max_boxes?: number | null
          max_stops?: number | null
          name: string
          organization_id: string
          start_time?: string | null
          updated_at?: string
          weekday: number
          zone_key?: string
        }
        Update: {
          covered_postal_codes?: string[]
          created_at?: string
          created_by?: string | null
          default_driver_id?: string | null
          estimated_end_time?: string | null
          id?: string
          max_boxes?: number | null
          max_stops?: number | null
          name?: string
          organization_id?: string
          start_time?: string | null
          updated_at?: string
          weekday?: number
          zone_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_route_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_templates_default_driver_id_fkey"
            columns: ["default_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_route_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_routes: {
        Row: {
          arrival_confirmed_at: string | null
          arrival_confirmed_by: string | null
          arrival_note: string
          arrival_operation_key: string | null
          arrival_reason_code: string | null
          arrival_reported_at: string | null
          arrival_warehouse_id: string | null
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string
          organization_id: string
          published_at: string | null
          published_by: string | null
          route_date: string
          route_definition_id: string | null
          route_schedule_id: string | null
          route_template_id: string | null
          started_at: string | null
          started_by: string | null
          started_lat: number | null
          started_lng: number | null
          status: string
          updated_at: string
          vehicle_id: string | null
          warehouse_id: string | null
          zone_key: string
        }
        Insert: {
          arrival_confirmed_at?: string | null
          arrival_confirmed_by?: string | null
          arrival_note?: string
          arrival_operation_key?: string | null
          arrival_reason_code?: string | null
          arrival_reported_at?: string | null
          arrival_warehouse_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string
          organization_id: string
          published_at?: string | null
          published_by?: string | null
          route_date: string
          route_definition_id?: string | null
          route_schedule_id?: string | null
          route_template_id?: string | null
          started_at?: string | null
          started_by?: string | null
          started_lat?: number | null
          started_lng?: number | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          warehouse_id?: string | null
          zone_key?: string
        }
        Update: {
          arrival_confirmed_at?: string | null
          arrival_confirmed_by?: string | null
          arrival_note?: string
          arrival_operation_key?: string | null
          arrival_reason_code?: string | null
          arrival_reported_at?: string | null
          arrival_warehouse_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string
          organization_id?: string
          published_at?: string | null
          published_by?: string | null
          route_date?: string
          route_definition_id?: string | null
          route_schedule_id?: string | null
          route_template_id?: string | null
          started_at?: string | null
          started_by?: string | null
          started_lat?: number | null
          started_lng?: number | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          warehouse_id?: string | null
          zone_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_routes_arrival_confirmed_by_fkey"
            columns: ["arrival_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_routes_arrival_warehouse_id_fkey"
            columns: ["arrival_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_routes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_routes_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_routes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_routes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_routes_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_routes_route_definition_id_fkey"
            columns: ["route_definition_id"]
            isOneToOne: false
            referencedRelation: "logistics_route_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_routes_route_schedule_id_fkey"
            columns: ["route_schedule_id"]
            isOneToOne: false
            referencedRelation: "logistics_route_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_routes_route_template_id_fkey"
            columns: ["route_template_id"]
            isOneToOne: false
            referencedRelation: "logistics_route_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_routes_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_routes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "logistics_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_routes_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_task_admin_exceptions: {
        Row: {
          actor_id: string | null
          actor_name: string
          created_at: string
          id: string
          new_status: string
          organization_id: string
          previous_status: string
          reason: string
          risk_summary: string
          route_id: string | null
          shipment_id: string | null
          skipped_transition: string
          task_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          id?: string
          new_status: string
          organization_id: string
          previous_status: string
          reason: string
          risk_summary?: string
          route_id?: string | null
          shipment_id?: string | null
          skipped_transition: string
          task_id: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          id?: string
          new_status?: string
          organization_id?: string
          previous_status?: string
          reason?: string
          risk_summary?: string
          route_id?: string | null
          shipment_id?: string | null
          skipped_transition?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_task_admin_exceptions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_task_admin_exceptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_task_admin_exceptions_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "logistics_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_task_admin_exceptions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_task_admin_exceptions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "shipment_logistics_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_task_client_operations: {
        Row: {
          client_operation_id: string
          created_at: string
          created_by: string | null
          organization_id: string
          request_hash: string
          result: Json
          task_id: string
        }
        Insert: {
          client_operation_id: string
          created_at?: string
          created_by?: string | null
          organization_id: string
          request_hash: string
          result: Json
          task_id: string
        }
        Update: {
          client_operation_id?: string
          created_at?: string
          created_by?: string | null
          organization_id?: string
          request_hash?: string
          result?: Json
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_task_client_operations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_task_client_operations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_task_client_operations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "shipment_logistics_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_truck_inventory_events: {
        Row: {
          assigned_driver_id: string
          catalog_key: string
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          item_id: string | null
          item_label: string
          item_name: string
          note: string
          organization_id: string
          qty: number
          route_id: string | null
          shipment_id: string | null
          task_id: string | null
          vehicle_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          assigned_driver_id: string
          catalog_key?: string
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          item_id?: string | null
          item_label?: string
          item_name?: string
          note?: string
          organization_id: string
          qty: number
          route_id?: string | null
          shipment_id?: string | null
          task_id?: string | null
          vehicle_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          assigned_driver_id?: string
          catalog_key?: string
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          item_id?: string | null
          item_label?: string
          item_name?: string
          note?: string
          organization_id?: string
          qty?: number
          route_id?: string | null
          shipment_id?: string | null
          task_id?: string | null
          vehicle_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistics_truck_inventory_events_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_truck_inventory_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_truck_inventory_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_truck_inventory_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_truck_inventory_events_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "logistics_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_truck_inventory_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_truck_inventory_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "shipment_logistics_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_truck_inventory_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "logistics_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_truck_inventory_events_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_vehicles: {
        Row: {
          assigned_driver_id: string | null
          cargo_box_size: string
          cargo_capacity: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string
          organization_id: string
          photo_url: string
          plate: string
          updated_at: string
        }
        Insert: {
          assigned_driver_id?: string | null
          cargo_box_size?: string
          cargo_capacity?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string
          organization_id: string
          photo_url?: string
          plate?: string
          updated_at?: string
        }
        Update: {
          assigned_driver_id?: string | null
          cargo_box_size?: string
          cargo_capacity?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string
          organization_id?: string
          photo_url?: string
          plate?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_vehicles_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_weekday_defaults: {
        Row: {
          default_driver_id: string | null
          estimated_end_time: string | null
          max_boxes: number | null
          max_stops: number | null
          organization_id: string
          start_time: string | null
          updated_at: string
          weekday: number
        }
        Insert: {
          default_driver_id?: string | null
          estimated_end_time?: string | null
          max_boxes?: number | null
          max_stops?: number | null
          organization_id: string
          start_time?: string | null
          updated_at?: string
          weekday: number
        }
        Update: {
          default_driver_id?: string | null
          estimated_end_time?: string | null
          max_boxes?: number | null
          max_stops?: number | null
          organization_id?: string
          start_time?: string | null
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "logistics_weekday_defaults_default_driver_id_fkey"
            columns: ["default_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_weekday_defaults_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_zcta_geometry_cache: {
        Row: {
          bounds: Json
          census_vintage: string
          fetched_at: string
          geojson: Json
          postal_code: string
          simplified_tolerance: number | null
          updated_at: string
        }
        Insert: {
          bounds?: Json
          census_vintage: string
          fetched_at?: string
          geojson: Json
          postal_code: string
          simplified_tolerance?: number | null
          updated_at?: string
        }
        Update: {
          bounds?: Json
          census_vintage?: string
          fetched_at?: string
          geojson?: Json
          postal_code?: string
          simplified_tolerance?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      operational_exception_events: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          evidence: Json
          exception_id: string
          id: string
          note: string
          organization_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: string
          evidence?: Json
          exception_id: string
          id?: string
          note?: string
          organization_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          evidence?: Json
          exception_id?: string
          id?: string
          note?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_exception_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_exception_events_exception_id_fkey"
            columns: ["exception_id"]
            isOneToOne: false
            referencedRelation: "operational_exceptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_exception_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_exceptions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          blocks_release: boolean
          created_at: string
          evidence: Json
          exception_type: string
          id: string
          idempotency_key: string
          logistics_task_id: string | null
          organization_id: string
          package_id: string | null
          reason: string
          reported_at: string
          reported_by: string
          resolution: string
          resolved_at: string | null
          resolved_by: string | null
          shipment_id: string | null
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          blocks_release?: boolean
          created_at?: string
          evidence?: Json
          exception_type: string
          id?: string
          idempotency_key: string
          logistics_task_id?: string | null
          organization_id: string
          package_id?: string | null
          reason: string
          reported_at?: string
          reported_by: string
          resolution?: string
          resolved_at?: string | null
          resolved_by?: string | null
          shipment_id?: string | null
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          blocks_release?: boolean
          created_at?: string
          evidence?: Json
          exception_type?: string
          id?: string
          idempotency_key?: string
          logistics_task_id?: string | null
          organization_id?: string
          package_id?: string | null
          reason?: string
          reported_at?: string
          reported_by?: string
          resolution?: string
          resolved_at?: string | null
          resolved_by?: string | null
          shipment_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_exceptions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_exceptions_logistics_task_id_fkey"
            columns: ["logistics_task_id"]
            isOneToOne: false
            referencedRelation: "shipment_logistics_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_exceptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_exceptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "shipment_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_exceptions_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_exceptions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_exceptions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invoice_counters: {
        Row: {
          last_number: number
          organization_id: string
          updated_at: string
        }
        Insert: {
          last_number?: number
          organization_id: string
          updated_at?: string
        }
        Update: {
          last_number?: number
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invoice_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invoice_reservations: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          invoice_number: string
          organization_id: string
          reservation_token: string
          sequence_number: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          invoice_number: string
          organization_id: string
          reservation_token: string
          sequence_number: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          invoice_number?: string
          organization_id?: string
          reservation_token?: string
          sequence_number?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invoice_reservations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invoice_reservations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          access_scope: string
          created_at: string
          ended_at: string | null
          id: string
          organization_id: string
          role_id: string | null
          role_name_snapshot: string
          role_slug_snapshot: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          access_scope?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          organization_id: string
          role_id?: string | null
          role_name_snapshot: string
          role_slug_snapshot: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          access_scope?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          organization_id?: string
          role_id?: string | null
          role_name_snapshot?: string
          role_slug_snapshot?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_tenant_id_organization_id_fkey"
            columns: ["tenant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      organization_route_settings: {
        Row: {
          accepted_payment_methods: string[]
          default_payment_method: string
          delivery_days: string[]
          delivery_ranges: string[]
          driver_payment_methods: string[]
          empty_box_delivery_fee: string
          full_box_pickup_fee: string
          late_pickup_fee: string
          linked_route_schedules: boolean
          logistics_fee_mode: string
          minimum_deposit: string
          organization_id: string
          payment_reference_required_methods: string[]
          pending_allowed: boolean
          pickup_days: string[]
          pickup_included_days: number
          pickup_included_enabled: boolean
          pickup_ranges: string[]
          route_lead_time: string
          schedule_suggestions: Json
          updated_at: string
        }
        Insert: {
          accepted_payment_methods?: string[]
          default_payment_method?: string
          delivery_days?: string[]
          delivery_ranges?: string[]
          driver_payment_methods?: string[]
          empty_box_delivery_fee?: string
          full_box_pickup_fee?: string
          late_pickup_fee?: string
          linked_route_schedules?: boolean
          logistics_fee_mode?: string
          minimum_deposit?: string
          organization_id: string
          payment_reference_required_methods?: string[]
          pending_allowed?: boolean
          pickup_days?: string[]
          pickup_included_days?: number
          pickup_included_enabled?: boolean
          pickup_ranges?: string[]
          route_lead_time?: string
          schedule_suggestions?: Json
          updated_at?: string
        }
        Update: {
          accepted_payment_methods?: string[]
          default_payment_method?: string
          delivery_days?: string[]
          delivery_ranges?: string[]
          driver_payment_methods?: string[]
          empty_box_delivery_fee?: string
          full_box_pickup_fee?: string
          late_pickup_fee?: string
          linked_route_schedules?: boolean
          logistics_fee_mode?: string
          minimum_deposit?: string
          organization_id?: string
          payment_reference_required_methods?: string[]
          pending_allowed?: boolean
          pickup_days?: string[]
          pickup_included_days?: number
          pickup_included_enabled?: boolean
          pickup_ranges?: string[]
          route_lead_time?: string
          schedule_suggestions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_route_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_seller_code_counters: {
        Row: {
          last_number: number
          organization_id: string
          updated_at: string
        }
        Insert: {
          last_number?: number
          organization_id: string
          updated_at?: string
        }
        Update: {
          last_number?: number
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_seller_code_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          invoice_company_code: number | null
          is_active: boolean
          kind: string
          matrix_organization_id: string | null
          name: string
          organization_code: string | null
          organization_status: string
          organization_type: string | null
          settings: Json
          slug: string
          tenant_id: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          invoice_company_code?: number | null
          is_active?: boolean
          kind?: string
          matrix_organization_id?: string | null
          name: string
          organization_code?: string | null
          organization_status?: string
          organization_type?: string | null
          settings?: Json
          slug: string
          tenant_id?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          invoice_company_code?: number | null
          is_active?: boolean
          kind?: string
          matrix_organization_id?: string | null
          name?: string
          organization_code?: string | null
          organization_status?: string
          organization_type?: string | null
          settings?: Json
          slug?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_canonical_matrix_fkey"
            columns: ["tenant_id", "matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id", "matrix_organization_id"]
          },
          {
            foreignKeyName: "organizations_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_matrix_same_tenant_fkey"
            columns: ["tenant_id", "matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "organizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      package_custody_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_key: string
          event_type: string
          evidence: Json
          from_holder_id: string | null
          from_holder_label: string
          from_holder_type: string | null
          id: string
          occurred_at: string
          organization_id: string
          package_id: string
          package_status: string
          shipment_id: string
          source: string
          to_holder_id: string | null
          to_holder_label: string
          to_holder_type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_key: string
          event_type: string
          evidence?: Json
          from_holder_id?: string | null
          from_holder_label?: string
          from_holder_type?: string | null
          id?: string
          occurred_at?: string
          organization_id: string
          package_id: string
          package_status: string
          shipment_id: string
          source: string
          to_holder_id?: string | null
          to_holder_label?: string
          to_holder_type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_key?: string
          event_type?: string
          evidence?: Json
          from_holder_id?: string | null
          from_holder_label?: string
          from_holder_type?: string | null
          id?: string
          occurred_at?: string
          organization_id?: string
          package_id?: string
          package_status?: string
          shipment_id?: string
          source?: string
          to_holder_id?: string | null
          to_holder_label?: string
          to_holder_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_custody_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_custody_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_custody_events_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "shipment_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_custody_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      package_custody_handoffs: {
        Row: {
          created_at: string
          evidence: Json
          from_holder_id: string | null
          from_holder_label: string
          from_holder_type: string
          id: string
          idempotency_key: string
          initiated_at: string
          initiated_by: string
          organization_id: string
          package_id: string
          reason: string
          receive_evidence: Json
          received_at: string | null
          received_by: string | null
          rejected_at: string | null
          rejected_by: string | null
          shipment_id: string
          status: string
          to_holder_id: string | null
          to_holder_label: string
          to_holder_type: string
        }
        Insert: {
          created_at?: string
          evidence?: Json
          from_holder_id?: string | null
          from_holder_label?: string
          from_holder_type: string
          id?: string
          idempotency_key: string
          initiated_at?: string
          initiated_by: string
          organization_id: string
          package_id: string
          reason?: string
          receive_evidence?: Json
          received_at?: string | null
          received_by?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          shipment_id: string
          status?: string
          to_holder_id?: string | null
          to_holder_label?: string
          to_holder_type: string
        }
        Update: {
          created_at?: string
          evidence?: Json
          from_holder_id?: string | null
          from_holder_label?: string
          from_holder_type?: string
          id?: string
          idempotency_key?: string
          initiated_at?: string
          initiated_by?: string
          organization_id?: string
          package_id?: string
          reason?: string
          receive_evidence?: Json
          received_at?: string | null
          received_by?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          shipment_id?: string
          status?: string
          to_holder_id?: string | null
          to_holder_label?: string
          to_holder_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_custody_handoffs_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_custody_handoffs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_custody_handoffs_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "shipment_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_custody_handoffs_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_custody_handoffs_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_custody_handoffs_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          description: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_invoice_company_code_counter: {
        Row: {
          last_number: number
          singleton: boolean
          updated_at: string
        }
        Insert: {
          last_number?: number
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          last_number?: number
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      pricing_countries: {
        Row: {
          code: string
          created_at: string
          delivery_time: string
          id: string
          name: string
          organization_id: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          delivery_time?: string
          id?: string
          name: string
          organization_id: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          delivery_time?: string
          id?: string
          name?: string
          organization_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_countries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_country_boxes: {
        Row: {
          catalog_key: string | null
          cost: string
          country_id: string
          id: string
          organization_id: string
          price: string
          size: string
        }
        Insert: {
          catalog_key?: string | null
          cost?: string
          country_id: string
          id?: string
          organization_id: string
          price?: string
          size: string
        }
        Update: {
          catalog_key?: string | null
          cost?: string
          country_id?: string
          id?: string
          organization_id?: string
          price?: string
          size?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_country_boxes_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "pricing_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_country_boxes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_promotions: {
        Row: {
          bundle_price: string
          bundle_quantity: number
          catalog_key: string
          country_id: string
          created_at: string
          discount_percent: number
          discounted_quantity: number
          id: string
          is_active: boolean
          name: string
          organization_id: string
          paid_quantity: number
          promotion_type: string
          rule_json: Json | null
          sort_order: number
        }
        Insert: {
          bundle_price?: string
          bundle_quantity?: number
          catalog_key: string
          country_id: string
          created_at?: string
          discount_percent?: number
          discounted_quantity?: number
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          paid_quantity?: number
          promotion_type?: string
          rule_json?: Json | null
          sort_order?: number
        }
        Update: {
          bundle_price?: string
          bundle_quantity?: number
          catalog_key?: string
          country_id?: string
          created_at?: string
          discount_percent?: number
          discounted_quantity?: number
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          paid_quantity?: number
          promotion_type?: string
          rule_json?: Json | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_promotions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "pricing_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_promotions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_phones: {
        Row: {
          created_at: string
          id: string
          phone: string
          phone_digits: string
          phone_verified_at: string | null
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone?: string
          phone_digits?: string
          phone_verified_at?: string | null
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string
          phone_digits?: string
          phone_verified_at?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_phones_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_warehouses: {
        Row: {
          profile_id: string
          warehouse_id: string
        }
        Insert: {
          profile_id: string
          warehouse_id: string
        }
        Update: {
          profile_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_warehouses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_warehouses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          archived_at: string | null
          avatar_path: string | null
          created_at: string
          default_warehouse_id: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          organization_id: string
          phone: string
          phone_digits: string
          phone_verified_at: string | null
          role_id: string
          seller_code: number | null
        }
        Insert: {
          archived_at?: string | null
          avatar_path?: string | null
          created_at?: string
          default_warehouse_id?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          organization_id: string
          phone?: string
          phone_digits?: string
          phone_verified_at?: string | null
          role_id: string
          seller_code?: number | null
        }
        Update: {
          archived_at?: string | null
          avatar_path?: string | null
          created_at?: string
          default_warehouse_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          phone?: string
          phone_digits?: string
          phone_verified_at?: string | null
          role_id?: string
          seller_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_warehouse_id_fkey"
            columns: ["default_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          granted: boolean
          permission_id: string
          role_id: string
        }
        Insert: {
          granted?: boolean
          permission_id: string
          role_id: string
        }
        Update: {
          granted?: boolean
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          name: string
          organization_id: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          organization_id: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_lines: {
        Row: {
          amount_cents: number | null
          box_source: string | null
          concept: string
          created_at: string
          currency: string
          description: string
          id: string
          internal_rate_line_id: string | null
          line_number: number
          organization_id: string
          public_price_line_id: string | null
          quantity: number
          rate_snapshot: Json
          sale_id: string
          tenant_id: string
          unit_amount_cents: number
        }
        Insert: {
          amount_cents?: number | null
          box_source?: string | null
          concept: string
          created_at?: string
          currency?: string
          description: string
          id?: string
          internal_rate_line_id?: string | null
          line_number: number
          organization_id: string
          public_price_line_id?: string | null
          quantity: number
          rate_snapshot?: Json
          sale_id: string
          tenant_id: string
          unit_amount_cents: number
        }
        Update: {
          amount_cents?: number | null
          box_source?: string | null
          concept?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          internal_rate_line_id?: string | null
          line_number?: number
          organization_id?: string
          public_price_line_id?: string | null
          quantity?: number
          rate_snapshot?: Json
          sale_id?: string
          tenant_id?: string
          unit_amount_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_lines_internal_rate_line_id_fkey"
            columns: ["internal_rate_line_id"]
            isOneToOne: false
            referencedRelation: "internal_rate_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_lines_public_price_line_id_fkey"
            columns: ["public_price_line_id"]
            isOneToOne: false
            referencedRelation: "agency_price_list_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_lines_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          agency_organization_id: string | null
          attribution_snapshot: Json
          captor_assignment_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          customer_name_snapshot: string
          id: string
          idempotency_key: string
          legacy_distribution_partner_id: string | null
          matrix_organization_id: string
          sale_kind: string
          seller_membership_id: string | null
          selling_organization_id: string
          shipment_id: string | null
          status: string
          subtotal_cents: number
          supervisor_assignment_id: string | null
          tenant_id: string
          total_cents: number
          version: number
        }
        Insert: {
          agency_organization_id?: string | null
          attribution_snapshot?: Json
          captor_assignment_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_name_snapshot: string
          id?: string
          idempotency_key: string
          legacy_distribution_partner_id?: string | null
          matrix_organization_id: string
          sale_kind: string
          seller_membership_id?: string | null
          selling_organization_id: string
          shipment_id?: string | null
          status?: string
          subtotal_cents?: number
          supervisor_assignment_id?: string | null
          tenant_id: string
          total_cents?: number
          version?: number
        }
        Update: {
          agency_organization_id?: string | null
          attribution_snapshot?: Json
          captor_assignment_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_name_snapshot?: string
          id?: string
          idempotency_key?: string
          legacy_distribution_partner_id?: string | null
          matrix_organization_id?: string
          sale_kind?: string
          seller_membership_id?: string | null
          selling_organization_id?: string
          shipment_id?: string | null
          status?: string
          subtotal_cents?: number
          supervisor_assignment_id?: string | null
          tenant_id?: string
          total_cents?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_agency_organization_id_fkey"
            columns: ["agency_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_legacy_distribution_partner_id_fkey"
            columns: ["legacy_distribution_partner_id"]
            isOneToOne: false
            referencedRelation: "distribution_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_seller_membership_id_fkey"
            columns: ["seller_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_selling_organization_id_fkey"
            columns: ["selling_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_events: {
        Row: {
          action: string
          actor_id: string | null
          context: Json
          entity_id: string | null
          entity_type: string
          id: string
          next_state: Json | null
          occurred_at: string
          operation_key: string | null
          organization_id: string
          previous_state: Json | null
          reason: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          context?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          next_state?: Json | null
          occurred_at?: string
          operation_key?: string | null
          organization_id: string
          previous_state?: Json | null
          reason?: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          context?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          next_state?: Json | null
          occurred_at?: string
          operation_key?: string | null
          organization_id?: string
          previous_state?: Json | null
          reason?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_rate_limits: {
        Row: {
          attempt_count: number
          bucket: string
          key: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          bucket: string
          key: string
          window_start: string
        }
        Update: {
          attempt_count?: number
          bucket?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      shipment_contact_logs: {
        Row: {
          channel: string
          channel_other: string
          created_at: string
          created_by: string | null
          follow_up_at: string | null
          id: string
          next_step: string
          note: string
          organization_id: string
          outcome: string
          shipment_id: string
        }
        Insert: {
          channel?: string
          channel_other?: string
          created_at?: string
          created_by?: string | null
          follow_up_at?: string | null
          id?: string
          next_step?: string
          note?: string
          organization_id: string
          outcome?: string
          shipment_id: string
        }
        Update: {
          channel?: string
          channel_other?: string
          created_at?: string
          created_by?: string | null
          follow_up_at?: string | null
          id?: string
          next_step?: string
          note?: string
          organization_id?: string
          outcome?: string
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_contact_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_contact_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_contact_logs_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_journal_entries: {
        Row: {
          assigned_to: string | null
          body: string
          category: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          delete_reason: string
          deleted_at: string | null
          deleted_by: string | null
          details: Json
          follow_up_at: string | null
          id: string
          organization_id: string
          reminder_status: string
          revision_count: number
          shipment_id: string | null
          source: string
          source_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          body?: string
          category: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delete_reason?: string
          deleted_at?: string | null
          deleted_by?: string | null
          details?: Json
          follow_up_at?: string | null
          id?: string
          organization_id: string
          reminder_status?: string
          revision_count?: number
          shipment_id?: string | null
          source?: string
          source_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delete_reason?: string
          deleted_at?: string | null
          deleted_by?: string | null
          details?: Json
          follow_up_at?: string | null
          id?: string
          organization_id?: string
          reminder_status?: string
          revision_count?: number
          shipment_id?: string | null
          source?: string
          source_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_journal_entries_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_journal_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_journal_entries_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_journal_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_journal_entries_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_journal_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_logistics_task_attempts: {
        Row: {
          captured_at: string | null
          client_operation_id: string | null
          created_at: string
          created_by: string | null
          driver_id: string
          evidence_url: string
          failure_reason: string
          id: string
          invoice_visible: boolean
          note: string
          organization_id: string
          payment_amount: number | null
          payment_expected_amount: number | null
          payment_method: string | null
          payment_outcome: string
          result: string
          route_id: string | null
          shipment_id: string
          task_id: string
        }
        Insert: {
          captured_at?: string | null
          client_operation_id?: string | null
          created_at?: string
          created_by?: string | null
          driver_id: string
          evidence_url?: string
          failure_reason?: string
          id?: string
          invoice_visible?: boolean
          note?: string
          organization_id: string
          payment_amount?: number | null
          payment_expected_amount?: number | null
          payment_method?: string | null
          payment_outcome?: string
          result: string
          route_id?: string | null
          shipment_id: string
          task_id: string
        }
        Update: {
          captured_at?: string | null
          client_operation_id?: string | null
          created_at?: string
          created_by?: string | null
          driver_id?: string
          evidence_url?: string
          failure_reason?: string
          id?: string
          invoice_visible?: boolean
          note?: string
          organization_id?: string
          payment_amount?: number | null
          payment_expected_amount?: number | null
          payment_method?: string | null
          payment_outcome?: string
          result?: string
          route_id?: string | null
          shipment_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_logistics_task_attempts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_logistics_task_attempts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_logistics_task_attempts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_logistics_task_attempts_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "logistics_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_logistics_task_attempts_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_logistics_task_attempts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "shipment_logistics_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_logistics_tasks: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          id: string
          loaded_at: string | null
          notes: string
          ordered_at: string | null
          organization_id: string
          requested_by: string | null
          requested_schedule_at: string | null
          schedule_confirmation_status: string
          schedule_confirmed_at: string | null
          schedule_confirmed_by: string | null
          schedule_kind: string | null
          scheduled_at: string | null
          shipment_id: string
          status: string
          stock_deducted_at: string | null
          task_type: string
          updated_at: string
          warehouse_id: string | null
          window_end_at: string | null
          window_start_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          loaded_at?: string | null
          notes?: string
          ordered_at?: string | null
          organization_id: string
          requested_by?: string | null
          requested_schedule_at?: string | null
          schedule_confirmation_status?: string
          schedule_confirmed_at?: string | null
          schedule_confirmed_by?: string | null
          schedule_kind?: string | null
          scheduled_at?: string | null
          shipment_id: string
          status?: string
          stock_deducted_at?: string | null
          task_type: string
          updated_at?: string
          warehouse_id?: string | null
          window_end_at?: string | null
          window_start_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          loaded_at?: string | null
          notes?: string
          ordered_at?: string | null
          organization_id?: string
          requested_by?: string | null
          requested_schedule_at?: string | null
          schedule_confirmation_status?: string
          schedule_confirmed_at?: string | null
          schedule_confirmed_by?: string | null
          schedule_kind?: string | null
          scheduled_at?: string | null
          shipment_id?: string
          status?: string
          stock_deducted_at?: string | null
          task_type?: string
          updated_at?: string
          warehouse_id?: string | null
          window_end_at?: string | null
          window_start_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_logistics_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_logistics_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_logistics_tasks_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_logistics_tasks_schedule_confirmed_by_fkey"
            columns: ["schedule_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_logistics_tasks_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_logistics_tasks_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_package_invoice_events: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          occurred_at: string
          organization_id: string
          package_id: string
          source: string
          state: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          occurred_at?: string
          organization_id: string
          package_id: string
          source?: string
          state: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          occurred_at?: string
          organization_id?: string
          package_id?: string
          source?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_package_invoice_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_package_invoice_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_package_invoice_events_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "shipment_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_packages: {
        Row: {
          code: string
          collection_recorded_at: string | null
          collection_recorded_by: string | null
          collection_source: string | null
          collection_weight_kg: number | null
          contents: Json
          contents_validated_at: string | null
          contents_validated_by: string | null
          country: string
          created_at: string
          id: string
          intake_condition: string | null
          intake_recorded_at: string | null
          intake_recorded_by: string | null
          intake_session_id: string | null
          intake_weight_kg: number | null
          invoice_code: string
          invoice_created_at: string | null
          invoice_created_by: string | null
          invoice_delivery_evidence_url: string
          invoice_fulfillment_changed_at: string | null
          invoice_fulfillment_changed_by: string | null
          invoice_fulfillment_status: string
          invoice_incident_at: string | null
          invoice_incident_reason: string
          invoice_marked_at: string | null
          invoice_marked_by: string | null
          invoice_paid_at: string | null
          invoice_paid_by: string | null
          invoice_payment_status: string
          invoice_pickup_confirmed_at: string | null
          invoice_pickup_confirmed_by: string | null
          invoice_pickup_evidence_url: string
          organization_id: string
          pallet_id: string | null
          palletized_at: string | null
          palletized_by: string | null
          provider_confirmation_number: string
          provider_name: string
          provider_service: string
          provider_tracking_number: string
          provider_tracking_url: string
          shipment_id: string
          status: string
          truck_arrived_at: string | null
          truck_route_id: string | null
          truck_task_id: string | null
          truck_unloaded_at: string | null
          truck_unloaded_by: string | null
          updated_at: string
          warehouse_bin_id: string | null
          warehouse_id: string | null
          warehouse_location_label: string
          warehouse_placed_at: string | null
          warehouse_placed_by: string | null
          weight_difference_kg: number | null
          weight_difference_note: string
          weight_difference_reviewed_at: string | null
          weight_difference_reviewed_by: string | null
        }
        Insert: {
          code: string
          collection_recorded_at?: string | null
          collection_recorded_by?: string | null
          collection_source?: string | null
          collection_weight_kg?: number | null
          contents?: Json
          contents_validated_at?: string | null
          contents_validated_by?: string | null
          country?: string
          created_at?: string
          id?: string
          intake_condition?: string | null
          intake_recorded_at?: string | null
          intake_recorded_by?: string | null
          intake_session_id?: string | null
          intake_weight_kg?: number | null
          invoice_code?: string
          invoice_created_at?: string | null
          invoice_created_by?: string | null
          invoice_delivery_evidence_url?: string
          invoice_fulfillment_changed_at?: string | null
          invoice_fulfillment_changed_by?: string | null
          invoice_fulfillment_status?: string
          invoice_incident_at?: string | null
          invoice_incident_reason?: string
          invoice_marked_at?: string | null
          invoice_marked_by?: string | null
          invoice_paid_at?: string | null
          invoice_paid_by?: string | null
          invoice_payment_status?: string
          invoice_pickup_confirmed_at?: string | null
          invoice_pickup_confirmed_by?: string | null
          invoice_pickup_evidence_url?: string
          organization_id: string
          pallet_id?: string | null
          palletized_at?: string | null
          palletized_by?: string | null
          provider_confirmation_number?: string
          provider_name?: string
          provider_service?: string
          provider_tracking_number?: string
          provider_tracking_url?: string
          shipment_id: string
          status?: string
          truck_arrived_at?: string | null
          truck_route_id?: string | null
          truck_task_id?: string | null
          truck_unloaded_at?: string | null
          truck_unloaded_by?: string | null
          updated_at?: string
          warehouse_bin_id?: string | null
          warehouse_id?: string | null
          warehouse_location_label?: string
          warehouse_placed_at?: string | null
          warehouse_placed_by?: string | null
          weight_difference_kg?: number | null
          weight_difference_note?: string
          weight_difference_reviewed_at?: string | null
          weight_difference_reviewed_by?: string | null
        }
        Update: {
          code?: string
          collection_recorded_at?: string | null
          collection_recorded_by?: string | null
          collection_source?: string | null
          collection_weight_kg?: number | null
          contents?: Json
          contents_validated_at?: string | null
          contents_validated_by?: string | null
          country?: string
          created_at?: string
          id?: string
          intake_condition?: string | null
          intake_recorded_at?: string | null
          intake_recorded_by?: string | null
          intake_session_id?: string | null
          intake_weight_kg?: number | null
          invoice_code?: string
          invoice_created_at?: string | null
          invoice_created_by?: string | null
          invoice_delivery_evidence_url?: string
          invoice_fulfillment_changed_at?: string | null
          invoice_fulfillment_changed_by?: string | null
          invoice_fulfillment_status?: string
          invoice_incident_at?: string | null
          invoice_incident_reason?: string
          invoice_marked_at?: string | null
          invoice_marked_by?: string | null
          invoice_paid_at?: string | null
          invoice_paid_by?: string | null
          invoice_payment_status?: string
          invoice_pickup_confirmed_at?: string | null
          invoice_pickup_confirmed_by?: string | null
          invoice_pickup_evidence_url?: string
          organization_id?: string
          pallet_id?: string | null
          palletized_at?: string | null
          palletized_by?: string | null
          provider_confirmation_number?: string
          provider_name?: string
          provider_service?: string
          provider_tracking_number?: string
          provider_tracking_url?: string
          shipment_id?: string
          status?: string
          truck_arrived_at?: string | null
          truck_route_id?: string | null
          truck_task_id?: string | null
          truck_unloaded_at?: string | null
          truck_unloaded_by?: string | null
          updated_at?: string
          warehouse_bin_id?: string | null
          warehouse_id?: string | null
          warehouse_location_label?: string
          warehouse_placed_at?: string | null
          warehouse_placed_by?: string | null
          weight_difference_kg?: number | null
          weight_difference_note?: string
          weight_difference_reviewed_at?: string | null
          weight_difference_reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_packages_collection_recorded_by_fkey"
            columns: ["collection_recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_contents_validated_by_fkey"
            columns: ["contents_validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_intake_recorded_by_fkey"
            columns: ["intake_recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_intake_session_id_fkey"
            columns: ["intake_session_id"]
            isOneToOne: false
            referencedRelation: "warehouse_intake_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_invoice_created_by_fkey"
            columns: ["invoice_created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_invoice_fulfillment_changed_by_fkey"
            columns: ["invoice_fulfillment_changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_invoice_marked_by_fkey"
            columns: ["invoice_marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_invoice_paid_by_fkey"
            columns: ["invoice_paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_invoice_pickup_confirmed_by_fkey"
            columns: ["invoice_pickup_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_pallet_id_fkey"
            columns: ["pallet_id"]
            isOneToOne: false
            referencedRelation: "warehouse_pallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_palletized_by_fkey"
            columns: ["palletized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_truck_route_id_fkey"
            columns: ["truck_route_id"]
            isOneToOne: false
            referencedRelation: "logistics_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_truck_task_id_fkey"
            columns: ["truck_task_id"]
            isOneToOne: false
            referencedRelation: "shipment_logistics_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_truck_unloaded_by_fkey"
            columns: ["truck_unloaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_warehouse_bin_id_fkey"
            columns: ["warehouse_bin_id"]
            isOneToOne: false
            referencedRelation: "warehouse_bins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_warehouse_placed_by_fkey"
            columns: ["warehouse_placed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_packages_weight_difference_reviewed_by_fkey"
            columns: ["weight_difference_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_payments: {
        Row: {
          amount: number
          client_payment_id: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          method: string
          note: string
          organization_id: string
          shipment_id: string
        }
        Insert: {
          amount: number
          client_payment_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          method: string
          note?: string
          organization_id: string
          shipment_id: string
        }
        Update: {
          amount?: number
          client_payment_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          method?: string
          note?: string
          organization_id?: string
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_payments_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_sale_operations: {
        Row: {
          actor_id: string
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          organization_id: string
          result: Json | null
          shipment_id: string | null
        }
        Insert: {
          actor_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          organization_id: string
          result?: Json | null
          shipment_id?: string | null
        }
        Update: {
          actor_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          organization_id?: string
          result?: Json | null
          shipment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_sale_operations_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_sale_operations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_sale_operations_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          accounting_status: string
          assigned_to: string | null
          carrier: string
          code: string
          country: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          delivered_at: string | null
          delivery_notes: string
          departed_at: string | null
          distribution_acquisition_owner_id: string | null
          distribution_partner_id: string | null
          distributor_public_price: number | null
          distributor_wholesale_price: number | null
          empty_box_delivered_at: string | null
          finalized_at: string | null
          full_box_collected_at: string | null
          id: string
          invoice_priority: boolean
          invoice_status: string
          logistics_plan: Json
          office_received_at: string | null
          organization_id: string
          paid: number
          profit: number
          public_tracking_expires_at: string | null
          public_tracking_revoked_at: string | null
          public_tracking_token_hash: string | null
          recipient_id: string | null
          recipient_snapshot: Json | null
          sale_kind: string
          sales_owner_id: string | null
          shipped_at: string | null
          status: string
        }
        Insert: {
          accounting_status?: string
          assigned_to?: string | null
          carrier: string
          code: string
          country: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          delivered_at?: string | null
          delivery_notes?: string
          departed_at?: string | null
          distribution_acquisition_owner_id?: string | null
          distribution_partner_id?: string | null
          distributor_public_price?: number | null
          distributor_wholesale_price?: number | null
          empty_box_delivered_at?: string | null
          finalized_at?: string | null
          full_box_collected_at?: string | null
          id?: string
          invoice_priority?: boolean
          invoice_status?: string
          logistics_plan?: Json
          office_received_at?: string | null
          organization_id: string
          paid?: number
          profit?: number
          public_tracking_expires_at?: string | null
          public_tracking_revoked_at?: string | null
          public_tracking_token_hash?: string | null
          recipient_id?: string | null
          recipient_snapshot?: Json | null
          sale_kind?: string
          sales_owner_id?: string | null
          shipped_at?: string | null
          status?: string
        }
        Update: {
          accounting_status?: string
          assigned_to?: string | null
          carrier?: string
          code?: string
          country?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          delivered_at?: string | null
          delivery_notes?: string
          departed_at?: string | null
          distribution_acquisition_owner_id?: string | null
          distribution_partner_id?: string | null
          distributor_public_price?: number | null
          distributor_wholesale_price?: number | null
          empty_box_delivered_at?: string | null
          finalized_at?: string | null
          full_box_collected_at?: string | null
          id?: string
          invoice_priority?: boolean
          invoice_status?: string
          logistics_plan?: Json
          office_received_at?: string | null
          organization_id?: string
          paid?: number
          profit?: number
          public_tracking_expires_at?: string | null
          public_tracking_revoked_at?: string | null
          public_tracking_token_hash?: string | null
          recipient_id?: string | null
          recipient_snapshot?: Json | null
          sale_kind?: string
          sales_owner_id?: string | null
          shipped_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_distribution_acquisition_owner_id_fkey"
            columns: ["distribution_acquisition_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_distribution_partner_id_fkey"
            columns: ["distribution_partner_id"]
            isOneToOne: false
            referencedRelation: "distribution_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "customer_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_sales_owner_id_fkey"
            columns: ["sales_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          dedupe_key: string
          description: string
          employee_id: string
          facts: Json
          id: string
          last_seen_at: string
          organization_id: string
          raised_at: string
          resolved_at: string | null
          status: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          dedupe_key: string
          description: string
          employee_id: string
          facts?: Json
          id?: string
          last_seen_at?: string
          organization_id: string
          raised_at?: string
          resolved_at?: string | null
          status?: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          dedupe_key?: string
          description?: string
          employee_id?: string
          facts?: Json
          id?: string
          last_seen_at?: string
          organization_id?: string
          raised_at?: string
          resolved_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_alerts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "time_clock_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock_auth_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          employee_id: string | null
          id: number
          ip_hash: string
          lookup_hash: string
          organization_id: string
          outcome: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          employee_id?: string | null
          id?: never
          ip_hash: string
          lookup_hash: string
          organization_id: string
          outcome: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          employee_id?: string | null
          id?: never
          ip_hash?: string
          lookup_hash?: string
          organization_id?: string
          outcome?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_auth_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_auth_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "time_clock_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_auth_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock_employees: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          employee_id_key: string
          employee_type: string
          failed_pin_attempts: number
          full_name: string
          id: string
          is_active: boolean
          last_failed_pin_at: string | null
          organization_id: string
          pin_hash: string | null
          pin_locked_until: string | null
          profile_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          employee_id_key: string
          employee_type?: string
          failed_pin_attempts?: number
          full_name: string
          id?: string
          is_active?: boolean
          last_failed_pin_at?: string | null
          organization_id: string
          pin_hash?: string | null
          pin_locked_until?: string | null
          profile_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          employee_id_key?: string
          employee_type?: string
          failed_pin_attempts?: number
          full_name?: string
          id?: string
          is_active?: boolean
          last_failed_pin_at?: string | null
          organization_id?: string
          pin_hash?: string | null
          pin_locked_until?: string | null
          profile_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_employees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_employees_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock_events: {
        Row: {
          created_at: string
          employee_id: string
          event_type: string
          id: string
          occurred_at: string
          organization_id: string
          recorded_by: string | null
          source: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          event_type: string
          id?: string
          occurred_at?: string
          organization_id: string
          recorded_by?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          event_type?: string
          id?: string
          occurred_at?: string
          organization_id?: string
          recorded_by?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "time_clock_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_events_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock_sessions: {
        Row: {
          created_at: string
          employee_id: string
          expires_at: string
          id: string
          last_seen_at: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          expires_at: string
          id?: string
          last_seen_at?: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          expires_at?: string
          id?: string
          last_seen_at?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_sessions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "time_clock_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock_settings: {
        Row: {
          daily_overtime_after_hours: number
          incomplete_record_after_hours: number
          max_daily_hours: number
          max_weekly_hours: number
          missing_clock_out_after_hours: number
          organization_id: string
          overtime_alert_hours: number
          pay_period_anchor_date: string
          pay_period_days: number
          time_zone: string
          updated_at: string
          updated_by: string | null
          week_starts_on: number
          weekly_overtime_after_hours: number
        }
        Insert: {
          daily_overtime_after_hours?: number
          incomplete_record_after_hours?: number
          max_daily_hours?: number
          max_weekly_hours?: number
          missing_clock_out_after_hours?: number
          organization_id: string
          overtime_alert_hours?: number
          pay_period_anchor_date?: string
          pay_period_days?: number
          time_zone?: string
          updated_at?: string
          updated_by?: string | null
          week_starts_on?: number
          weekly_overtime_after_hours?: number
        }
        Update: {
          daily_overtime_after_hours?: number
          incomplete_record_after_hours?: number
          max_daily_hours?: number
          max_weekly_hours?: number
          missing_clock_out_after_hours?: number
          organization_id?: string
          overtime_alert_hours?: number
          pay_period_anchor_date?: string
          pay_period_days?: number
          time_zone?: string
          updated_at?: string
          updated_by?: string | null
          week_starts_on?: number
          weekly_overtime_after_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_bins: {
        Row: {
          aisle: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          organization_id: string
          shelf: string
          sort_order: number
          updated_at: string
          warehouse_id: string
          zone: string
        }
        Insert: {
          aisle?: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          organization_id: string
          shelf?: string
          sort_order?: number
          updated_at?: string
          warehouse_id: string
          zone?: string
        }
        Update: {
          aisle?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          organization_id?: string
          shelf?: string
          sort_order?: number
          updated_at?: string
          warehouse_id?: string
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_bins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_bins_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_intake_counters: {
        Row: {
          next_number: number
          organization_id: string
        }
        Insert: {
          next_number?: number
          organization_id: string
        }
        Update: {
          next_number?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_intake_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_intake_events: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          evidence: Json
          id: string
          item_id: string | null
          note: string
          operation_key: string
          organization_id: string
          session_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: string
          evidence?: Json
          id?: string
          item_id?: string | null
          note?: string
          operation_key: string
          organization_id: string
          session_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          evidence?: Json
          id?: string
          item_id?: string | null
          note?: string
          operation_key?: string
          organization_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_intake_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_intake_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "warehouse_intake_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_intake_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_intake_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "warehouse_intake_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_intake_expected_packages: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          package_code: string
          package_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          package_code: string
          package_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          package_code?: string
          package_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_intake_expected_packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_intake_expected_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "shipment_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_intake_expected_packages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "warehouse_intake_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_intake_items: {
        Row: {
          created_at: string
          evidence_path: string
          id: string
          location_label: string
          match_status: string
          note: string
          operation_key: string
          organization_id: string
          package_id: string | null
          physical_condition: string
          received_weight_kg: number | null
          scanned_at: string
          scanned_by: string
          scanned_code: string
          session_id: string
          warehouse_bin_id: string | null
          weight_difference_kg: number | null
          weight_out_of_tolerance: boolean
        }
        Insert: {
          created_at?: string
          evidence_path?: string
          id?: string
          location_label: string
          match_status: string
          note?: string
          operation_key: string
          organization_id: string
          package_id?: string | null
          physical_condition: string
          received_weight_kg?: number | null
          scanned_at?: string
          scanned_by: string
          scanned_code: string
          session_id: string
          warehouse_bin_id?: string | null
          weight_difference_kg?: number | null
          weight_out_of_tolerance?: boolean
        }
        Update: {
          created_at?: string
          evidence_path?: string
          id?: string
          location_label?: string
          match_status?: string
          note?: string
          operation_key?: string
          organization_id?: string
          package_id?: string | null
          physical_condition?: string
          received_weight_kg?: number | null
          scanned_at?: string
          scanned_by?: string
          scanned_code?: string
          session_id?: string
          warehouse_bin_id?: string | null
          weight_difference_kg?: number | null
          weight_out_of_tolerance?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_intake_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_intake_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "shipment_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_intake_items_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_intake_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "warehouse_intake_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_intake_items_warehouse_bin_id_fkey"
            columns: ["warehouse_bin_id"]
            isOneToOne: false
            referencedRelation: "warehouse_bins"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_intake_sessions: {
        Row: {
          close_operation_key: string | null
          close_summary: Json
          closed_at: string | null
          closed_by: string | null
          code: string
          created_at: string
          driver_confirmed: boolean
          driver_exception_note: string
          expected_count: number
          id: string
          intake_kind: string
          operation_key: string
          organization_id: string
          receiver_confirmed: boolean
          route_id: string | null
          started_at: string
          started_by: string
          status: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          close_operation_key?: string | null
          close_summary?: Json
          closed_at?: string | null
          closed_by?: string | null
          code: string
          created_at?: string
          driver_confirmed?: boolean
          driver_exception_note?: string
          expected_count: number
          id?: string
          intake_kind?: string
          operation_key: string
          organization_id: string
          receiver_confirmed?: boolean
          route_id?: string | null
          started_at?: string
          started_by: string
          status?: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          close_operation_key?: string | null
          close_summary?: Json
          closed_at?: string | null
          closed_by?: string | null
          code?: string
          created_at?: string
          driver_confirmed?: boolean
          driver_exception_note?: string
          expected_count?: number
          id?: string
          intake_kind?: string
          operation_key?: string
          organization_id?: string
          receiver_confirmed?: boolean
          route_id?: string | null
          started_at?: string
          started_by?: string
          status?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_intake_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_intake_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_intake_sessions_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "logistics_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_intake_sessions_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_intake_sessions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_pallets: {
        Row: {
          code: string
          country: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          country: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_pallets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_pallets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address_verified: boolean
          code: string | null
          created_at: string
          formatted_address: string | null
          geo_updated_at: string | null
          id: string
          is_active: boolean
          is_default: boolean
          lat: number | null
          lng: number | null
          name: string
          organization_id: string
          place_id: string | null
        }
        Insert: {
          address_verified?: boolean
          code?: string | null
          created_at?: string
          formatted_address?: string | null
          geo_updated_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          organization_id: string
          place_id?: string | null
        }
        Update: {
          address_verified?: boolean
          code?: string | null
          created_at?: string
          formatted_address?: string | null
          geo_updated_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          organization_id?: string
          place_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      agency_box_lot_balances: {
        Row: {
          age: string | null
          agency_id: string | null
          allocated_quantity: number | null
          available_quantity: number | null
          box_size: string | null
          delivered_at: string | null
          delivered_quantity: number | null
          id: string | null
          inventory_item_id: string | null
          organization_id: string | null
          product_key: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_box_lots_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_lots_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_lots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_box_lots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_charge_balances: {
        Row: {
          adjustment_cents: number | null
          agency_organization_id: string | null
          amount_cents: number | null
          applied_cents: number | null
          concept: string | null
          created_at: string | null
          created_by_membership_id: string | null
          credit_cents: number | null
          currency: string | null
          due_at: string | null
          id: string | null
          idempotency_key: string | null
          matrix_organization_id: string | null
          metadata: Json | null
          outstanding_cents: number | null
          package_id: string | null
          posted_at: string | null
          reversed_cents: number | null
          sale_id: string | null
          shipment_id: string | null
          source_operation_id: string | null
          source_operation_type: string | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_charges_agency_organization_id_fkey"
            columns: ["agency_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_charges_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_charges_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_charges_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "shipment_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_charges_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_charges_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_payment_balances: {
        Row: {
          agency_organization_id: string | null
          amount_cents: number | null
          applied_cents: number | null
          created_at: string | null
          created_by_membership_id: string | null
          currency: string | null
          id: string | null
          idempotency_key: string | null
          matrix_organization_id: string | null
          metadata: Json | null
          method: string | null
          received_at: string | null
          reference: string | null
          status: string | null
          tenant_id: string | null
          unapplied_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_payments_agency_organization_id_fkey"
            columns: ["agency_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_payments_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_payments_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      current_financial_holds: {
        Row: {
          actor_membership_id: string | null
          agency_charge_id: string | null
          agency_organization_id: string | null
          created_at: string | null
          evidence: Json | null
          id: string | null
          matrix_organization_id: string | null
          package_id: string | null
          reason: string | null
          sale_id: string | null
          shipment_id: string | null
          status: string | null
          status_changed_at: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_hold_events_actor_membership_id_fkey"
            columns: ["actor_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_holds_agency_charge_id_fkey"
            columns: ["agency_charge_id"]
            isOneToOne: true
            referencedRelation: "agency_charge_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_holds_agency_charge_id_fkey"
            columns: ["agency_charge_id"]
            isOneToOne: true
            referencedRelation: "agency_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_holds_agency_organization_id_fkey"
            columns: ["agency_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_holds_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_holds_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "shipment_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_holds_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_holds_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_holds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_invoice_balances: {
        Row: {
          amount_cents: number | null
          applied_cents: number | null
          created_at: string | null
          created_by_membership_id: string | null
          credit_cents: number | null
          currency: string | null
          customer_id: string | null
          due_at: string | null
          id: string | null
          invoice_number: string | null
          issued_at: string | null
          lifecycle_status: string | null
          organization_id: string | null
          outstanding_cents: number | null
          sale_id: string | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_invoices_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payment_balances: {
        Row: {
          amount_cents: number | null
          applied_cents: number | null
          created_at: string | null
          created_by_membership_id: string | null
          currency: string | null
          customer_id: string | null
          id: string | null
          idempotency_key: string | null
          metadata: Json | null
          method: string | null
          organization_id: string | null
          received_at: string | null
          reference: string | null
          status: string | null
          tenant_id: string | null
          unapplied_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_settlement_statuses: {
        Row: {
          counted_cents: number | null
          created_at: string | null
          currency: string | null
          current_status: string | null
          difference_cents: number | null
          driver_membership_id: string | null
          evidence: Json | null
          expected_cents: number | null
          id: string | null
          idempotency_key: string | null
          matrix_organization_id: string | null
          reason: string | null
          reconciled_at: string | null
          reconciled_by_membership_id: string | null
          reversal_id: string | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_settlements_driver_membership_id_fkey"
            columns: ["driver_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_settlements_matrix_organization_id_fkey"
            columns: ["matrix_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_settlements_reconciled_by_membership_id_fkey"
            columns: ["reconciled_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_settlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "business_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      package_custody_current: {
        Row: {
          actor_id: string | null
          custody_event_id: string | null
          holder_id: string | null
          holder_label: string | null
          holder_type: string | null
          occurred_at: string | null
          organization_id: string | null
          package_id: string | null
          package_status: string | null
          shipment_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_custody_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_custody_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_custody_events_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "shipment_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_custody_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_package_custody_handoff: {
        Args: {
          operation_key: string
          receive_evidence_value: Json
          target_handoff_id: string
        }
        Returns: Json
      }
      activate_logistics_route_weekday: {
        Args: {
          target_estimated_end_time: string
          target_max_boxes: number
          target_max_stops: number
          target_org_id: string
          target_start_time: string
          target_weekday: number
        }
        Returns: {
          enabled_days: string[]
          estimated_end_time: string
          max_boxes: number
          max_stops: number
          start_time: string
          weekday: number
        }[]
      }
      admin_complete_logistics_task_exception: {
        Args: {
          p_reason: string
          p_risk_acknowledged?: boolean
          p_task_id: string
        }
        Returns: Json
      }
      agency_allocate_boxes_fifo: {
        Args: { target_box_source_id: string }
        Returns: Json
      }
      agency_daily_close_summary: {
        Args: {
          target_date: string
          target_organization_id: string
          target_timezone: string
        }
        Returns: Json
      }
      agency_operations_can_view: {
        Args: { target_organization_id: string; target_tenant_id: string }
        Returns: boolean
      }
      apply_late_pickup_fee: { Args: { p_shipment_id: string }; Returns: Json }
      apply_logistics_empty_box_salida: {
        Args: {
          p_actor_id: string
          p_assignee_id: string
          p_item_id: string
          p_item_name: string
          p_movement_key: string
          p_note: string
          p_organization_id: string
          p_qty: number
          p_reason_code: string
          p_shipment_id: string
          p_warehouse_id: string
        }
        Returns: Json
      }
      approve_operational_exception: {
        Args: { approval_note: string; target_exception_id: string }
        Returns: Json
      }
      archive_business_organization: {
        Args: { archive_reason: string; target_organization_id: string }
        Returns: Json
      }
      assert_agency_daily_close_open: {
        Args: { target_occurred_at: string; target_organization_id: string }
        Returns: undefined
      }
      assign_agency_captor: {
        Args: {
          assignment_reason: string
          idempotency_key: string
          request_id: string
          target_agency_id: string
          target_captor_membership_id: string
        }
        Returns: Json
      }
      assign_agency_request_to_route: {
        Args: {
          idempotency_key: string
          scheduled_for_value: string
          target_request_id: string
          target_route_id: string
        }
        Returns: Json
      }
      assign_captor_supervisor: {
        Args: {
          assignment_reason: string
          idempotency_key: string
          request_id: string
          target_captor_membership_id: string
          target_supervisor_membership_id: string
        }
        Returns: Json
      }
      assign_inventory_item: {
        Args: {
          p_assignee_id: string
          p_expected_return_at?: string
          p_item_id: string
          p_note?: string
          p_purpose?: string
          p_qty: number
          p_warehouse_id: string
        }
        Returns: Json
      }
      authorize_international_release: {
        Args: { command: Json; idempotency_key: string }
        Returns: Json
      }
      backfill_inventory_shipment_refs_unambiguous: {
        Args: { p_dry_run?: boolean }
        Returns: Json
      }
      bootstrap_organization:
        | {
            Args: {
              org_name: string
              owner_email: string
              owner_id: string
              owner_name?: string
            }
            Returns: string
          }
        | {
            Args: {
              org_name: string
              org_slug?: string
              owner_email: string
              owner_id: string
              owner_name?: string
            }
            Returns: string
          }
        | {
            Args: {
              org_kind?: string
              org_name: string
              org_slug?: string
              owner_email: string
              owner_id: string
              owner_name?: string
              owner_phone?: string
            }
            Returns: string
          }
      can_manage_customers: { Args: never; Returns: boolean }
      can_view_internal_shipment_journal: {
        Args: { p_shipment_id: string }
        Returns: boolean
      }
      cancel_inventory_warehouse_transfer: {
        Args: { p_transfer_id: string; target_org_id: string }
        Returns: Json
      }
      cancel_logistics_route_atomic: {
        Args: { p_client_operation_id?: string; p_route_id: string }
        Returns: Json
      }
      change_agency_default_route: {
        Args: {
          change_reason: string
          idempotency_key: string
          target_agency_id: string
          target_route_template_id: string
        }
        Returns: Json
      }
      close_inventory_assignment: {
        Args: {
          p_assignment_id: string
          p_note?: string
          p_outcome: string
          p_qty_consumed?: number
          p_qty_damaged?: number
          p_qty_lost?: number
          p_qty_returned?: number
        }
        Returns: Json
      }
      close_warehouse_intake: {
        Args: {
          driver_confirmed_value: boolean
          driver_exception_note_value: string
          operation_key: string
          receiver_confirmed_value: boolean
          target_session_id: string
        }
        Returns: Json
      }
      close_warehouse_pallet: {
        Args: { operation_key: string; target_pallet_id: string }
        Returns: Json
      }
      collect_shipment_invoice_payment: {
        Args: {
          next_accounting_status: string
          next_finalized_at: string
          next_invoice_status: string
          next_logistics_plan: Json
          next_paid: number
          next_profit: number
          next_sale_kind: string
          payment_amount: number
          payment_client_operation_id?: string
          payment_created_by: string
          payment_kind: string
          payment_method: string
          payment_note: string
          target_organization_id: string
          target_shipment_id: string
        }
        Returns: Json
      }
      complete_agency_visit_by_driver: {
        Args: {
          confirmation_reason: string
          idempotency_key: string
          line_confirmations: Json
          payment: Json
          target_visit_id: string
        }
        Returns: Json
      }
      complete_conductor_route_arrival: {
        Args: {
          captured_at: string
          note_value: string
          operation_key: string
          reason_code: string
          target_route_id: string
          target_warehouse_id: string
        }
        Returns: string
      }
      complete_conductor_task_atomic: {
        Args: {
          p_actor_id: string
          p_captured_at: string
          p_client_operation_id: string
          p_collect_payment: boolean
          p_driver_id: string
          p_evidence_url: string
          p_failure_reason: string
          p_invoice_visible: boolean
          p_next_accounting_status: string
          p_next_finalized_at: string
          p_next_invoice_status: string
          p_next_paid: number
          p_next_profit: number
          p_next_sale_kind: string
          p_note: string
          p_organization_id: string
          p_payment_amount: number
          p_payment_expected_amount: number
          p_payment_method: string
          p_payment_outcome: string
          p_payment_plan: Json
          p_result: string
          p_shipment_patch: Json
          p_task_id: string
          p_task_patch: Json
        }
        Returns: Json
      }
      conductor_truck_inventory_move_atomic: {
        Args: {
          p_catalog_key: string
          p_client_operation_id?: string
          p_driver_id: string
          p_item_id: string
          p_item_label: string
          p_item_name: string
          p_mode: string
          p_note: string
          p_qty: number
          p_route_id: string
          p_source_vehicle_id: string
          p_target_vehicle_id?: string
          p_warehouse_id: string
        }
        Returns: Json
      }
      confirm_agency_visit: {
        Args: {
          confirmation_reason: string
          idempotency_key: string
          line_confirmations: Json
          request_id: string
          target_visit_id: string
        }
        Returns: Json
      }
      confirm_logistics_route_from_bookings: {
        Args: { p_idempotency_key?: string; p_request_ids: string[] }
        Returns: string
      }
      consume_rate_limit: {
        Args: {
          p_bucket: string
          p_key: string
          p_max_attempts: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      create_agency_sale: {
        Args: { command: Json; idempotency_key: string }
        Returns: Json
      }
      create_agency_service_request: {
        Args: {
          idempotency_key: string
          lines: Json
          note: string
          requested_date: string
        }
        Returns: Json
      }
      create_inventory_warehouse_transfer: {
        Args: {
          p_from_warehouse_id: string
          p_item_id: string
          p_note?: string
          p_qty: number
          p_to_warehouse_id: string
          target_org_id: string
        }
        Returns: Json
      }
      create_logistics_route_from_bookings: {
        Args: { p_idempotency_key?: string; p_request_ids: string[] }
        Returns: string
      }
      create_shipment_sale_atomic: {
        Args: { p_command: Json; p_idempotency_key: string }
        Returns: Json
      }
      current_business_organization_id: { Args: never; Returns: string }
      current_membership_has_permission: {
        Args: {
          permission_key: string
          target_organization_id: string
          target_tenant_id: string
        }
        Returns: boolean
      }
      current_membership_id: { Args: never; Returns: string }
      current_organization_id: { Args: never; Returns: string }
      current_role_slug: { Args: never; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      deduct_empty_box_stock_for_task_lines: {
        Args: {
          p_actor_id: string
          p_assignee_id: string
          p_operation_key: string
          p_organization_id: string
          p_shipment_id: string
          p_task_id: string
          p_warehouse_id: string
        }
        Returns: Json
      }
      distribution_assert_parent_manager: {
        Args: { target_partner_id: string }
        Returns: {
          acquisition_owner_id: string | null
          created_at: string
          credit_limit: number
          distributor_organization_id: string
          id: string
          is_active: boolean
          parent_organization_id: string
        }
        SetofOptions: {
          from: "*"
          to: "distribution_partners"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      distribution_assign_acquisition_owner: {
        Args: {
          assignment_reason?: string
          target_owner_id: string
          target_partner_id: string
        }
        Returns: string
      }
      distribution_create_sale: {
        Args: {
          carrier_input?: string
          customer_name_input: string
          delivery_notes_input?: string
          recipient_snapshot_input: Json
          target_offer_id: string
        }
        Returns: {
          public_price: number
          shipment_code: string
          shipment_id: string
          wholesale_price: number
        }[]
      }
      distribution_finalize_acquired_partner_atomic: {
        Args: {
          p_distributor_organization_id: string
          p_distributor_role_id: string
          p_distributor_user_id: string
          p_permission_id: string
        }
        Returns: undefined
      }
      distribution_partner_balance: {
        Args: { target_partner_id: string }
        Returns: number
      }
      distribution_record_payment: {
        Args: {
          payment_amount: number
          payment_note?: string
          target_partner_id: string
        }
        Returns: number
      }
      distribution_set_partner_active_atomic: {
        Args: { p_is_active: boolean; p_partner_id: string; p_reason?: string }
        Returns: Json
      }
      ensure_matrix_chart: {
        Args: { target_matrix_id: string; target_tenant_id: string }
        Returns: undefined
      }
      fail_conductor_task_atomic: {
        Args: {
          p_actor_id: string
          p_captured_at: string
          p_client_operation_id: string
          p_driver_id: string
          p_evidence_url: string
          p_failure_reason: string
          p_invoice_visible: boolean
          p_note: string
          p_organization_id: string
          p_task_id: string
        }
        Returns: Json
      }
      finalize_agency_daily_close: {
        Args: { target_closure_id: string }
        Returns: Json
      }
      finance_agency_account_visible: {
        Args: {
          target_agency: string
          target_matrix: string
          target_tenant: string
        }
        Returns: boolean
      }
      finance_assert_balanced_entry_id: {
        Args: { target_entry: string }
        Returns: undefined
      }
      finance_audit: {
        Args: {
          action_input: string
          after_state_input: Json
          entity_id_input: string
          entity_type_input: string
          idempotency_key_input: string
          reason_input: string
          target_organization_id: string
          target_tenant_id: string
        }
        Returns: undefined
      }
      finance_begin_operation: {
        Args: {
          idempotency_key_input: string
          operation_type_input: string
          target_tenant_id: string
        }
        Returns: {
          actor_membership_id: string | null
          completed_at: string | null
          created_at: string
          error_code: string | null
          id: string
          idempotency_key: string
          operation_type: string
          request_hash: string | null
          result: Json | null
          status: string
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "idempotency_operations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finance_complete_operation: {
        Args: { operation_id: string; result_input: Json }
        Returns: Json
      }
      finance_next_invoice_number: {
        Args: { target_organization_id: string }
        Returns: string
      }
      finance_next_journal_number: {
        Args: { target_matrix_id: string }
        Returns: number
      }
      finance_post_two_line_entry: {
        Args: {
          actor_membership_input?: string
          agency_id_input?: string
          amount_cents_input: number
          credit_account_code: string
          debit_account_code: string
          description_input: string
          reversal_of_input?: string
          source_id_input: string
          source_type_input: string
          target_matrix_id: string
          target_tenant_id: string
        }
        Returns: string
      }
      finance_reverse_journal: {
        Args: {
          p_actor_membership: string
          p_original_source_id: string
          p_original_source_type: string
          p_reason: string
          p_reversal_source_id: string
        }
        Returns: string
      }
      finance_sync_hold_for_charge: {
        Args: {
          actor_membership: string
          reason_input: string
          target_charge_id: string
        }
        Returns: undefined
      }
      fulfill_inventory_sale_stock: {
        Args: {
          p_assignee_id?: string
          p_created_by?: string
          p_note: string
          p_shipment_id: string
          target_org_id: string
        }
        Returns: Json
      }
      grant_platform_admin: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      initialize_business_matrix_organization: {
        Args: { target_organization_id: string }
        Returns: string
      }
      initialize_captor_agency_organization: {
        Args: {
          target_captor_user_id: string
          target_matrix_organization_id: string
          target_organization_id: string
          target_owner_user_id: string
        }
        Returns: string
      }
      initiate_package_custody_handoff: {
        Args: {
          handoff_evidence: Json
          handoff_reason: string
          operation_key: string
          target_holder_id: string
          target_holder_label: string
          target_holder_type: string
          target_package_id: string
        }
        Returns: Json
      }
      invoice_box_child_code: {
        Args: { box_index: number; parent_invoice_code: string }
        Returns: string
      }
      is_platform_admin: { Args: never; Returns: boolean }
      list_conductor_operational_task_page: {
        Args: {
          p_cursor_id?: string
          p_cursor_sort_at?: string
          p_driver_id: string
          p_limit?: number
          p_scope_date: string
          p_visibility?: string
        }
        Returns: {
          assigned_to: string
          route_date: string
          route_id: string
          route_name: string
          scheduled_at: string
          shipment_id: string
          sort_at: string
          stop_order: number
          task_id: string
          task_status: string
          task_type: string
          vehicle_id: string
        }[]
      }
      list_inventory_movements_missing_shipment_refs: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          item_id: string
          item_name: string
          linked_shipment_id: string
          movement_id: string
          movement_key: string
          note: string
          organization_id: string
          qty: number
          reference_id: string
          reference_type: string
          review_status: string
          warehouse_id: string
        }[]
      }
      list_logistics_route_weekdays: {
        Args: { target_org_id: string }
        Returns: string[]
      }
      list_logistics_route_workspace_page: {
        Args: {
          cursor_created_at?: string
          cursor_id?: string
          cursor_route_date?: string
          target_assigned_to?: string
          target_from?: string
          target_limit?: number
          target_route_template_id?: string
          target_scope?: string
          target_search?: string
          target_to?: string
          target_zone_key?: string
        }
        Returns: {
          assigned_to: string
          created_at: string
          delivery_stop_count: number
          id: string
          name: string
          pickup_stop_count: number
          route_date: string
          route_template_id: string
          status: string
          stop_count: number
          vehicle_id: string
          warehouse_id: string
          zone_key: string
        }[]
      }
      list_logistics_task_board_page: {
        Args: {
          p_assigned_to?: string
          p_cursor_created_at?: string
          p_cursor_id?: string
          p_limit?: number
          p_route_date?: string
          p_search?: string
          p_task_type?: string
          p_zone_key?: string
        }
        Returns: {
          assigned_to: string
          created_at: string
          customer_name: string
          route_date: string
          route_id: string
          scheduled_at: string
          shipment_code: string
          shipment_id: string
          task_id: string
          task_status: string
          task_type: string
          zone_key: string
        }[]
      }
      list_logistics_weekday_schedules: {
        Args: { target_org_id: string }
        Returns: {
          estimated_end_time: string
          start_time: string
          weekday: number
        }[]
      }
      load_agency_internal_rate_admin: {
        Args: { target_agency_id: string }
        Returns: Json
      }
      load_agency_public_price_workspace: { Args: never; Returns: Json }
      load_business_workspace: {
        Args: { target_organization_id: string }
        Returns: Json
      }
      load_statistics_dashboard: {
        Args: {
          comparison_from: string
          comparison_to: string
          period_from: string
          period_to: string
          requested_filters?: Json
        }
        Returns: Json
      }
      load_statistics_dashboard_v2: {
        Args: {
          comparison_from: string
          comparison_to: string
          period_from: string
          period_to: string
          requested_filters?: Json
        }
        Returns: Json
      }
      logistics_task_transition_allowed: {
        Args: { p_from: string; p_to: string }
        Returns: boolean
      }
      mark_logistics_task_loaded_with_stock_atomic: {
        Args: {
          p_client_operation_id?: string
          p_item_id: string
          p_item_name: string
          p_movement_key: string
          p_qty: number
          p_task_id: string
          p_warehouse_id: string
        }
        Returns: Json
      }
      next_organization_invoice_number: {
        Args: { target_org_id: string }
        Returns: number
      }
      normalize_inventory_match_text: {
        Args: { value: string }
        Returns: string
      }
      normalize_person_name: { Args: { value: string }; Returns: string }
      normalize_phone_digits: { Args: { raw: string }; Returns: string }
      notify_logistics_route_change: {
        Args: {
          target_actor_id: string
          target_actor_name: string
          target_change_type: string
          target_idempotency_key: string
          target_recipient_id: string
          target_route_id: string
          target_stop_id: string
          target_summary: string
        }
        Returns: string
      }
      open_found_warehouse_intake: {
        Args: { operation_key: string; target_warehouse_id: string }
        Returns: string
      }
      open_warehouse_intake: {
        Args: {
          operation_key: string
          target_route_id: string
          target_warehouse_id: string
        }
        Returns: string
      }
      package_custody_event_type_for_status: {
        Args: { target_status: string }
        Returns: string
      }
      package_has_blocking_exception: {
        Args: { target_package_id: string }
        Returns: boolean
      }
      prepare_agency_daily_close: {
        Args: {
          close_difference_reason: string
          counted_cash: number
          operation_key: string
          target_date: string
          target_timezone: string
        }
        Returns: Json
      }
      pricing_parse_money_amount: { Args: { p_value: string }; Returns: number }
      publish_logistics_route: {
        Args: { target_route_id: string }
        Returns: {
          arrival_confirmed_at: string | null
          arrival_confirmed_by: string | null
          arrival_note: string
          arrival_operation_key: string | null
          arrival_reason_code: string | null
          arrival_reported_at: string | null
          arrival_warehouse_id: string | null
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string
          organization_id: string
          published_at: string | null
          published_by: string | null
          route_date: string
          route_definition_id: string | null
          route_schedule_id: string | null
          route_template_id: string | null
          started_at: string | null
          started_by: string | null
          started_lat: number | null
          started_lng: number | null
          status: string
          updated_at: string
          vehicle_id: string | null
          warehouse_id: string | null
          zone_key: string
        }
        SetofOptions: {
          from: "*"
          to: "logistics_routes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      receive_inventory_warehouse_transfer: {
        Args: { p_transfer_id: string; target_org_id: string }
        Returns: Json
      }
      reconcile_driver_settlement: {
        Args: { command: Json; idempotency_key: string }
        Returns: Json
      }
      record_activity_history: {
        Args: {
          p_action: string
          p_actor_id?: string
          p_actor_name?: string
          p_description?: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_organization_id?: string
          p_title: string
        }
        Returns: string
      }
      record_agency_payment: {
        Args: { command: Json; idempotency_key: string }
        Returns: Json
      }
      record_customer_payment: {
        Args: { command: Json; idempotency_key: string }
        Returns: Json
      }
      record_inventory_movement_atomic: {
        Args: {
          p_assignee_id?: string
          p_assignment_id?: string
          p_created_by: string
          p_evidence?: Json
          p_from_location_id?: string
          p_from_location_label?: string
          p_from_location_type?: string
          p_item_id: string
          p_item_name: string
          p_movement_key?: string
          p_note: string
          p_qty: number
          p_reason_code?: string
          p_reference_id?: string
          p_reference_type?: string
          p_reversal_of_movement_id?: string
          p_to_location_id?: string
          p_to_location_label?: string
          p_to_location_type?: string
          p_total_cost?: number
          p_type: string
          p_unit_cost?: number
          p_warehouse_id: string
          p_warehouse_transfer_id?: string
          target_org_id: string
        }
        Returns: Json
      }
      record_shipment_package_invoice_event: {
        Args: {
          target_changed_by: string
          target_occurred_at: string
          target_package_id: string
          target_source?: string
          target_state: string
        }
        Returns: undefined
      }
      record_shipment_package_invoice_state: {
        Args: {
          target_changed_by: string
          target_occurred_at: string
          target_shipment_id: string
          target_source?: string
          target_state: string
        }
        Returns: undefined
      }
      reject_package_custody_handoff: {
        Args: { rejection_reason: string; target_handoff_id: string }
        Returns: Json
      }
      release_inventory_sale_stock: {
        Args: { p_shipment_id: string; target_org_id: string }
        Returns: Json
      }
      release_organization_invoice_number: {
        Args: { target_org_id: string; target_reservation_token: string }
        Returns: boolean
      }
      reopen_warehouse_intake: {
        Args: {
          operation_key: string
          reason_value: string
          target_session_id: string
        }
        Returns: string
      }
      reopen_warehouse_pallet_exception: {
        Args: {
          operation_key: string
          reason_value: string
          target_pallet_id: string
        }
        Returns: Json
      }
      reorder_logistics_route_stops_atomic: {
        Args: { p_route_id: string; p_stop_ids: string[] }
        Returns: Json
      }
      replace_pricing_config: {
        Args: { payload: Json; target_org_id: string }
        Returns: undefined
      }
      report_operational_exception: {
        Args: {
          exception_evidence: Json
          exception_kind: string
          exception_reason: string
          operation_key: string
          target_package_id: string
          target_task_id: string
        }
        Returns: Json
      }
      reserve_inventory_sale_stock: {
        Args: {
          p_created_by?: string
          p_item_id: string
          p_item_name: string
          p_qty: number
          p_shipment_id: string
          p_warehouse_id: string
          target_org_id: string
        }
        Returns: Json
      }
      reserve_organization_invoice_number: {
        Args: {
          target_box_count: number
          target_city_code: string
          target_company_code: number
          target_country_code: string
          target_org_id: string
          target_reservation_token: string
          target_seller_code: number
        }
        Returns: Json
      }
      resolve_commercial_price: {
        Args: {
          effective_at?: string
          target_audience: string
          target_destination_code: string
          target_entity_id: string
          target_price_kind: string
          target_product_code: string
          target_service_concept: string
        }
        Returns: Json
      }
      resolve_operational_exception: {
        Args: {
          resolution_evidence: Json
          resolution_note: string
          target_exception_id: string
        }
        Returns: Json
      }
      resolve_package_custody_holder: {
        Args: {
          target_package: Database["public"]["Tables"]["shipment_packages"]["Row"]
          target_status?: string
        }
        Returns: {
          holder_id: string
          holder_label: string
          holder_type: string
        }[]
      }
      restore_commercial_price_inheritance: {
        Args: { idempotency_key: string; target_override_id: string }
        Returns: Json
      }
      reverse_financial_event: {
        Args: { command: Json; idempotency_key: string }
        Returns: Json
      }
      reverse_inventory_salidas_for_shipment: {
        Args: {
          p_actor_id: string
          p_operation_key: string
          p_organization_id: string
          p_shipment_id: string
        }
        Returns: Json
      }
      save_agency_internal_rates: {
        Args: {
          idempotency_key: string
          rate_lines: Json
          target_agency_id: string
        }
        Returns: Json
      }
      save_agency_public_prices: {
        Args: { idempotency_key: string; price_lines: Json }
        Returns: Json
      }
      save_commercial_entity_profile: {
        Args: {
          idempotency_key: string
          profile_patch: Json
          target_entity_id: string
          target_entity_type: string
        }
        Returns: Json
      }
      save_commercial_price_override: {
        Args: {
          idempotency_key: string
          target_amount_cents: number
          target_audience: string
          target_calculation_rule: Json
          target_currency: string
          target_destination_code: string
          target_entity_id: string
          target_minimum_amount_cents: number
          target_price_kind: string
          target_product_code: string
          target_service_concept: string
        }
        Returns: Json
      }
      save_country_commercial_service: {
        Args: {
          idempotency_key: string
          target_amount_cents: number
          target_calculation_rule: Json
          target_currency: string
          target_destination_code: string
          target_service_concept: string
        }
        Returns: Json
      }
      save_logistics_axis_settings: {
        Args: {
          p_delivery_days: string[]
          p_delivery_ranges: string[]
          p_empty_box_delivery_fee: string
          p_full_box_pickup_fee: string
          p_linked_route_schedules: boolean
          p_pickup_days: string[]
          p_pickup_ranges: string[]
          p_route_lead_time: string
        }
        Returns: {
          accepted_payment_methods: string[]
          default_payment_method: string
          delivery_days: string[]
          delivery_ranges: string[]
          driver_payment_methods: string[]
          empty_box_delivery_fee: string
          full_box_pickup_fee: string
          late_pickup_fee: string
          linked_route_schedules: boolean
          logistics_fee_mode: string
          minimum_deposit: string
          organization_id: string
          payment_reference_required_methods: string[]
          pending_allowed: boolean
          pickup_days: string[]
          pickup_included_days: number
          pickup_included_enabled: boolean
          pickup_ranges: string[]
          route_lead_time: string
          schedule_suggestions: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organization_route_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_logistics_axis_settings_v2: {
        Args: {
          p_delivery_ranges: string[]
          p_empty_box_delivery_fee: string
          p_full_box_pickup_fee: string
          p_linked_route_schedules: boolean
          p_pickup_ranges: string[]
          p_route_lead_time: string
        }
        Returns: {
          accepted_payment_methods: string[]
          default_payment_method: string
          delivery_days: string[]
          delivery_ranges: string[]
          driver_payment_methods: string[]
          empty_box_delivery_fee: string
          full_box_pickup_fee: string
          late_pickup_fee: string
          linked_route_schedules: boolean
          logistics_fee_mode: string
          minimum_deposit: string
          organization_id: string
          payment_reference_required_methods: string[]
          pending_allowed: boolean
          pickup_days: string[]
          pickup_included_days: number
          pickup_included_enabled: boolean
          pickup_ranges: string[]
          route_lead_time: string
          schedule_suggestions: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organization_route_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_logistics_axis_settings_v3: {
        Args: {
          p_empty_box_delivery_fee: string
          p_full_box_pickup_fee: string
          p_route_lead_time: string
        }
        Returns: {
          accepted_payment_methods: string[]
          default_payment_method: string
          delivery_days: string[]
          delivery_ranges: string[]
          driver_payment_methods: string[]
          empty_box_delivery_fee: string
          full_box_pickup_fee: string
          late_pickup_fee: string
          linked_route_schedules: boolean
          logistics_fee_mode: string
          minimum_deposit: string
          organization_id: string
          payment_reference_required_methods: string[]
          pending_allowed: boolean
          pickup_days: string[]
          pickup_included_days: number
          pickup_included_enabled: boolean
          pickup_ranges: string[]
          route_lead_time: string
          schedule_suggestions: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organization_route_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_sales_axis_settings: {
        Args: {
          p_minimum_deposit: string
          p_pending_allowed: boolean
          p_schedule_suggestions: Json
        }
        Returns: {
          accepted_payment_methods: string[]
          default_payment_method: string
          delivery_days: string[]
          delivery_ranges: string[]
          driver_payment_methods: string[]
          empty_box_delivery_fee: string
          full_box_pickup_fee: string
          late_pickup_fee: string
          linked_route_schedules: boolean
          logistics_fee_mode: string
          minimum_deposit: string
          organization_id: string
          payment_reference_required_methods: string[]
          pending_allowed: boolean
          pickup_days: string[]
          pickup_included_days: number
          pickup_included_enabled: boolean
          pickup_ranges: string[]
          route_lead_time: string
          schedule_suggestions: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organization_route_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_sales_axis_settings_v2: {
        Args: {
          p_accepted_payment_methods: string[]
          p_default_payment_method: string
          p_driver_payment_methods: string[]
          p_minimum_deposit: string
          p_pending_allowed: boolean
          p_reference_required_methods: string[]
          p_schedule_suggestions: Json
        }
        Returns: {
          accepted_payment_methods: string[]
          default_payment_method: string
          delivery_days: string[]
          delivery_ranges: string[]
          driver_payment_methods: string[]
          empty_box_delivery_fee: string
          full_box_pickup_fee: string
          late_pickup_fee: string
          linked_route_schedules: boolean
          logistics_fee_mode: string
          minimum_deposit: string
          organization_id: string
          payment_reference_required_methods: string[]
          pending_allowed: boolean
          pickup_days: string[]
          pickup_included_days: number
          pickup_included_enabled: boolean
          pickup_ranges: string[]
          route_lead_time: string
          schedule_suggestions: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organization_route_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_sales_axis_settings_v3:
        | {
            Args: {
              p_accepted_payment_methods: string[]
              p_default_payment_method: string
              p_driver_payment_methods: string[]
              p_late_pickup_fee: string
              p_minimum_deposit: string
              p_pending_allowed: boolean
              p_pickup_included_days: number
              p_reference_required_methods: string[]
              p_schedule_suggestions: Json
            }
            Returns: {
              accepted_payment_methods: string[]
              default_payment_method: string
              delivery_days: string[]
              delivery_ranges: string[]
              driver_payment_methods: string[]
              empty_box_delivery_fee: string
              full_box_pickup_fee: string
              late_pickup_fee: string
              linked_route_schedules: boolean
              logistics_fee_mode: string
              minimum_deposit: string
              organization_id: string
              payment_reference_required_methods: string[]
              pending_allowed: boolean
              pickup_days: string[]
              pickup_included_days: number
              pickup_included_enabled: boolean
              pickup_ranges: string[]
              route_lead_time: string
              schedule_suggestions: Json
              updated_at: string
            }
            SetofOptions: {
              from: "*"
              to: "organization_route_settings"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_accepted_payment_methods: string[]
              p_default_payment_method: string
              p_driver_payment_methods: string[]
              p_late_pickup_fee: string
              p_minimum_deposit: string
              p_pending_allowed: boolean
              p_pickup_included_days: number
              p_pickup_included_enabled: boolean
              p_reference_required_methods: string[]
              p_schedule_suggestions: Json
            }
            Returns: {
              accepted_payment_methods: string[]
              default_payment_method: string
              delivery_days: string[]
              delivery_ranges: string[]
              driver_payment_methods: string[]
              empty_box_delivery_fee: string
              full_box_pickup_fee: string
              late_pickup_fee: string
              linked_route_schedules: boolean
              logistics_fee_mode: string
              minimum_deposit: string
              organization_id: string
              payment_reference_required_methods: string[]
              pending_allowed: boolean
              pickup_days: string[]
              pickup_included_days: number
              pickup_included_enabled: boolean
              pickup_ranges: string[]
              route_lead_time: string
              schedule_suggestions: Json
              updated_at: string
            }
            SetofOptions: {
              from: "*"
              to: "organization_route_settings"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      scan_found_warehouse_intake_package: {
        Args: {
          evidence_path_value: string
          note_value: string
          operation_key: string
          received_weight_value: number
          scanned_code_value: string
          target_session_id: string
        }
        Returns: string
      }
      scan_warehouse_intake_package: {
        Args: {
          condition_value: string
          evidence_path_value: string
          note_value: string
          operation_key: string
          received_weight_value: number
          scanned_code_value: string
          target_bin_id: string
          target_session_id: string
        }
        Returns: string
      }
      set_logistics_route_weekday_enabled: {
        Args: {
          target_day: string
          target_enabled: boolean
          target_org_id: string
        }
        Returns: string[]
      }
      set_logistics_weekday_schedule: {
        Args: {
          target_estimated_end_time: string
          target_org_id: string
          target_start_time: string
          target_weekday: number
        }
        Returns: {
          estimated_end_time: string
          start_time: string
          weekday: number
        }[]
      }
      slugify_org_name: { Args: { input: string }; Returns: string }
      start_logistics_route_atomic: {
        Args: {
          p_client_operation_id?: string
          p_route_id: string
          p_started_lat: number
          p_started_lng: number
          p_task_ids: string[]
        }
        Returns: Json
      }
      statistics_coverage_json: {
        Args: {
          available_count: number
          coverage_key: string
          coverage_label: string
          total_count: number
        }
        Returns: Json
      }
      statistics_kpi_json: {
        Args: { current_value: number; previous_value: number }
        Returns: Json
      }
      tenant_has_agency_module: {
        Args: { target_tenant_id: string }
        Returns: boolean
      }
      tenant_organization_access: {
        Args: { target_organization_id: string; target_tenant_id: string }
        Returns: boolean
      }
      transfer_inventory_bin_stock_atomic: {
        Args: {
          p_from_bin_id: string
          p_item_id: string
          p_qty: number
          p_to_bin_id: string
          p_warehouse_id: string
          target_org_id: string
        }
        Returns: Json
      }
      transition_agency_status: {
        Args: {
          expected_version: number
          idempotency_key: string
          request_id: string
          target_agency_id: string
          target_status: string
          transition_reason: string
        }
        Returns: Json
      }
      update_logistics_route_from_bookings: {
        Args: { p_idempotency_key?: string; p_request_ids: string[] }
        Returns: string
      }
      update_logistics_task_atomic: {
        Args: {
          p_changes?: Json
          p_client_operation_id: string
          p_task_id: string
        }
        Returns: Json
      }
      update_shipment_logistics_plan_atomic: {
        Args: {
          p_delivery_notes: string
          p_logistics_plan: Json
          p_shipment_id: string
        }
        Returns: undefined
      }
      user_can_access_warehouse: { Args: { wh_id: string }; Returns: boolean }
      user_has_permission: { Args: { perm_key: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

