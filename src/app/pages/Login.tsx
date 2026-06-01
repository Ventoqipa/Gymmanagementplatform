import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import logoImg from "../../imports/image-2.png";
import { Eye, EyeOff, Lock, User } from "lucide-react";

function validateForm(usuario: string, password: string): string | null {
  if (!usuario.trim()) {
    return "El usuario es obligatorio.";
  }
  if (!password.trim()) {
    return "La contraseña es obligatoria.";
  }
  return null;
}

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    const clientValidation = validateForm(usuario, password);
    if (clientValidation) {
      setFieldError(clientValidation);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(usuario.trim(), password);
      if (result.success) {
        toast.success("Sesión iniciada correctamente.");
        navigate("/");
        return;
      }
      const message = result.error ?? "No se pudo iniciar sesión.";
      setFieldError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen bg-[#0e0e0e] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
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

        <div className="bg-[#131313] border border-[rgba(93,63,60,0.1)] p-4 md:p-8">
          <div className="mb-6">
            <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
              System_Access
            </p>
            <h2 className="text-[#e5e2e1] text-[24px] font-black tracking-[-1px] uppercase">
              Authentication
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {fieldError && (
              <p
                className="text-[#e31e24] text-[11px] font-medium border border-[rgba(227,30,36,0.35)] bg-[rgba(227,30,36,0.08)] px-3 py-2"
                role="alert"
              >
                {fieldError}
              </p>
            )}

            <div>
              <label
                htmlFor="usuario"
                className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2"
              >
                Usuario
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#808080]"
                  size={18}
                />
                <input
                  id="usuario"
                  type="text"
                  autoComplete="username"
                  value={usuario}
                  onChange={(e) => {
                    setUsuario(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  disabled={isSubmitting}
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] pl-11 pr-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif] disabled:opacity-60"
                  placeholder="Ej. H251"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#808080]"
                  size={18}
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  disabled={isSubmitting}
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] pl-11 pr-11 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif] disabled:opacity-60"
                  placeholder="Ingrese su contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isSubmitting}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#808080] hover:text-[#e5e2e1] transition-colors disabled:opacity-60 disabled:pointer-events-none"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#e31e24] text-white py-3 font-['Space_Grotesk',sans-serif] font-bold text-[12px] tracking-[1.2px] uppercase hover:bg-[#c41a20] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Verificando…" : "Access System"}
            </button>
          </form>

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
