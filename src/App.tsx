import { lazy, Suspense } from "react";
import { useRoutes, Navigate } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NotFound } from "./components/NotFound";

const AdminDashboard = lazy(async () => {
  await import("./styles/admin.css");
  return import("./components/AdminDashboard");
});

// Admin route kept outside router for backward compatibility
function AdminRoute() {
  return (
    <Suspense fallback={<div className="adm-root"><div className="adm-loading">加载中...</div></div>}>
      <AdminDashboard />
    </Suspense>
  );
}

// This component handles /admin/* routes when loaded directly
export function App() {
  const adminRoutes = useRoutes([
    { path: "/admin/*", element: <AdminRoute /> },
    { path: "/admin", element: <AdminRoute /> },
  ]);

  // If we're on an admin route, render admin
  if (window.location.pathname.startsWith("/admin")) {
    return (
      <ErrorBoundary>
        <AdminRoute />
      </ErrorBoundary>
    );
  }

  // For non-admin routes, redirect to the router-based pages
  return <Navigate to="/" replace />;
}

export default App;
