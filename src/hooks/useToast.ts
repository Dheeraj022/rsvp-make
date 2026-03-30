import { useUI } from "@/components/providers/UIProvider";

export function useToast() {
    const { showToast, showAlert } = useUI();

    const success = (message: string) => showToast(message, "success");
    const error = (message: string) => showToast(message, "error");
    const warning = (message: string) => showToast(message, "warning");
    const info = (message: string) => showToast(message, "info");

    const alert = (title: string, description: string, type: any = "info") => 
        showAlert({ title, description, type, showCancel: false });

    const confirm = (title: string, description: string, type: any = "warning") => 
        showAlert({ title, description, type, showCancel: true, confirmText: "Confirm", cancelText: "Cancel" });

    return {
        showToast,
        showAlert,
        success,
        error,
        warning,
        info,
        alert,
        confirm
    };
}
