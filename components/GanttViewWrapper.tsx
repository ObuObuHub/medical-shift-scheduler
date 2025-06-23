import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import GanttView to avoid SSR issues
const GanttView = dynamic(() => import('./GanttView').then(mod => ({ default: mod.GanttView })), {
  ssr: false,
  loading: () => (
    <div className="medical-gantt-container">
      <div className="gantt-loading">
        Se încarcă vizualizarea Gantt...
      </div>
    </div>
  )
});

interface GanttViewWrapperProps {
  selectedHospital: string;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export const GanttViewWrapper: React.FC<GanttViewWrapperProps> = (props) => {
  return <GanttView {...props} />;
};