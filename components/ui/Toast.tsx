import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, Camera } from 'lucide-react';

interface ToastProps {
    message: string;
    icon?: 'snapshot' | 'success';
    duration?: number;
    onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, icon = 'success', duration = 4000, onClose }) => {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);

    const dismiss = useCallback(() => {
        setExiting(true);
        setTimeout(() => {
            setVisible(false);
            onClose?.();
        }, 300);
    }, [onClose]);

    useEffect(() => {
        // Slide in
        requestAnimationFrame(() => setVisible(true));

        // Auto-dismiss
        const timer = setTimeout(dismiss, duration);
        return () => clearTimeout(timer);
    }, [duration, dismiss]);

    const IconComponent = icon === 'snapshot' ? Camera : Check;

    return (
        <div
            className={`fixed bottom-28 md:bottom-8 left-1/2 z-[100] transition-all duration-300 ease-out ${visible && !exiting
                    ? 'opacity-100 translate-y-0 -translate-x-1/2'
                    : 'opacity-0 translate-y-4 -translate-x-1/2'
                }`}
        >
            <div className="flex items-center gap-3 bg-slate-800/95 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-xl shadow-2xl shadow-black/30">
                <div className="p-1 bg-emerald-500/20 rounded-lg flex-shrink-0">
                    <IconComponent className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-sm font-medium">{message}</span>
                <button onClick={dismiss} className="p-1 text-slate-400 hover:text-white transition-colors flex-shrink-0">
                    <X className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};
