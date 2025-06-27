import React, { useEffect } from 'react';
import { X } from './Icons';

export const MobileModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  fullHeight = false,
  showCloseButton = true,
  className = '' 
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`fixed inset-x-0 bottom-0 z-50 ${fullHeight ? 'inset-y-0' : ''}`}>
        <div 
          className={`bg-white ${fullHeight ? 'h-full' : 'max-h-[90vh] rounded-t-2xl'} animate-slide-up ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
            <h3 className="text-lg font-semibold pr-8">{title}</h3>
            {showCloseButton && (
              <button 
                onClick={onClose}
                className="absolute right-4 top-4 p-2 -m-2 touch-manipulation rounded-full hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
          
          {/* Content */}
          <div className="overflow-y-auto" style={{ maxHeight: fullHeight ? 'calc(100vh - 64px)' : 'calc(90vh - 64px)' }}>
            {children}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default MobileModal;