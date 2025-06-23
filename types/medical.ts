// TypeScript types for medical shift scheduling

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
  type: 'medic' | 'asistent' | 'infirmier';
  specialization: string;
  hospital: string;
  role: 'staff' | 'manager' | 'admin';
}

export interface Shift {
  id: string;
  type: ShiftType;
  staffIds: number[];
  required: {
    medic: number;
    asistent: number;
    infirmier: number;
  };
}

export interface User {
  id: number;
  name: string;
  role: 'staff' | 'manager' | 'admin';
  hospital: string;
  type?: 'medic' | 'asistent' | 'infirmier';
  specialization?: string;
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