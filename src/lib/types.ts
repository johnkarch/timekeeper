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

export interface WeeklyEntry {
  id: string;
  entry_date: string;
  hours: number;
  notes: string | null;
  billed: boolean;
  job_name: string;
  employee_name: string;
}

export interface EmployeeOption {
  id: string;
  label: string;
}
