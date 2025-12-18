import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class DebugErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-[100] bg-red-950 text-white p-8 overflow-auto flex flex-col gap-4 font-mono">
                    <h1 className="text-3xl font-bold text-red-300">Application Crash</h1>
                    <div className="p-4 bg-black/50 rounded border border-red-800">
                        <h2 className="text-xl text-red-200 mb-2">Error</h2>
                        <p className="whitespace-pre-wrap">{this.state.error?.toString()}</p>
                    </div>
                    <button
                        className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded font-bold transition-colors"
                        onClick={() => window.location.reload()}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
