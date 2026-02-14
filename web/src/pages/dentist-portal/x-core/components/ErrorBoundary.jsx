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
                    <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <AppIcon name="AlertCircle" size={24} className="text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
                                <p className="text-gray-600">The application encountered an unexpected error.</p>
                            </div>
                        </div>
                        
                        {this.state.error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                <p className="font-mono text-sm text-red-800 mb-2">
                                    <strong>Error:</strong> {this.state.error.name || 'Error'}
                                </p>
                                <p className="font-mono text-sm text-red-700 mb-2">
                                    <strong>Message:</strong> {this.state.error.message || 'No message provided'}
                                </p>
                                {this.state.error.stack && (
                                    <details className="mt-2">
                                        <summary className="cursor-pointer text-sm font-semibold text-red-600 hover:text-red-800">
                                            Stack Trace
                                        </summary>
                                        <pre className="mt-2 text-xs bg-white p-3 rounded border border-red-200 overflow-auto max-h-60">
                                            {this.state.error.stack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        {this.state.errorInfo && (
                            <details className="mb-4">
                                <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900">
                                    Component Stack
                                </summary>
                                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded border border-gray-300 overflow-auto max-h-40">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition"
                            >
                                Reload Page
                            </button>
                            <button
                                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
