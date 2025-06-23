import React from 'react';
import { SimpleGanttView } from './SimpleGanttView';

interface GanttViewWrapperProps {
  selectedHospital: string;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export const GanttViewWrapper: React.FC<GanttViewWrapperProps> = (props) => {
  return <SimpleGanttView {...props} />;
};