// TypeScript types for medical shift scheduling

// Standard medical departments
export const MEDICAL_DEPARTMENTS = [
  'Urgențe',
  'Chirurgie',
  'ATI',
  'Pediatrie',
  'Cardiologie',
  'Neurologie',
  'Ortopedice',
  'Ginecologie',
  'Oftalmologie',
  'ORL',
  'Laborator',
  'Psihiatrie',
  'Medicină Internă'
] as const;

export type MedicalDepartment = typeof MEDICAL_DEPARTMENTS[number];

export interface ShiftType {
  id: string;
  name: string;
  start: string;
  end: string;
  color: string;
  duration: number;
}

export interface Hospital {
  id: string;
  name: string;
}

export interface Staff {
  id: number;
  name: string;
  type: 'medic' | 'asistent';
  specialization: MedicalDepartment | string;
  hospital: string;
  role: 'staff' | 'manager' | 'admin';
}

export interface Shift {
  id: string;
  type: ShiftType;
  staffIds: number[];
  department?: string;
  status?: 'open' | 'reserved' | 'confirmed' | 'swap_requested';
  reservedBy?: number;
  reservedAt?: Date;
  swapRequestId?: number;
}

export interface User {
  id: number;
  name: string;
  role: 'staff' | 'manager' | 'admin';
  hospital: string;
  type?: 'medic' | 'asistent';
  specialization?: MedicalDepartment | string;
}

export interface Notification {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: Date;
}

export interface ShiftExchange {
  id: number;
  requester: string;
  requestDate: Date;
  myShift: {
    date: string;
    type: ShiftType;
  };
  wantedShift: {
    date: string;
    type: ShiftType;
  };
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
}

export interface ShiftSwapRequest {
  id: number;
  requesterId: number;
  targetStaffId?: number;
  shiftId: string;
  shiftDate: string;
  shiftType: ShiftType;
  requestedShiftId?: string;
  requestedShiftDate?: string;
  requestedShiftType?: ShiftType;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewedBy?: number;
  reviewedAt?: Date;
  reviewComment?: string;
  hospital: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HospitalShiftConfig {
  id: number;
  hospitalId: string;
  shiftPattern: 'standard_12_24' | 'only_24' | 'custom';
  weekdayShifts: string[];
  weekendShifts: string[];
  holidayShifts: string[];
  minStaffPerShift: number;
  maxConsecutiveNights: number;
  maxShiftsPerMonth: number;
  shiftTypes: Record<string, ShiftType>;
  rules: {
    allowConsecutiveWeekends?: boolean;
    minRestHours?: number;
    maxConsecutive24h?: number;
    [key: string]: any;
  };
  isActive: boolean;
}

export interface StaffShiftPreferences {
  id: number;
  staffId: number;
  preferredShiftTypes?: string[];
  avoidedShiftTypes?: string[];
  preferredDays?: number[];
  notes?: string;
}