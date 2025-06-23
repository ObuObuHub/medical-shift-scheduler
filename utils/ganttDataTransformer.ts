// Utility to transform medical shift data to Frappe Gantt format
import { Staff, Shift, ShiftType, Hospital } from '../types/medical';

export interface GanttTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  custom_class: string;
  dependencies?: string;
  staff_id?: number;
  shift_type_id?: string;
  hospital_id?: string;
  department?: string;
}

export interface GanttData {
  tasks: GanttTask[];
  view_mode: 'Day' | 'Week' | 'Month';
  date_format: string;
}

/**
 * Transform medical shift data to Gantt chart format
 * Each staff member's shift becomes a separate task
 */
export const transformShiftsToGantt = (
  shifts: Record<string, Shift[]>,
  staff: Staff[],
  shiftTypes: Record<string, ShiftType>,
  hospitals: Hospital[],
  selectedHospital: string,
  startDate: Date,
  endDate: Date
): GanttData => {
  const tasks: GanttTask[] = [];
  
  // Get staff for selected hospital
  const hospitalStaff = staff.filter((s: Staff) => s.hospital === selectedHospital);
  
  // Process each date in the range
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dateKey = date.toISOString().split('T')[0];
    const dayShifts = shifts[dateKey] || [];
    
    // Process each shift on this date
    dayShifts.forEach((shift: Shift) => {
      // Create a task for each staff member assigned to this shift
      shift.staffIds.forEach((staffId: number) => {
        const staffMember = hospitalStaff.find((s: Staff) => s.id === staffId);
        if (!staffMember) return;
        
        const shiftType = shift.type;
        const taskId = `${dateKey}-${shift.id}-${staffId}`;
        
        // Calculate start and end times
        const startDateTime = createDateTime(dateKey, shiftType.start);
        let endDateTime = createDateTime(dateKey, shiftType.end);
        
        // Handle overnight shifts (when end time is earlier than start time)
        if (shiftType.end < shiftType.start) {
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);
          endDateTime = createDateTime(nextDay.toISOString().split('T')[0], shiftType.end);
        }
        
        // Determine custom class for styling
        const customClass = getCustomClass(shiftType, staffMember);
        
        tasks.push({
          id: taskId,
          name: `${staffMember.name} - ${shiftType.name}`,
          start: startDateTime,
          end: endDateTime,
          progress: 100, // Shifts are either scheduled (100%) or not
          custom_class: customClass,
          staff_id: staffId,
          shift_type_id: shiftType.id,
          hospital_id: selectedHospital,
          department: staffMember.specialization
        });
      });
    });
  }
  
  return {
    tasks: tasks.sort((a, b) => {
      // Sort by staff name first, then by start time
      const nameCompare = a.name.split(' - ')[0].localeCompare(b.name.split(' - ')[0]);
      if (nameCompare !== 0) return nameCompare;
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    }),
    view_mode: 'Day',
    date_format: 'YYYY-MM-DD HH:mm'
  };
};

/**
 * Create datetime string from date and time
 */
const createDateTime = (dateString: string, timeString: string): string => {
  return `${dateString} ${timeString}`;
};

/**
 * Generate custom CSS class for styling based on shift type and staff
 */
const getCustomClass = (shiftType: ShiftType, staff: Staff): string => {
  const classes = [];
  
  // Add shift type class
  classes.push(`shift-${shiftType.id}`);
  
  // Add staff type class
  classes.push(`staff-${staff.type}`);
  
  // Add department class
  classes.push(`dept-${staff.specialization.toLowerCase().replace(/\s+/g, '-')}`);
  
  // Add role class
  classes.push(`role-${staff.role}`);
  
  return classes.join(' ');
};

/**
 * Transform Gantt data back to shift assignments (for editing)
 */
export const transformGanttToShifts = (
  ganttTasks: GanttTask[],
  originalShifts: Record<string, Shift[]>
): Record<string, Shift[]> => {
  const updatedShifts = { ...originalShifts };
  
  // Group tasks by date and shift type
  const tasksByDateAndShift = ganttTasks.reduce((acc, task) => {
    const date = task.start.split(' ')[0]; // Extract date part
    const key = `${date}-${task.shift_type_id}`;
    
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(task);
    
    return acc;
  }, {} as Record<string, GanttTask[]>);
  
  // Update shift assignments
  Object.keys(tasksByDateAndShift).forEach(key => {
    const [date, shiftTypeId] = key.split('-');
    const tasks = tasksByDateAndShift[key];
    const staffIds = tasks.map(task => task.staff_id!);
    
    if (updatedShifts[date]) {
      const shiftIndex = updatedShifts[date].findIndex(
        shift => shift.type.id === shiftTypeId
      );
      
      if (shiftIndex !== -1) {
        updatedShifts[date][shiftIndex].staffIds = staffIds;
      }
    }
  });
  
  return updatedShifts;
};

/**
 * Get shift statistics for display
 */
export const getShiftStatistics = (
  tasks: GanttTask[],
  staff: Staff[]
): {
  totalShifts: number;
  staffUtilization: Record<string, number>;
  shiftTypeDistribution: Record<string, number>;
  departmentCoverage: Record<string, number>;
} => {
  const stats = {
    totalShifts: tasks.length,
    staffUtilization: {} as Record<string, number>,
    shiftTypeDistribution: {} as Record<string, number>,
    departmentCoverage: {} as Record<string, number>
  };
  
  // Calculate staff utilization
  tasks.forEach(task => {
    const staffMember = staff.find(s => s.id === task.staff_id);
    if (staffMember) {
      const staffKey = staffMember.name;
      stats.staffUtilization[staffKey] = (stats.staffUtilization[staffKey] || 0) + 1;
    }
    
    // Count shift types
    if (task.shift_type_id) {
      stats.shiftTypeDistribution[task.shift_type_id] = 
        (stats.shiftTypeDistribution[task.shift_type_id] || 0) + 1;
    }
    
    // Count department coverage
    if (task.department) {
      stats.departmentCoverage[task.department] = 
        (stats.departmentCoverage[task.department] || 0) + 1;
    }
  });
  
  return stats;
};