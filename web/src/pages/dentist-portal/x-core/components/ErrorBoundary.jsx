import React from 'react';
import AppIcon from '../../../../components/AppIcon';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        if (this.props.onCleanup) this.props.onCleanup();
        console.error('[ErrorBoundary] Caught an error:', error);
        console.error('[ErrorBoundary] Error name:', error?.name);
        console.error('[ErrorBoundary] Error message:', error?.message);
        console.error('[ErrorBoundary] Error stack:', error?.stack);
        console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack);

        this.setState({
            error,
            errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
                    <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-10 text-center">
                        <div className="flex flex-col items-center gap-6 mb-8">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center border border-red-100 ring-8 ring-red-50/50">
                                <AppIcon name="AlertCircle" size={40} className="text-red-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Something went wrong</h2>
                                <p className="text-gray-500 max-w-sm mx-auto leading-relaxed">
                                    The application encountered an unexpected issue. Please try reloading or contact support if the problem persists.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 max-w-md mx-auto mb-8">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent-hover transition shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-0.5 active:scale-[0.98]"
                            >
                                Reload Page
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 px-6 py-3 bg-gray-50 text-gray-700 rounded-xl font-medium hover:bg-gray-100 border border-gray-200 transition"
                            >
                                Try Again
                            </button>
                        </div>

                        {/* Technical Details (Hidden by default) */}
                        <div className="pt-6 border-t border-gray-100">
                            <details className="group">
                                <summary className="flex items-center justify-center gap-2 cursor-pointer text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors list-none">
                                    <AppIcon name="ChevronDown" size={16} className="group-open:rotate-180 transition-transform" />
                                    <span>Technical Details</span>
                                </summary>
                                <div className="mt-6 text-left space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {this.state.error && (
                                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 font-mono text-xs overflow-hidden">
                                            <div className="flex items-start gap-3 mb-3 text-red-600 font-semibold uppercase tracking-wider">
                                                <AppIcon name="Cpu" size={14} className="mt-0.5" />
                                                <span>Runtime Error</span>
                                            </div>
                                            <div className="space-y-1.5 text-gray-600">
                                                <p><span className="text-gray-400">Type:</span> {this.state.error.name || 'Error'}</p>
                                                <p><span className="text-gray-400">Message:</span> {this.state.error.message || 'No message'}</p>
                                            </div>
                                            {this.state.error.stack && (
                                                <div className="mt-4">
                                                    <div className="text-gray-400 mb-2 font-semibold uppercase tracking-widest text-[10px]">Stack Trace</div>
                                                    <pre className="p-4 bg-white rounded-lg border border-gray-200 overflow-auto max-h-48 leading-relaxed opacity-80">
                                                        {this.state.error.stack}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {this.state.errorInfo && (
                                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                            <div className="text-gray-400 mb-2 font-semibold uppercase tracking-widest text-[10px]">Component Stack</div>
                                            <pre className="text-[10px] leading-tight text-gray-500 overflow-auto max-h-32">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </details>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
