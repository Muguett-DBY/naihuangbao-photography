import { Outlet } from "react-router";
import { AuthProvider } from "../hooks/useAuth";

export function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
