import React from 'react';
import { Calendar, CalendarDays, Users, Settings } from './Icons';

export const MobileBottomNav = ({ currentView, onViewChange, hasPermissions }) => {
  const navItems = [
    {
      id: 'calendar',
      label: 'Calendar',
      icon: CalendarDays,
      active: currentView === 'calendar'
    },
    {
      id: 'schedule',
      label: 'Turele Mele',
      icon: Calendar,
      active: currentView === 'schedule'
    }
  ];

  if (hasPermissions) {
    navItems.push(
      {
        id: 'staff',
        label: 'Personal',
        icon: Users,
        active: currentView === 'staff'
      },
      {
        id: 'settings',
        label: 'Setări',
        icon: Settings,
        active: currentView === 'settings'
      }
    );
  }

  return (
    <div className="mobile-nav safe-bottom bg-white border-t border-gray-200">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center justify-center space-y-1 touch-manipulation transition-colors ${
                item.active 
                  ? 'text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;