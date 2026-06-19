import { createBrowserRouter, Navigate, Outlet } from "react-router";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { PosSubdomainRedirect } from "./components/PosSubdomainRedirect";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AccessControl from "./pages/AccessControl";
import Members from "./pages/Members";
import Plans from "./pages/Plans";
import POS from "./pages/POS";
import Reports from "./pages/Reports";

function RootLayout() {
  return (
    <>
      <PosSubdomainRedirect />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/login",
        Component: Login,
      },
      {
        path: "/",
        element: (
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, Component: Dashboard },
          { path: "access-control", Component: AccessControl },
          { path: "members", Component: Members },
          { path: "plans", Component: Plans },
          { path: "pos", Component: POS },
          { path: "reports", Component: Reports },
        ],
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
