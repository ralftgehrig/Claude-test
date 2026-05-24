'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    // Prevent body scroll while sheet is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sheet / Dialog */}
      <div
        ref={dialogRef}
        className={cn(
          'relative w-full animate-sheet-up sm:animate-slide-up',
          'max-h-[92vh] overflow-y-auto overscroll-contain',
          'sm:rounded-2xl sm:mx-4',
          size === 'sm' && 'sm:max-w-sm',
          size === 'md' && 'sm:max-w-md',
          size === 'lg' && 'sm:max-w-2xl',
        )}
        style={{
          background: '#F2F2F7',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -1px 0 rgba(0,0,0,0.08), 0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-9 h-1 rounded-full" style={{ background: 'rgba(60,60,67,0.22)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 sticky top-0 z-10"
          style={{
            background: 'rgba(242,242,247,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '0.5px solid rgba(60,60,67,0.18)',
            borderRadius: '20px 20px 0 0',
          }}
        >
          <h2
            className="text-[17px] font-semibold"
            style={{ color: '#1C1C1E', letterSpacing: '-0.02em' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold transition-colors"
            style={{ background: 'rgba(118,118,128,0.18)', color: '#8E8E93' }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
