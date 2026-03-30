"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AlertType = "success" | "error" | "info" | "warning";

interface AlertModalProps {
    isOpen: boolean;
    title: string;
    description: string;
    type?: AlertType;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    showCancel?: boolean;
}

export function AlertModal({
    isOpen,
    title,
    description,
    type = "info",
    confirmText = "OK",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    showCancel = false
}: AlertModalProps) {
    if (!isOpen) return null;

    const icons = {
        success: <CheckCircle className="h-12 w-12 text-emerald-500" />,
        error: <XCircle className="h-12 w-12 text-rose-500" />,
        warning: <AlertTriangle className="h-12 w-12 text-amber-500" />,
        info: <Info className="h-12 w-12 text-blue-500" />
    };

    const gradientBg = {
        success: "from-emerald-500/10 to-transparent",
        error: "from-rose-500/10 to-transparent",
        warning: "from-amber-500/10 to-transparent",
        info: "from-blue-500/10 to-transparent"
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-zinc-950/40 backdrop-blur-md"
                onClick={showCancel ? onCancel : onConfirm}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white dark:bg-zinc-900 p-8 shadow-2xl border border-zinc-200 dark:border-white/10`}
            >
                {/* Decorative Background */}
                <div className={`absolute inset-0 bg-gradient-to-b ${gradientBg[type]} pointer-events-none`} />

                <div className="relative flex flex-col items-center text-center space-y-6">
                    <div className="p-4 rounded-full bg-white dark:bg-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none">
                        {icons[type]}
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                            {title}
                        </h2>
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {description}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
                        {showCancel && (
                            <Button
                                variant="outline"
                                className="flex-1 h-14 rounded-full font-black text-xs uppercase tracking-widest border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-900 transition-all shadow-sm"
                                onClick={onCancel}
                            >
                                {cancelText}
                            </Button>
                        )}
                        <Button
                            className={`flex-1 h-14 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:opacity-90 active:scale-95 ${
                                type === 'error' ? 'bg-rose-600 text-white shadow-rose-600/20' : 
                                type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 
                                type === 'warning' ? 'bg-amber-600 text-white shadow-amber-600/20' : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-zinc-900/20'
                            }`}
                            onClick={onConfirm}
                        >
                            {confirmText}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
