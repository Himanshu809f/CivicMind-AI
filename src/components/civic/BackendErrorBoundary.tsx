import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  BackendRecoveryScreen,
  isBackendConfigError,
} from "@/components/civic/BackendRecoveryScreen";

type Props = { children: ReactNode };
type State = { error: unknown | null };

/**
 * Catches backend-configuration failures (missing Supabase env vars) anywhere in
 * the tree so the app shows a branded recovery screen instead of a blank page.
 * Other errors are re-thrown to the router's own error boundary.
 */
export class BackendErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    if (!isBackendConfigError(error)) throw error;
    return { error };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("[CivicMind] backend configuration error", error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return <BackendRecoveryScreen error={this.state.error} />;
    }
    return this.props.children;
  }
}
