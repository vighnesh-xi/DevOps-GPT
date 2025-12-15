import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'pending' | 'info';
  children: React.ReactNode;
  className?: string;
}

const statusStyles = {
  success: 'status-success',
  warning: 'status-warning', 
  error: 'status-error',
  pending: 'status-info',
  info: 'status-info'
};

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <span className={cn('status-badge', statusStyles[status], className)}>
      {children}
    </span>
  );
}