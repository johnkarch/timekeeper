export type Role = "employee" | "admin";

export interface Job {
  id: string;
  name: string;
  is_active: boolean;
}

export interface TimeEntryListItem {
  id: string;
  entry_date: string;
  hours: number;
  notes: string | null;
  billed: boolean;
  job_name: string;
  work_type_id: string | null;
  work_type_name: string | null;
}

export interface JobEntry {
  id: string;
  entry_date: string;
  hours: number;
  notes: string | null;
  billed: boolean;
  employee_name: string;
}

export interface JobWithEntries {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  notes: string | null;
  entries: JobEntry[];
}

export interface JobHours {
  job_name: string;
  hours: number;
}

export interface SubmittedWeekSummary {
  id: string;
  user_id: string;
  employee_name: string;
  week_start: string;
  submitted_at: string;
  total_hours: number;
  job_breakdown: JobHours[];
}

export interface EmployeePeriodHours {
  user_id: string;
  employee_name: string;
  days: number[]; // 14 entries, one per day of the pay period, in order
  total: number;
}

export interface EmployeeHoursBreakdown {
  user_id: string;
  employee_name: string;
  regular: number;
  overtime: number;
  weekend: number;
  pto: number;
}

export interface WorkType {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Employee {
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface BillRate {
  id: string;
  user_id: string;
  work_type_id: string;
  job_id: string | null;
  rate: number;
}

export interface WageRate {
  id: string;
  user_id: string;
  hourly_rate: number;
  effective_date: string;
}

export interface PtoAdjustment {
  id: string;
  user_id: string;
  hours: number;
  reason: string;
  created_at: string;
}

export interface EmployeeStatistics {
  user_id: string;
  employee_name: string;
  regular: number;
  overtime: number;
  weekend: number;
  pto: number;
  billed_hours: number;
  unbilled_hours: number;
  pto_balance: number;
}
