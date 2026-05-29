import { Navigate } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";

// App is only used for legacy /admin routes that aren't handled by router
export function App() {
  // For non-admin routes, redirect to the router-based pages
  return <Navigate to="/" replace />;
}

export default App;
