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
  'Dermatologie',
  'Psihiatrie'
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
  department: string;
  required: {
    medic: 1;
    asistent: 1;
  };
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