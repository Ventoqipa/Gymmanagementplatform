import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster theme="dark" richColors position="top-center" />
    </AuthProvider>
  );
}