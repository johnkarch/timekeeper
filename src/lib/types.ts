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
