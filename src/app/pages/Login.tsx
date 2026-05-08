import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import logoImg from "../../imports/image-2.png";
import { Lock, User } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(username, password);
    navigate("/");
  };

  return (
    <div className="h-screen bg-[#0e0e0e] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8 md:mb-12">
          <img
            src={logoImg}
            alt="Elite Gym Logo"
            className="w-24 h-24 md:w-40 md:h-40 mb-4 md:mb-6"
          />
          <h1 className="text-[#e5e2e1] text-[24px] md:text-[36px] font-black tracking-[-1.5px] uppercase font-['Space_Grotesk',sans-serif] text-center">
            Elite Gym 24/7
          </h1>
          <p className="text-[#e31e24] text-[10px] md:text-[12px] font-bold tracking-[2px] md:tracking-[3px] uppercase mt-2">
            Management System
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-[#131313] border border-[rgba(93,63,60,0.1)] p-4 md:p-8">
          <div className="mb-6">
            <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
              System_Access
            </p>
            <h2 className="text-[#e5e2e1] text-[24px] font-black tracking-[-1px] uppercase">
              Authentication
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                Username
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#808080]"
                  size={18}
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] pl-11 pr-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#808080]"
                  size={18}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] pl-11 pr-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-[#e31e24] text-white py-3 font-['Space_Grotesk',sans-serif] font-bold text-[12px] tracking-[1.2px] uppercase hover:bg-[#c41a20] transition-colors"
            >
              Access System
            </button>
          </form>

          {/* Info Note */}
          <div className="mt-6 pt-6 border-t border-[rgba(93,63,60,0.1)]">
            <p className="text-[#808080] text-[10px] text-center">
              Sistema de gestión autorizado • Elite Gym 24/7
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
