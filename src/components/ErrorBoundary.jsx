import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: "rgba(239,68,68,0.12)" }}>
            <AlertTriangle className="h-7 w-7" style={{ color: "#EF4444" }} />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Something went wrong</h2>
          <p className="text-sm mb-1" style={{ color: "#94A3B8" }}>
            An unexpected error occurred. You can try refreshing this section.
          </p>
          {this.state.error?.message && (
            <p className="text-xs mb-5 px-4 py-2 rounded-lg max-w-md font-mono"
              style={{ background: "rgba(239,68,68,0.08)", color: "#F87171" }}>
              {this.state.error.message}
            </p>
          )}
          <Button onClick={this.handleRetry} className="gap-2"
            style={{ background: "#3B82F6", color: "#fff", border: "none" }}>
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}