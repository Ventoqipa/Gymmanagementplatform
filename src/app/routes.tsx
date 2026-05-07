import { createBrowserRouter, Navigate } from "react-router";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AccessControl from "./pages/AccessControl";
import Members from "./pages/Members";
import POS from "./pages/POS";
import Reports from "./pages/Reports";

export const router = createBrowserRouter([
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
      { path: "pos", Component: POS },
      { path: "reports", Component: Reports },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
