import { Component, type ErrorInfo, type ReactNode } from "react";
import i18n from "i18next";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="error-boundary">
            <h2>{i18n.t("error.title")}</h2>
            <p>{i18n.t("error.description")}</p>
            <button type="button" onClick={() => this.setState({ hasError: false })}>
              {i18n.t("error.reload")}
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
