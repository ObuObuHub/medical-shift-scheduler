import React from 'react';
import { CustomGanttView } from './CustomGanttView';

interface GanttViewWrapperProps {
  selectedHospital: string;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export const GanttViewWrapper: React.FC<GanttViewWrapperProps> = (props) => {
  return <CustomGanttView {...props} />;
};