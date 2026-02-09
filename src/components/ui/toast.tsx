"use client";

import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, XCircle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: () => void;
}

export function Toast({ message, type = "info", duration = 3000, onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle className="h-5 w-5" />,
        error: <XCircle className="h-5 w-5" />,
        warning: <AlertCircle className="h-5 w-5" />,
        info: <Info className="h-5 w-5" />
    };

    const styles = {
        success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300",
        error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300",
        warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300",
        info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
    };

    return (
        <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg border-2 px-4 py-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-top-5 ${styles[type]} max-w-md`}
        >
            <div className="flex-shrink-0">
                {icons[type]}
            </div>
            <p className="flex-1 text-sm font-medium">
                {message}
            </p>
            <button
                onClick={onClose}
                className="flex-shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

// Toast Container Component
interface ToastContainerProps {
    toasts: Array<{ id: string; message: string; type: ToastType }>;
    onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => onRemove(toast.id)}
                    />
                </div>
            ))}
        </div>
    );
}
