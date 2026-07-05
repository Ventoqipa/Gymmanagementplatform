import { useEffect, useMemo, useState } from "react";
import { Activity, DollarSign, Loader2, TrendingUp, Users } from "lucide-react";
import type { PosSale } from "@/features/pos";
import { getGymPosService } from "../config/gymPosService";
import { formatActivityDetail, localDateIso } from "../lib/labels";
import {
  buildRecentActivity,
  buildRevenueToday,
  getActiveMembersCountFromStore,
  getDailyCheckIns,
  getPeakHoursSlots,
  getPosSalesTodaySync,
} from "../lib/platformStats";

function formatMoney(n: number): string {
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function Dashboard() {
  const [posSalesToday, setPosSalesToday] = useState<PosSale[]>([]);
  const [posLoading, setPosLoading] = useState(true);

  const activeMembers = useMemo(() => getActiveMembersCountFromStore(), []);
  const checkIns = useMemo(() => getDailyCheckIns(), []);
  const peakSlots = useMemo(() => getPeakHoursSlots(), []);

  useEffect(() => {
    let cancelled = false;

    const loadPosSalesToday = async () => {
      setPosLoading(true);
      const today = localDateIso();
      try {
        const sales = await getGymPosService().listSales({
          from: today,
          to: today,
        });
        if (!cancelled) setPosSalesToday(sales);
      } catch {
        if (!cancelled) setPosSalesToday(getPosSalesTodaySync());
      } finally {
        if (!cancelled) setPosLoading(false);
      }
    };

    void loadPosSalesToday();
    return () => {
      cancelled = true;
    };
  }, []);

  const revenue = useMemo(
    () => buildRevenueToday(posSalesToday),
    [posSalesToday],
  );
  const activity = useMemo(
    () => buildRecentActivity(posSalesToday),
    [posSalesToday],
  );

  const capacityPct =
    activeMembers > 0
      ? Math.min(100, Math.round((checkIns / activeMembers) * 100))
      : 0;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      <div>
        <h1 className="text-[#e5e2e1] text-[22px] md:text-[30px] font-black tracking-[-0.5px] uppercase leading-tight">
          Inicio
        </h1>
        <p className="text-[#808080] text-[11px] mt-1">
          Resumen de la operación del día.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-[#131313] border border-[rgba(93,63,60,0.1)] p-4 md:p-5">
          <div className="flex items-start justify-between mb-3">
            <Activity className="text-[#e31e24]" size={20} />
            {checkIns > 0 && (
              <span className="text-[10px] text-[#00ff00] font-bold tracking-[1px]">EN VIVO</span>
            )}
          </div>
          <p className="text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
            Ocupación estimada
          </p>
          <p className="text-[#e5e2e1] text-[22px] font-black leading-none">{capacityPct}%</p>
          <p className="text-[#808080] text-[10px] mt-2">
            {checkIns}/{activeMembers || "—"} accesos hoy vs miembros activos
          </p>
        </div>

        <div className="bg-[#131313] border border-[rgba(93,63,60,0.1)] p-4 md:p-5">
          <div className="flex items-start justify-between mb-3">
            <Users className="text-[#e31e24]" size={20} />
          </div>
          <p className="text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
            Accesos hoy
          </p>
          <p className="text-[#e5e2e1] text-[22px] font-black leading-none">{checkIns}</p>
          <p className="text-[#808080] text-[10px] mt-2">Accesos otorgados hoy</p>
        </div>

        <div className="bg-[#131313] border border-[rgba(93,63,60,0.1)] p-4 md:p-5">
          <div className="flex items-start justify-between mb-3">
            <DollarSign className="text-[#e31e24]" size={20} />
            {posLoading ? (
              <Loader2 className="text-[#808080] animate-spin" size={16} />
            ) : null}
          </div>
          <p className="text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
            Ingresos hoy
          </p>
          <p className="text-[#e5e2e1] text-[22px] font-black leading-none">
            {posLoading ? "—" : formatMoney(revenue.total)}
          </p>
          <p className="text-[#808080] text-[10px] mt-2">
            {posLoading
              ? "Cargando ventas del POS…"
              : `${revenue.transactions} transacciones`}
          </p>
        </div>

        <div className="bg-[#131313] border border-[rgba(93,63,60,0.1)] p-4 md:p-5">
          <div className="flex items-start justify-between mb-3">
            <TrendingUp className="text-[#e31e24]" size={20} />
          </div>
          <p className="text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
            Miembros activos
          </p>
          <p className="text-[#e5e2e1] text-[22px] font-black leading-none">
            {activeMembers.toLocaleString("es-MX")}
          </p>
          <p className="text-[#808080] text-[10px] mt-2">Membresía vigente hoy</p>
        </div>
      </div>

      <div className="bg-[#131313] border border-[rgba(93,63,60,0.1)] p-4 md:p-5">
        <p className="text-[#e31e24] text-[9px] font-bold tracking-[1.5px] uppercase mb-3">
          Horas pico
        </p>
        <div className="space-y-3">
          {peakSlots.map((slot) => (
            <div key={slot.time}>
              <div className="flex justify-between mb-1">
                <span className="text-[#e5e2e1] text-[12px] font-bold">{slot.time}</span>
                <span className="text-[#808080] text-[10px]">{slot.label}</span>
              </div>
              <div className="h-2 bg-[#1a1a1a] relative">
                <div
                  className="h-full bg-[#e31e24]"
                  style={{ width: `${slot.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#131313] border border-[rgba(93,63,60,0.1)] p-4 md:p-5">
        <p className="text-[#e31e24] text-[9px] font-bold tracking-[1.5px] uppercase mb-3">
          Actividad reciente
        </p>
        {activity.length === 0 && !posLoading ? (
          <p className="text-[#808080] text-[12px]">
            Sin actividad registrada. Los accesos, pagos y ventas de la tienda aparecerán aquí.
          </p>
        ) : (
          <div className="space-y-3">
            {activity.map((row, i) => (
              <div
                key={`${row.action}-${row.sortKey}-${i}`}
                className="flex items-center justify-between py-2 border-b border-[rgba(93,63,60,0.05)]"
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-[#e31e24] text-[9px] font-bold tracking-[1px] uppercase">
                    {row.action}
                  </span>
                  <span className="text-[#e5e2e1] text-[12px] font-bold">{row.name}</span>
                  <span className="text-[#808080] text-[10px] tracking-[1px] uppercase">
                    {formatActivityDetail(row.action, row.tier)}
                  </span>
                </div>
                <span className="text-[#808080] text-[10px]">{row.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
