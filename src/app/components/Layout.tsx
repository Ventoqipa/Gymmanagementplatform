import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard,
  ScanFace,
  Users,
  ShoppingCart,
  BarChart3,
  LogOut
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import logoImg from "../../imports/image-2.png";

export default function Layout() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
    setShowLogoutModal(false);
  };
  return (
    <div className="flex h-screen bg-[#0e0e0e] text-white font-['Space_Grotesk',sans-serif]">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#131313] border-r border-[rgba(93,63,60,0.1)] flex flex-col">
        {/* Logo Section */}
        <div className="p-6 border-b border-[rgba(93,63,60,0.1)]">
          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="Elite Gym Logo"
              className="w-12 h-12"
            />
            <div>
              <h1 className="font-bold text-sm tracking-tight uppercase">Elite Gym 24/7</h1>
              <p className="text-[10px] text-[#e31e24] tracking-[1.5px] uppercase">Management System</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                isActive
                  ? "bg-[#e31e24] text-white"
                  : "text-[#808080] hover:bg-[#1a1a1a] hover:text-[#e5e2e1]"
              }`
            }
          >
            <LayoutDashboard size={18} />
            <span className="font-bold text-xs tracking-wide uppercase">Dashboard</span>
          </NavLink>

          <NavLink
            to="/access-control"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                isActive
                  ? "bg-[#e31e24] text-white"
                  : "text-[#808080] hover:bg-[#1a1a1a] hover:text-[#e5e2e1]"
              }`
            }
          >
            <ScanFace size={18} />
            <span className="font-bold text-xs tracking-wide uppercase">Access Control</span>
          </NavLink>

          <NavLink
            to="/members"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                isActive
                  ? "bg-[#e31e24] text-white"
                  : "text-[#808080] hover:bg-[#1a1a1a] hover:text-[#e5e2e1]"
              }`
            }
          >
            <Users size={18} />
            <span className="font-bold text-xs tracking-wide uppercase">Members</span>
          </NavLink>

          <NavLink
            to="/pos"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                isActive
                  ? "bg-[#e31e24] text-white"
                  : "text-[#808080] hover:bg-[#1a1a1a] hover:text-[#e5e2e1]"
              }`
            }
          >
            <ShoppingCart size={18} />
            <span className="font-bold text-xs tracking-wide uppercase">POS Terminal</span>
          </NavLink>

          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                isActive
                  ? "bg-[#e31e24] text-white"
                  : "text-[#808080] hover:bg-[#1a1a1a] hover:text-[#e5e2e1]"
              }`
            }
          >
            <BarChart3 size={18} />
            <span className="font-bold text-xs tracking-wide uppercase">Reports</span>
          </NavLink>
        </nav>

        {/* System Status Footer */}
        <div className="p-4 border-t border-[rgba(93,63,60,0.1)] space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#808080] uppercase tracking-[1px]">System Status</span>
              <span className="text-[#00ff00] font-bold">ONLINE</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#808080] uppercase tracking-[1px]">Terminals</span>
              <span className="text-[#e5e2e1] font-bold">3/3 ACTIVE</span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded bg-[#1a1a1a] text-[#e31e24] hover:bg-[#e31e24] hover:text-white transition-colors"
          >
            <LogOut size={18} />
            <span className="font-bold text-xs tracking-wide uppercase">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#131313] border border-[rgba(93,63,60,0.2)] p-8 max-w-md w-full mx-4">
            <div className="mb-6">
              <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
                Confirmación
              </p>
              <h3 className="text-[#e5e2e1] text-[24px] font-black tracking-[-1px] uppercase mb-4">
                Cerrar Sesión
              </h3>
              <p className="text-[#808080] text-[14px]">
                ¿Estás seguro que deseas cerrar sesión del sistema?
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#1a1a1a] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
