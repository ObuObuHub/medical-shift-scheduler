import React from 'react';
import { mobileMenuStyles, headerStyles } from '../utils/dashboardHelpers';

export const DashboardLayout = ({ 
  title, 
  subtitle,
  controls,
  mobileMenu,
  children,
  onBackClick
}) => {
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);

  // Close mobile menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMobileMenu && !event.target.closest('.mobile-menu-container')) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMobileMenu]);

  return (
    <>
      <div className={headerStyles.container}>
        <div className={headerStyles.innerContainer}>
          <div className={headerStyles.titleContainer}>
            <div className="flex items-center gap-2">
              {onBackClick && (
                <button
                  onClick={onBackClick}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                  title="Înapoi"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h1>
                {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
              </div>
            </div>
            
            {mobileMenu && (
              <div className="mobile-menu-container relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMobileMenu(!showMobileMenu);
                  }}
                  className={mobileMenuStyles.button}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                {showMobileMenu && (
                  <div className={mobileMenuStyles.menu}>
                    {mobileMenu.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          item.onClick();
                          setShowMobileMenu(false);
                        }}
                        className={`${mobileMenuStyles.menuItem} ${item.active ? 'bg-blue-50 text-blue-600' : ''}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {controls && (
            <div className={headerStyles.controlsContainer}>
              {controls}
            </div>
          )}
        </div>
      </div>
      
      {children}
    </>
  );
};