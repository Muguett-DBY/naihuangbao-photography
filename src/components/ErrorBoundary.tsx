import "../styles/boundaries.css";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, House, RotateCcw } from "lucide-react";
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
        <div className="error-boundary" role="alert" aria-live="assertive">
          <span className="error-boundary-kicker">RECOVERY DESK / ERROR</span>
          <div className="error-boundary-icon" aria-hidden="true">
            <AlertTriangle size={32} strokeWidth={1.5} />
          </div>
          <h2 className="error-boundary-title">
            {i18n.t("errorBoundary.title", "页面暂时没有加载成功")}
          </h2>
          <p className="error-boundary-message">
            {i18n.t("errorBoundary.message", "请重试一次，或稍后再回来查看。")}
          </p>
          <div className="error-boundary-actions">
            <button type="button" className="error-boundary-btn error-boundary-btn--primary" onClick={this.handleRetry}>
              <RotateCcw size={16} aria-hidden="true" />
              {i18n.t("errorBoundary.retry", "重试")}
            </button>
            <Link to="/" className="error-boundary-btn error-boundary-btn--secondary" onClick={this.handleRetry}>
              <House size={16} aria-hidden="true" />
              {i18n.t("errorBoundary.goHome", "返回首页")}
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
