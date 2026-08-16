// ── Customer domain types ────────────────────────────────────────────────

export interface Customer {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  monthly_units: number | null;
  property_type: string | null;
  roof_type: string | null;
  roof_area: number | null;
  system_type: string | null;
  panel_count?: number | null;
  panel_brand?: string | null;
  inverter_brand?: string | null;
  inverter_capacity_kw?: number | null;
  battery_capacity_kwh?: number | null;
  install_date?: string | null;
  panel_orientation?: string | null;
  panel_tilt_angle?: number | null;
  electricity_provider?: string | null;
  consumer_number?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  installation_cost?: number | null;
  monthly_bill?: number | null;
  tariff_rate?: number | null;
  purchase_type?: string | null;
  subsidy_status?: string | null;
  created_at: string;
  updated_at: string;
}

/** Fields sent when creating or updating a customer */
export type CustomerPayload = {
  id?: number;                   // omit on create, required on update
  full_name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  monthly_units?: number | null;
  property_type?: string | null;
  roof_type?: string | null;
  roof_area?: number | null;
  system_type?: string | null;
};

/** An operation queued while offline */
export interface QueuedOp {
  uid: string;                              // local dedup key
  type: 'create' | 'update' | 'delete';
  payload: CustomerPayload | { id: number };
  queuedAt: string;
}
