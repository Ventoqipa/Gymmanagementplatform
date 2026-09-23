import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";
import { AuthProvider } from "./context/AuthContext";
import { AccessGatewayStatusProvider } from "./context/AccessGatewayStatusContext";

export default function App() {
  return (
    <AuthProvider>
      <AccessGatewayStatusProvider>
        <RouterProvider router={router} />
        <Toaster theme="dark" richColors position="top-center" />
      </AccessGatewayStatusProvider>
    </AuthProvider>
  );
}