"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { ToastContainer, ToastType } from "@/components/ui/toast";
import { AlertModal, AlertType } from "@/components/ui/AlertModal";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface AlertState {
    isOpen: boolean;
    title: string;
    description: string;
    type: AlertType;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    onCancel?: () => void;
    showCancel: boolean;
}

interface UIContextType {
    toasts: Toast[];
    showToast: (message: string, type?: ToastType) => void;
    removeToast: (id: string) => void;
    showAlert: (options: Partial<Omit<AlertState, "isOpen">>) => Promise<boolean>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [alertState, setAlertState] = useState<AlertState>({
        isOpen: false,
        title: "",
        description: "",
        type: "info",
        confirmText: "OK",
        cancelText: "Cancel",
        onConfirm: () => {},
        showCancel: false
    });

    const showToast = useCallback((message: string, type: ToastType = "info") => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showAlert = useCallback((options: Partial<Omit<AlertState, "isOpen">>) => {
        return new Promise<boolean>((resolve) => {
            setAlertState({
                isOpen: true,
                title: options.title || "Alert",
                description: options.description || "",
                type: options.type || "info",
                confirmText: options.confirmText || "OK",
                cancelText: options.cancelText || "Cancel",
                showCancel: options.showCancel || false,
                onConfirm: () => {
                    setAlertState((prev) => ({ ...prev, isOpen: false }));
                    resolve(true);
                },
                onCancel: () => {
                    setAlertState((prev) => ({ ...prev, isOpen: false }));
                    resolve(false);
                }
            });
        });
    }, []);

    return (
        <UIContext.Provider value={{ toasts, showToast, removeToast, showAlert }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            <AlertModal
                isOpen={alertState.isOpen}
                title={alertState.title}
                description={alertState.description}
                type={alertState.type}
                confirmText={alertState.confirmText}
                cancelText={alertState.cancelText}
                showCancel={alertState.showCancel}
                onConfirm={alertState.onConfirm}
                onCancel={alertState.onCancel}
            />
        </UIContext.Provider>
    );
}

export function useUI() {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error("useUI must be used within a UIProvider");
    }
    return context;
}
