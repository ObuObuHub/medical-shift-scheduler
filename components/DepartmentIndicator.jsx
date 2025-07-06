import React from 'react';
import { useData } from './DataContext';
import { ChevronDown } from './Icons';

export const DepartmentIndicator = ({ onDepartmentChange }) => {
  const { selectedDepartment, setSelectedDepartment, staff } = useData();
  const [isOpen, setIsOpen] = React.useState(false);

  // Get unique departments from staff
  const departments = React.useMemo(() => {
    const depts = [...new Set(staff.map(s => s.specialization))].sort();
    return ['Toate', ...depts];
  }, [staff]);

  const handleDepartmentSelect = (dept) => {
    const newDept = dept === 'Toate' ? null : dept;
    setSelectedDepartment(newDept);
    setIsOpen(false);
    if (onDepartmentChange) {
      onDepartmentChange(newDept);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">
          Departament:
        </span>
        <span className="text-sm font-semibold text-blue-600">
          {selectedDepartment || 'Toate'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 right-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => handleDepartmentSelect(dept)}
                className={`
                  w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors
                  ${(dept === 'Toate' && !selectedDepartment) || dept === selectedDepartment 
                    ? 'bg-blue-50 text-blue-700 font-semibold' 
                    : 'text-gray-700'}
                `}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};