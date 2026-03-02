import React, { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
  animate?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', title, action, animate = true }) => {
  return (
    <div className={`bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-white/15 ${animate ? 'animate-slide-up' : ''} ${className}`}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          {title && <h3 className="text-lg font-semibold text-white tracking-wide">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};