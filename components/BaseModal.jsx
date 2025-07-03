import React, { useEffect } from 'react';
import { X } from './Icons';

export const BaseModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'medium', // small, medium, large, full
  showCloseButton = true,
  className = '',
  contentClassName = '',
  mobileFullHeight = false,
  footer = null
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

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    full: 'max-w-full mx-4'
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal - Mobile */}
      <div className={`md:hidden fixed inset-x-0 bottom-0 z-50 ${mobileFullHeight ? 'inset-y-0' : ''}`}>
        <div 
          className={`bg-white ${mobileFullHeight ? 'h-full' : 'max-h-[90vh] rounded-t-2xl'} animate-slide-up ${className}`}
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
          <div className={`overflow-y-auto ${contentClassName}`} 
               style={{ maxHeight: mobileFullHeight ? 'calc(100vh - 64px)' : 'calc(90vh - 64px)' }}>
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="border-t p-4 bg-white sticky bottom-0">
              {footer}
            </div>
          )}
        </div>
      </div>

      {/* Modal - Desktop */}
      <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4">
        <div 
          className={`bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-xl font-semibold">{title}</h3>
            {showCloseButton && (
              <button 
                onClick={onClose}
                className="p-2 -m-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* Content */}
          <div className={`p-6 overflow-y-auto max-h-[70vh] ${contentClassName}`}>
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="border-t p-6">
              {footer}
            </div>
          )}
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

export default BaseModal;