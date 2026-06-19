import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import i18n from "../i18n";
import { logError } from "../lib/error-logger";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError("ErrorBoundary", error, { componentStack: errorInfo.componentStack });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="24" cy="24" r="20" />
              <path d="M24 14v12" />
              <circle cx="24" cy="34" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <h2 className="error-boundary-title">
            {i18n.t("errorBoundary.title", "页面暂时没有加载成功")}
          </h2>
          <p className="error-boundary-message">
            {i18n.t("errorBoundary.message", "请重试一次，或稍后再回来查看。")}
          </p>
          <div className="error-boundary-actions">
            <button type="button" className="error-boundary-btn error-boundary-btn--primary" onClick={this.handleRetry}>
              {i18n.t("errorBoundary.retry", "重试")}
            </button>
            <Link to="/" className="error-boundary-btn error-boundary-btn--secondary" onClick={this.handleRetry}>
              {i18n.t("errorBoundary.goHome", "返回首页")}
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
