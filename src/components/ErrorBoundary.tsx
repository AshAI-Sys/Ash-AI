// @ts-nocheck
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home, MessageCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private handleReportError = () => {
    const errorDetails = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    // In production, send to error tracking service
    console.error('Error Report:', errorDetails);
    
    // For now, copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
    alert('Error details copied to clipboard. Please send this to support.');
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            {/* Neural background pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 animate-pulse" />
              <div className="grid-background opacity-20" />
            </div>

            <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                    <AlertTriangle size={40} className="text-white" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-full animate-ping" />
                </div>
              </div>

              {/* Error Title */}
              <div className="text-center mb-6">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent mb-4">
                  Oops! Something went wrong
                </h1>
                <p className="text-blue-100/80 text-lg leading-relaxed">
                  ASH AI encountered an unexpected error. Our neural networks are working to fix this.
                </p>
              </div>

              {/* Error Details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                  <details className="text-red-200">
                    <summary className="cursor-pointer text-red-300 font-semibold mb-2">
                      Error Details (Development Only)
                    </summary>
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      {this.state.error.message}
                      {this.state.error.stack && (
                        <>
                          <br />
                          <br />
                          {this.state.error.stack}
                        </>
                      )}
                    </pre>
                  </details>
                </div>
              )}

              {/* Action Buttons - Mobile optimized */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
                <button
                  onClick={this.handleRefresh}
                  className="group flex items-center justify-center gap-3 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
                >
                  <RefreshCcw size={18} className="group-hover:animate-spin" />
                  <span className="text-sm sm:text-base">Refresh Page</span>
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="group flex items-center justify-center gap-3 px-4 sm:px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
                >
                  <Home size={18} className="group-hover:animate-bounce" />
                  <span className="text-sm sm:text-base">Go to Dashboard</span>
                </button>

                <button
                  onClick={this.handleReportError}
                  className="group flex items-center justify-center gap-3 px-4 sm:px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
                >
                  <MessageCircle size={18} className="group-hover:animate-pulse" />
                  <span className="text-sm sm:text-base">Report Error</span>
                </button>
              </div>

              {/* Help Text */}
              <div className="text-center mt-8 text-blue-200/60 text-sm">
                <p>
                  If this problem persists, please contact our support team.
                  <br />
                  Error ID: {Date.now().toString(36).toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;