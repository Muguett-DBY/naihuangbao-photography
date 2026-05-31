import { Component, type ErrorInfo, type ReactNode } from "react";
import i18n from "../i18n";

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
    console.error("[ErrorBoundary]", error, errorInfo);
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
        <div
          style={{
            padding: 48,
            textAlign: "center",
            color: "var(--animal-text-color, #3a2e28)",
          }}
        >
          <h2 style={{ marginBottom: 12, fontSize: "1.25rem" }}>
            {i18n.t("errorBoundary.title", "页面暂时没有加载成功")}
          </h2>
          <p
            style={{
              color: "var(--animal-text-color-secondary, #8b7e74)",
              marginBottom: 24,
              maxWidth: 400,
              margin: "0 auto 24px",
              lineHeight: 1.6,
            }}
          >
            {i18n.t("errorBoundary.message", "请重试一次，或稍后再回来查看。")}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              background: "var(--caramel, #d4a574)",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.95rem",
            }}
          >
            {i18n.t("errorBoundary.retry", "重试")}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
