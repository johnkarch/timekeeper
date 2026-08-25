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
