import { useCallback, useEffect, useState } from "react";
import { Calendar, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  addPlanUseCase,
  deletePlanUseCase,
  listPlansUseCase,
  updatePlanUseCase,
  type PlanWithValidity,
} from "../core/catalog";

const VALIDITY_OPTIONS = [
  { months: 1, label: "1 mes" },
  { months: 3, label: "3 meses" },
  { months: 6, label: "6 meses" },
  { months: 12, label: "12 meses" },
  { months: 24, label: "24 meses" },
];

type PlanForm = {
  planName: string;
  validityMonths: number;
};

const emptyForm = (): PlanForm => ({
  planName: "",
  validityMonths: 6,
});

export default function Plans() {
  const [plans, setPlans] = useState<PlanWithValidity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await listPlansUseCase();
    if (result.ok) {
      setPlans(result.plans.filter((p) => p.isEnabled !== false));
    } else {
      toast.error("No se pudieron cargar los planes", { description: result.message });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (plan: PlanWithValidity) => {
    setEditingId(plan.planID);
    setForm({
      planName: plan.planName,
      validityMonths: plan.validityMonths,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.planName.trim()) {
      toast.error("El nombre del plan es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      const result = editingId
        ? await updatePlanUseCase({
            planID: editingId,
            planName: form.planName.trim(),
            validityMonths: form.validityMonths,
          })
        : await addPlanUseCase({
            planName: form.planName.trim(),
            validityMonths: form.validityMonths,
          });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(editingId ? "Plan actualizado" : "Plan creado");
      closeModal();
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan: PlanWithValidity) => {
    if (!window.confirm(`¿Eliminar el plan "${plan.planName}"?`)) return;
    const result = await deletePlanUseCase(plan.planID);
    if (!result.ok) {
      toast.error(result.message ?? "No se pudo eliminar");
      return;
    }
    toast.success("Plan eliminado");
    await refresh();
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
            Catálogo
          </p>
          <h1 className="text-[#e5e2e1] text-[32px] md:text-[48px] font-black tracking-[-2px] uppercase">
            Planes
          </h1>
          <p className="text-[#808080] text-[13px] mt-2 max-w-xl">
            Configura planes de membresía. La vigencia se usa al dar de alta miembros
            (el API guarda el nombre; la duración se administra aquí).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="bg-[#e31e24] text-white px-6 py-3 flex items-center justify-center gap-2 hover:bg-[#c41a20] transition-colors shrink-0"
        >
          <Plus size={18} />
          <span className="text-[10px] font-bold tracking-[1px] uppercase">Nuevo plan</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#808080] gap-2">
          <Loader2 className="animate-spin" size={20} />
          Cargando planes…
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-[#131313] border border-[rgba(93,63,60,0.2)] p-12 text-center">
          <p className="text-[#e5e2e1] font-bold mb-2">Sin planes configurados</p>
          <p className="text-[#808080] text-[13px] mb-6">
            Crea al menos un plan para poder registrar miembros.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="bg-[#e31e24] text-white px-6 py-3 text-[10px] font-bold tracking-[1px] uppercase"
          >
            Crear primer plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.planID}
              className="bg-[#131313] border border-[rgba(93,63,60,0.2)] p-6 flex flex-col gap-4"
            >
              <div>
                <p className="text-[#808080] text-[10px] font-mono uppercase tracking-wide">
                  ID {plan.planID}
                </p>
                <h2 className="text-[#e5e2e1] text-[22px] font-black uppercase tracking-tight mt-1">
                  {plan.planName}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-[#808080] text-[12px]">
                <Calendar size={14} className="text-[#e31e24]" />
                <span>
                  Vigencia:{" "}
                  <span className="text-[#e5e2e1] font-bold">
                    {plan.validityMonths}{" "}
                    {plan.validityMonths === 1 ? "mes" : "meses"}
                  </span>
                </span>
              </div>
              <div className="flex gap-2 mt-auto pt-2">
                <button
                  type="button"
                  onClick={() => openEdit(plan)}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] py-2 text-[10px] font-bold tracking-[1px] uppercase text-[#e5e2e1] hover:border-[#e31e24]"
                >
                  <Pencil size={14} />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(plan)}
                  className="px-4 py-2 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e31e24] hover:bg-[#e31e24]/10"
                  aria-label="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#131313] border border-[rgba(93,63,60,0.2)] p-6 md:p-8 max-w-md w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
                  {editingId ? "Editar plan" : "Nuevo plan"}
                </p>
                <h3 className="text-[#e5e2e1] text-[24px] font-black tracking-[-1px] uppercase">
                  Membresía
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-[#808080] hover:text-[#e31e24]"
                aria-label="Cerrar"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  Nombre del plan
                </label>
                <input
                  type="text"
                  value={form.planName}
                  onChange={(e) => setForm({ ...form, planName: e.target.value })}
                  maxLength={50}
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none"
                  placeholder="Ej. GOLD 6 meses"
                  required
                />
              </div>
              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  Vigencia
                </label>
                <select
                  value={form.validityMonths}
                  onChange={(e) =>
                    setForm({ ...form, validityMonths: Number(e.target.value) })
                  }
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none"
                >
                  {VALIDITY_OPTIONS.map((opt) => (
                    <option key={opt.months} value={opt.months}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="animate-spin" size={16} />}
                  {editingId ? "Guardar" : "Crear plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
