
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDestructive = false,
    onConfirm,
    onClose
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDestructive ? 'bg-red-900/30 text-red-500' : 'bg-purple-900/30 text-purple-400'}`}>
                        <AlertTriangle size={24} />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">{title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
                    </div>

                    <div className="flex gap-3 w-full mt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className={`flex-1 py-3 px-4 font-bold rounded-xl transition text-white shadow-lg ${isDestructive
                                    ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
                                    : 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
