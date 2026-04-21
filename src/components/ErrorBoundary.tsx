'use client';
import { Component, type ReactNode } from 'react';
import SignalLost from './SignalLost';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ERROR BOUNDARY] Uncaught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SignalLost
          code={`ERR_RUNTIME`}
          message={this.state.error?.message ?? 'An unexpected error occurred'}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
