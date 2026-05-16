import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import imgMemberProfile from "../../imports/PerfilDeMiembroGestion/3b634f4a9044fcdaee9556d934e90fbcffd448af.png";
import { Search, ChevronLeft, ChevronRight, UserPlus, ChevronDown, ChevronUp, ShoppingCart, Wallet, X, ScanFace, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addMembershipPayment, getPaymentsForMember } from "../lib/demoStore";
import { mockFaceIdEnroll } from "../lib/thirdPartyMocks";

interface Member {
  id: string;
  name: string;
  tier: string;
  enrollmentDate: string;
  renewalDate: string;
  monthlyVisits: number;
  avgSessionTime: number;
  email: string;
  /** false = sin plantilla FaceID; true/undefined = puede acceder por rostro (undefined = socios previos al campo) */
  faceIdEnrolled?: boolean;
  faceIdTemplateId?: string;
}

type ExpiryUrgency = "expired" | "critical" | "warning" | "notice" | "ok";

function daysUntilRenewal(renewalDateIso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(renewalDateIso + "T12:00:00");
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

/** Avance del periodo actual entre alta y renovación (0 = inicio, 1 = vence). */
function membershipPeriodProgress(enrollmentIso: string, renewalIso: string): number {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const start = new Date(enrollmentIso + "T12:00:00").getTime();
  const end = new Date(renewalIso + "T12:00:00").getTime();
  if (end <= start) return 1;
  const t = (now.getTime() - start) / (end - start);
  return Math.max(0, Math.min(1, t));
}

function getExpiryMeta(renewalDateIso: string) {
  const days = daysUntilRenewal(renewalDateIso);

  if (days < 0) {
    return {
      level: "expired" as const,
      days,
      label: `Vencida · hace ${Math.abs(days)}d`,
    };
  }
  if (days === 0) return { level: "critical" as const, days, label: "Vence hoy" };
  if (days <= 7) return { level: "critical" as const, days, label: `Vence en ${days}d` };
  if (days <= 30) return { level: "warning" as const, days, label: `Vence en ${days}d` };
  if (days <= 90) return { level: "notice" as const, days, label: `Vence en ${days}d` };
  return { level: "ok" as const, days, label: `${days}d restantes` };
}

function urgencyBarClass(level: ExpiryUrgency): string {
  switch (level) {
    case "expired":
      return "bg-[#e31e24]";
    case "critical":
      return "bg-[#ff5722]";
    case "warning":
      return "bg-[#ffa726]";
    case "notice":
      return "bg-[#ffeb3b]";
    default:
      return "bg-[#00c853]";
  }
}

function urgencyPillClass(level: ExpiryUrgency): string {
  switch (level) {
    case "expired":
      return "bg-[#e31e24]/20 text-[#ff6b6b] border-[#e31e24]/50";
    case "critical":
      return "bg-[#ff5722]/20 text-[#ffab91] border-[#ff5722]/45";
    case "warning":
      return "bg-[#ffa726]/18 text-[#ffcc80] border-[#ffa726]/40";
    case "notice":
      return "bg-[#fdd835]/12 text-[#fff59d] border-[#fdd835]/35";
    default:
      return "bg-[#00c853]/15 text-[#69f0ae] border-[#00c853]/35";
  }
}

function MemberExpiryIndicator({
  member,
  compact = false,
}: {
  member: Member;
  compact?: boolean;
}) {
  const meta = getExpiryMeta(member.renewalDate);
  const progress = membershipPeriodProgress(member.enrollmentDate, member.renewalDate);
  const pct = Math.round(progress * 100);

  if (compact) {
    return (
      <span
        className={`inline-flex items-center max-w-full px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wide leading-tight ${urgencyPillClass(meta.level)}`}
        title={`Vigencia: ${meta.label}. Periodo ~${pct}% transcurrido.`}
      >
        {meta.label}
      </span>
    );
  }

  return (
    <div
      className="flex flex-col gap-1.5 min-w-0 max-w-[160px]"
      title={`Vigencia: ${meta.label}. Periodo membresía ~${pct}% transcurrido (alta → renovación).`}
    >
      <span
        className={`inline-flex items-center w-fit px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wide ${urgencyPillClass(
          meta.level
        )}`}
      >
        {meta.label}
      </span>
      <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden w-full">
        <div
          className={`h-full rounded-full transition-[width] ${urgencyBarClass(meta.level)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[8px] text-[#5a5a5a] uppercase tracking-wide">
        Periodo {pct}% · hasta renovación
      </span>
    </div>
  );
}

const INITIAL_MEMBERS: Member[] = [
  { id: "MEM-1247", name: "Marcus Chen", tier: "ELITE_BLK", enrollmentDate: "2025-11-15", renewalDate: "2026-05-15", monthlyVisits: 23, avgSessionTime: 87, email: "marcus.chen@email.com" },
  { id: "MEM-1246", name: "Sarah Williams", tier: "GOLD", enrollmentDate: "2025-08-20", renewalDate: "2026-05-17", monthlyVisits: 18, avgSessionTime: 65, email: "sarah.w@email.com" },
  { id: "MEM-1245", name: "David Kim", tier: "PLATINUM_ELITE", enrollmentDate: "2025-06-25", renewalDate: "2026-05-20", monthlyVisits: 20, avgSessionTime: 92, email: "david.kim@email.com" },
  { id: "MEM-1244", name: "Jessica Torres", tier: "ELITE_BLK", enrollmentDate: "2025-11-22", renewalDate: "2026-05-22", monthlyVisits: 25, avgSessionTime: 105, email: "j.torres@email.com" },
  { id: "MEM-1243", name: "Michael Johnson", tier: "GOLD", enrollmentDate: "2025-09-08", renewalDate: "2026-05-28", monthlyVisits: 12, avgSessionTime: 55, email: "mjohnson@email.com" },
  { id: "MEM-1242", name: "Emily Rodriguez", tier: "PLATINUM_ELITE", enrollmentDate: "2025-12-10", renewalDate: "2026-06-08", monthlyVisits: 22, avgSessionTime: 78, email: "emily.r@email.com" },
  { id: "MEM-1241", name: "James Anderson", tier: "BASIC", enrollmentDate: "2025-10-05", renewalDate: "2026-06-24", monthlyVisits: 15, avgSessionTime: 60, email: "james.a@email.com" },
  { id: "MEM-1240", name: "Lisa Martinez", tier: "ELITE_BLK", enrollmentDate: "2025-11-01", renewalDate: "2026-07-12", monthlyVisits: 28, avgSessionTime: 95, email: "lisa.m@email.com" },
  { id: "MEM-1239", name: "Robert Taylor", tier: "GOLD", enrollmentDate: "2025-08-12", renewalDate: "2026-08-01", monthlyVisits: 10, avgSessionTime: 45, email: "robert.t@email.com" },
  { id: "MEM-1238", name: "Amanda White", tier: "PLATINUM_ELITE", enrollmentDate: "2025-12-18", renewalDate: "2026-09-20", monthlyVisits: 19, avgSessionTime: 82, email: "amanda.w@email.com" },
  { id: "MEM-1237", name: "Christopher Lee", tier: "BASIC", enrollmentDate: "2025-10-28", renewalDate: "2026-10-28", monthlyVisits: 14, avgSessionTime: 58, email: "chris.lee@email.com" },
  { id: "MEM-1236", name: "Nicole Brown", tier: "ELITE_BLK", enrollmentDate: "2025-11-28", renewalDate: "2026-11-25", monthlyVisits: 26, avgSessionTime: 98, email: "nicole.b@email.com" },
  { id: "MEM-1235", name: "Daniel Garcia", tier: "GOLD", enrollmentDate: "2026-01-08", renewalDate: "2026-12-10", monthlyVisits: 8, avgSessionTime: 40, email: "daniel.g@email.com" },
  { id: "MEM-1234", name: "Rachel Miller", tier: "PLATINUM_ELITE", enrollmentDate: "2026-02-14", renewalDate: "2027-01-30", monthlyVisits: 21, avgSessionTime: 85, email: "rachel.m@email.com" },
  { id: "MEM-1233", name: "Kevin Wilson", tier: "BASIC", enrollmentDate: "2025-05-18", renewalDate: "2026-04-10", monthlyVisits: 16, avgSessionTime: 62, email: "kevin.w@email.com" },
  { id: "MEM-1232", name: "Samantha Davis", tier: "ELITE_BLK", enrollmentDate: "2025-09-03", renewalDate: "2026-03-22", monthlyVisits: 27, avgSessionTime: 102, email: "samantha.d@email.com" },
  { id: "MEM-1231", name: "Brian Moore", tier: "GOLD", enrollmentDate: "2025-07-14", renewalDate: "2026-05-02", monthlyVisits: 17, avgSessionTime: 68, email: "brian.m@email.com" },
  { id: "MEM-1230", name: "Ashley Jackson", tier: "PLATINUM_ELITE", enrollmentDate: "2026-04-20", renewalDate: "2027-04-20", monthlyVisits: 11, avgSessionTime: 50, email: "ashley.j@email.com" },
];

const ITEMS_PER_PAGE = 8;

function nextMemberId(list: Member[]): string {
  const nums = list
    .map((m) => parseInt(m.id.replace(/^MEM-/, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const n = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `MEM-${n}`;
}

function addMonthsIso(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Fin del periodo permitido: alta + 1 año calendario (máx. renovación). */
function renewalWindowMaxIso(enrollmentIso: string): string {
  const d = new Date(enrollmentIso + "T12:00:00");
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function clampRenewalDate(enrollmentIso: string, renewalIso: string): string {
  const min = enrollmentIso;
  const max = renewalWindowMaxIso(enrollmentIso);
  if (renewalIso < min) return min;
  if (renewalIso > max) return max;
  return renewalIso;
}

/** Periodos de membresía hasta renovación: 1–12 meses desde la alta (tope: 1 año). */
function renewalAfterMonths(enrollmentIso: string, months: number): string {
  const capped = Math.min(12, Math.max(1, Math.floor(months)));
  const candidate = addMonthsIso(enrollmentIso, capped);
  return clampRenewalDate(enrollmentIso, candidate);
}

const emptyNewMemberForm = () => {
  const today = new Date().toISOString().slice(0, 10);
  const enroll = today;
  return {
    name: "",
    email: "",
    tier: "GOLD" as Member["tier"],
    enrollmentDate: enroll,
    renewalDate: renewalAfterMonths(enroll, 6),
    monthlyVisits: "0",
    avgSessionTime: "60",
    enrollFaceId: true,
    faceIdTerminal: "TRN-MAIN-01",
  };
};

export default function Members() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState(emptyNewMemberForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTier, setFilterTier] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [paymentModalMember, setPaymentModalMember] = useState<Member | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "89.99",
    concept: "MEMBERSHIP" as "MEMBERSHIP" | "RENEWAL" | "OTHER",
    method: "CARD" as "CASH" | "CARD" | "QR",
  });
  const [paymentsTick, setPaymentsTick] = useState(0);
  const [savingNewMember, setSavingNewMember] = useState(false);

  // Filter members
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTier = filterTier === "ALL" || member.tier === filterTier;

    return matchesSearch && matchesTier;
  });

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentMembers = filteredMembers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const paymentsForExpanded = useMemo(() => {
    if (!expandedMember) return [];
    void paymentsTick;
    return getPaymentsForMember(expandedMember);
  }, [expandedMember, paymentsTick]);

  const openPaymentModal = (member: Member) => {
    setPaymentModalMember(member);
    setPaymentForm((f) => ({ ...f, amount: "89.99" }));
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalMember) return;
    const amount = parseFloat(paymentForm.amount);
    if (Number.isNaN(amount) || amount <= 0) return;
    addMembershipPayment({
      memberId: paymentModalMember.id,
      amount,
      concept: paymentForm.concept,
      method: paymentForm.method,
    });
    setPaymentModalMember(null);
    setPaymentsTick((t) => t + 1);
  };

  const openAddMemberModal = () => {
    setNewMemberForm(emptyNewMemberForm());
    setShowAddMemberModal(true);
  };

  const submitNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newMemberForm.name.trim();
    const email = newMemberForm.email.trim().toLowerCase();
    if (!name || !email) {
      toast.error("Nombre y correo son obligatorios.");
      return;
    }
    if (members.some((m) => m.email.toLowerCase() === email)) {
      toast.error("Ya existe un miembro con ese correo.");
      return;
    }
    const enroll = newMemberForm.enrollmentDate;
    const renew = newMemberForm.renewalDate;
    const renewMax = renewalWindowMaxIso(enroll);
    if (renew < enroll || renew > renewMax) {
      toast.error("La renovación debe estar entre la fecha de alta y como máximo un año después.");
      return;
    }
    const visits = Math.max(0, parseInt(newMemberForm.monthlyVisits, 10) || 0);
    const avgMin = Math.max(0, parseInt(newMemberForm.avgSessionTime, 10) || 0);
    const id = nextMemberId(members);

    let faceIdTemplateId: string | undefined;
    let faceIdEnrolled = false;

    if (newMemberForm.enrollFaceId) {
      setSavingNewMember(true);
      try {
        const res = await mockFaceIdEnroll({
          terminalId: newMemberForm.faceIdTerminal,
          memberId: id,
          displayName: name,
        });
        faceIdTemplateId = res.templateId;
        faceIdEnrolled = true;
      } catch {
        toast.warning("No se vinculó el rostro", {
          description: "Complete el alta FaceID desde Access Control cuando el lector esté disponible.",
        });
      } finally {
        setSavingNewMember(false);
      }
    }

    const row: Member = {
      id,
      name,
      email,
      tier: newMemberForm.tier,
      enrollmentDate: newMemberForm.enrollmentDate,
      renewalDate: newMemberForm.renewalDate,
      monthlyVisits: visits,
      avgSessionTime: avgMin,
      faceIdEnrolled,
      faceIdTemplateId,
    };
    setMembers((prev) => [row, ...prev]);
    setShowAddMemberModal(false);
    setExpandedMember(id);
    setCurrentPage(1);
    setSearchTerm("");
    setFilterTier("ALL");
    toast.success("Miembro registrado", {
      description:
        newMemberForm.enrollFaceId && faceIdEnrolled
          ? `${name} · ${id} · Rostro registrado`
          : `${name} · ${id}`,
    });
  };

  return (
    <div className="h-full bg-[#131313] p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] md:tracking-[3px] uppercase mb-2">
          Member_Database_System
        </p>
        <h1 className="text-[#e5e2e1] text-[32px] md:text-[48px] font-black tracking-[-2px] uppercase">
          Members
        </h1>
      </div>

      {/* Members List */}
      <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase">
            Members_Directory
          </p>
          <div className="flex items-center gap-3">
            <span className="text-[#808080] text-[10px]">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredMembers.length)} of {filteredMembers.length}
            </span>
            <button
              type="button"
              onClick={openAddMemberModal}
              className="bg-[#e31e24] text-white px-4 py-2 flex items-center gap-2 text-[10px] font-bold tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors"
            >
              <UserPlus size={14} />
              Add Member
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Search Bar */}
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#808080]" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name, ID or email..."
                className="w-full bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] pl-10 pr-4 py-2.5 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif] text-[12px]"
              />
            </div>
          </div>

          {/* Tier Filter */}
          <div>
            <select
              value={filterTier}
              onChange={(e) => handleFilterChange(setFilterTier, e.target.value)}
              className="w-full bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-2.5 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif] text-[12px]"
            >
              <option value="ALL">All Tiers</option>
              <option value="ELITE_BLK">ELITE_BLK</option>
              <option value="PLATINUM_ELITE">PLATINUM_ELITE</option>
              <option value="GOLD">GOLD</option>
              <option value="BASIC">BASIC</option>
            </select>
          </div>
        </div>

        <p className="text-[#5a5a5a] text-[9px] mb-4 leading-relaxed flex flex-wrap gap-x-4 gap-y-1">
          <span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00c853] align-middle mr-1.5" />
            OK (&gt;90d)
          </span>
          <span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ffeb3b] align-middle mr-1.5" />
            31–90d
          </span>
          <span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ffa726] align-middle mr-1.5" />
            8–30d
          </span>
          <span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff5722] align-middle mr-1.5" />
            ≤7d
          </span>
          <span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#e31e24] align-middle mr-1.5" />
            Vencida
          </span>
        </p>

        {/* Members Table */}
        <div className="space-y-1 overflow-x-auto">
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-12 gap-4 pb-3 border-b border-[rgba(93,63,60,0.2)] min-w-[940px]">
            <div className="col-span-1">
              <span className="text-[#808080] text-[9px] font-bold tracking-[1px] uppercase">ID</span>
            </div>
            <div className="col-span-3">
              <span className="text-[#808080] text-[9px] font-bold tracking-[1px] uppercase">Member Name</span>
            </div>
            <div className="col-span-2">
              <span className="text-[#808080] text-[9px] font-bold tracking-[1px] uppercase">Tier</span>
            </div>
            <div className="col-span-2">
              <span className="text-[#808080] text-[9px] font-bold tracking-[1px] uppercase">Enrollment</span>
            </div>
            <div className="col-span-3">
              <span className="text-[#808080] text-[9px] font-bold tracking-[1px] uppercase">Renewal · vigencia</span>
            </div>
            <div className="col-span-1 text-center">
              <span className="text-[#808080] text-[9px] font-bold tracking-[1px] uppercase">Visits</span>
            </div>
          </div>

          {/* Table Rows */}
          {currentMembers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[#808080] text-[14px]">No members found</p>
            </div>
          ) : (
            currentMembers.map((member) => (
              <div key={member.id}>
                {/* Member Row - Desktop */}
                <div
                  onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
                  className="hidden lg:grid grid-cols-12 gap-4 py-3 border-b border-[rgba(93,63,60,0.05)] hover:bg-[#131313] transition-colors cursor-pointer min-w-[940px]"
                >
                  <div className="col-span-1 flex items-center gap-2">
                    {expandedMember === member.id ? (
                      <ChevronUp size={14} className="text-[#e31e24]" />
                    ) : (
                      <ChevronDown size={14} className="text-[#808080]" />
                    )}
                    <span className="text-[#808080] text-[10px] font-mono">{member.id}</span>
                  </div>
                  <div className="col-span-3 flex flex-col justify-center">
                    <span className="text-[#e5e2e1] text-[14px] font-bold">{member.name}</span>
                    <span className="text-[#808080] text-[9px]">{member.email}</span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-[#e31e24] text-[10px] tracking-[1px] uppercase font-bold">
                      {member.tier}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-[#e5e2e1] text-[11px]">
                      {new Date(member.enrollmentDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="col-span-3 flex flex-col justify-center gap-1.5">
                    <span className="text-[#e5e2e1] text-[11px]">
                      {new Date(member.renewalDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <MemberExpiryIndicator member={member} />
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-[#e5e2e1] text-[12px] font-bold">{member.monthlyVisits}</span>
                  </div>
                </div>

                {/* Member Row - Mobile */}
                <div
                  onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
                  className="lg:hidden p-4 border-b border-[rgba(93,63,60,0.05)] bg-[#131313] hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {expandedMember === member.id ? (
                          <ChevronUp size={14} className="text-[#e31e24]" />
                        ) : (
                          <ChevronDown size={14} className="text-[#808080]" />
                        )}
                        <span className="text-[#808080] text-[10px] font-mono">{member.id}</span>
                      </div>
                      <span className="text-[#e5e2e1] text-[14px] font-bold block">{member.name}</span>
                      <span className="text-[#808080] text-[9px] block">{member.email}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <MemberExpiryIndicator member={member} compact />
                  </div>
                  <div className="flex items-center justify-between text-[10px] mt-2">
                    <span className="text-[#e31e24] font-bold tracking-[1px] uppercase">{member.tier}</span>
                    <span className="text-[#808080]">{member.monthlyVisits} visits</span>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedMember === member.id && (
                  <div className="bg-[#131313] border-b border-[rgba(93,63,60,0.05)] p-4 md:p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => openPaymentModal(member)}
                        className="inline-flex items-center justify-center gap-2 bg-[#e31e24] text-white px-4 py-2.5 text-[10px] font-bold tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors"
                      >
                        <Wallet size={14} />
                        Registrar pago
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          navigate("/pos", {
                            state: {
                              memberId: member.id,
                              memberName: member.name,
                            },
                          })
                        }
                        className="inline-flex items-center justify-center gap-2 bg-[#0e0e0e] border border-[rgba(93,63,60,0.25)] text-[#e5e2e1] px-4 py-2.5 text-[10px] font-bold tracking-[1px] uppercase hover:border-[#e31e24] transition-colors"
                      >
                        <ShoppingCart size={14} />
                        Vender en POS
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      {/* Tier Recognition */}
                      <div className="bg-[#2a2a2a] border border-[rgba(93,63,60,0.05)] p-6">
                        <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] mb-2">
                          TIER_RECOGNITION
                        </p>
                        <h2 className="text-white text-[30px] font-black mb-2">{member.tier}</h2>
                        <p className="text-[#e7bdb8] text-[12px] mb-6">
                          {member.tier === "ELITE_BLK" && "Full access to technical recovery and high-impact zones."}
                          {member.tier === "PLATINUM_ELITE" && "Premium access to all facilities and priority support."}
                          {member.tier === "GOLD" && "Extended hours and group class access."}
                          {member.tier === "BASIC" && "Standard gym access during regular hours."}
                        </p>
                        <div className="pt-4 border-t border-[rgba(93,63,60,0.1)]">
                          <p className="text-[#393939] text-[9px] font-bold mb-1">RENEWAL_DATE</p>
                          <p className="text-white text-[14px] font-black uppercase">
                            {new Date(member.renewalDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }).replace(/,/g, '_').replace(/ /g, '_').toUpperCase()}
                          </p>
                        </div>
                        <div className="pt-4 mt-3 border-t border-[rgba(93,63,60,0.08)]">
                          <p className="text-[#e31e24] text-[9px] font-bold tracking-[1.5px] uppercase mb-3">
                            Vigencia · expiración
                          </p>
                          <MemberExpiryIndicator member={member} />
                        </div>
                      </div>

                      {/* Biometric Enrollment */}
                      <div className="bg-[#2a2a2a] border border-[rgba(93,63,60,0.05)] p-6">
                        <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] mb-4">
                          SEC_ENROLLMENT
                        </p>
                        <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] aspect-square mb-4 flex items-center justify-center">
                          <img
                            src={imgMemberProfile}
                            alt="Member Profile"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-[#808080]">FACE_ID_STATUS</span>
                            <span
                              className={`font-bold ${
                                member.faceIdEnrolled === false
                                  ? "text-[#ffa500]"
                                  : "text-[#00ff00]"
                              }`}
                            >
                              {member.faceIdEnrolled === false ? "PENDIENTE" : "ENROLLED"}
                            </span>
                          </div>
                          {member.faceIdTemplateId && (
                            <div className="flex justify-between text-[10px] gap-2">
                              <span className="text-[#808080] shrink-0">TEMPLATE</span>
                              <span className="text-[#393939] font-mono text-[9px] text-right break-all">
                                {member.faceIdTemplateId}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-[10px]">
                            <span className="text-[#808080]">ÚLT_SYNC</span>
                            <span className="text-[#e5e2e1] font-bold">
                              {member.faceIdEnrolled === false ? "—" : "Activo"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Activity Stats */}
                      <div className="bg-[#2a2a2a] border border-[rgba(93,63,60,0.05)] p-6">
                        <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
                          Activity_Stats
                        </p>
                        <div className="space-y-4">
                          <div>
                            <p className="text-[#808080] text-[10px] mb-1">MONTHLY VISITS</p>
                            <p className="text-[#e5e2e1] text-[24px] font-black">{member.monthlyVisits}</p>
                          </div>
                          <div>
                            <p className="text-[#808080] text-[10px] mb-1">AVG SESSION TIME</p>
                            <p className="text-[#e5e2e1] text-[24px] font-black">{member.avgSessionTime} MIN</p>
                          </div>
                          <div>
                            <p className="text-[#808080] text-[10px] mb-1">MEMBER SINCE</p>
                            <p className="text-[#e5e2e1] text-[14px] font-black">
                              {new Date(member.enrollmentDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short'
                              }).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment history — demo store */}
                    <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 md:p-6">
                      <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
                        Historial de pagos (membresía)
                      </p>
                      {paymentsForExpanded.length === 0 ? (
                        <p className="text-[#808080] text-[12px]">Sin pagos registrados en demo.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px]">
                            <thead>
                              <tr className="text-[#808080] uppercase border-b border-[rgba(93,63,60,0.2)]">
                                <th className="pb-2 pr-4">Fecha</th>
                                <th className="pb-2 pr-4">Concepto</th>
                                <th className="pb-2 pr-4">Método</th>
                                <th className="pb-2 text-right">Monto</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paymentsForExpanded.map((p) => (
                                <tr key={p.id} className="border-b border-[rgba(93,63,60,0.06)] text-[#e5e2e1]">
                                  <td className="py-2 pr-4 font-mono text-[#808080]">
                                    {new Date(p.dateIso).toLocaleString("es-MX", {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    })}
                                  </td>
                                  <td className="py-2 pr-4">{p.concept}</td>
                                  <td className="py-2 pr-4">{p.method}</td>
                                  <td className="py-2 text-right font-bold">${p.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-[rgba(93,63,60,0.1)]">
            <div className="text-[#808080] text-[10px]">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`flex items-center gap-1 px-3 py-2 text-[10px] font-bold tracking-[1px] uppercase transition-colors ${
                  currentPage === 1
                    ? "bg-[#1a1a1a] text-[#393939] cursor-not-allowed"
                    : "bg-[#131313] text-[#e5e2e1] border border-[rgba(93,63,60,0.2)] hover:border-[#e31e24]"
                }`}
              >
                <ChevronLeft size={14} />
                Prev
              </button>

              {/* Page Numbers */}
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-[10px] font-bold transition-colors ${
                      currentPage === page
                        ? "bg-[#e31e24] text-white"
                        : "bg-[#131313] text-[#e5e2e1] border border-[rgba(93,63,60,0.2)] hover:border-[#e31e24]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-1 px-3 py-2 text-[10px] font-bold tracking-[1px] uppercase transition-colors ${
                  currentPage === totalPages
                    ? "bg-[#1a1a1a] text-[#393939] cursor-not-allowed"
                    : "bg-[#131313] text-[#e5e2e1] border border-[rgba(93,63,60,0.2)] hover:border-[#e31e24]"
                }`}
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {paymentModalMember && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#131313] border border-[rgba(93,63,60,0.2)] p-6 md:p-8 max-w-md w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
                  Registro de pago
                </p>
                <h3 className="text-[#e5e2e1] text-[20px] font-black uppercase leading-tight">
                  {paymentModalMember.name}
                </h3>
                <p className="text-[#808080] text-[11px] font-mono mt-1">{paymentModalMember.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalMember(null)}
                className="text-[#808080] hover:text-[#e31e24] transition-colors"
                aria-label="Cerrar"
              >
                <X size={22} />
              </button>
            </div>
            <form onSubmit={submitPayment} className="space-y-4">
              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  Monto (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none font-['Space_Grotesk',sans-serif]"
                  required
                />
              </div>
              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  Concepto
                </label>
                <select
                  value={paymentForm.concept}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      concept: e.target.value as typeof paymentForm.concept,
                    })
                  }
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none"
                >
                  <option value="MEMBERSHIP">Membresía</option>
                  <option value="RENEWAL">Renovación</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  Método
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      method: e.target.value as typeof paymentForm.method,
                    })
                  }
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none"
                >
                  <option value="CARD">Tarjeta</option>
                  <option value="CASH">Efectivo</option>
                  <option value="QR">QR</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalMember(null)}
                  className="flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#1a1a1a] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[55] p-4 overflow-y-auto">
          <div className="bg-[#131313] border border-[rgba(93,63,60,0.2)] p-6 md:p-8 max-w-lg w-full my-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
                  Nuevo miembro
                </p>
                <h3 className="text-[#e5e2e1] text-[22px] font-black uppercase tracking-tight">
                  Alta en directorio
                </h3>
                <p className="text-[#808080] text-[11px] mt-2 leading-relaxed">
                  ID asignado: <span className="text-[#e5e2e1] font-mono font-bold">{nextMemberId(members)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="text-[#808080] hover:text-[#e31e24] transition-colors shrink-0"
                aria-label="Cerrar"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={submitNewMember} className="space-y-4">
              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={newMemberForm.name}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                  placeholder="Ej. Ana García"
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none font-['Space_Grotesk',sans-serif] text-[13px]"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={newMemberForm.email}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none font-['Space_Grotesk',sans-serif] text-[13px]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  Plan (tier)
                </label>
                <select
                  value={newMemberForm.tier}
                  onChange={(e) =>
                    setNewMemberForm({
                      ...newMemberForm,
                      tier: e.target.value,
                    })
                  }
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none text-[13px]"
                >
                  <option value="ELITE_BLK">ELITE_BLK</option>
                  <option value="PLATINUM_ELITE">PLATINUM_ELITE</option>
                  <option value="GOLD">GOLD</option>
                  <option value="BASIC">BASIC</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                    Alta (enrollment)
                  </label>
                  <input
                    type="date"
                    value={newMemberForm.enrollmentDate}
                    onChange={(e) => {
                      const ed = e.target.value;
                      setNewMemberForm((f) => ({
                        ...f,
                        enrollmentDate: ed,
                        renewalDate: clampRenewalDate(ed, f.renewalDate),
                      }));
                    }}
                    className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none text-[13px] [color-scheme:dark]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                    Renovación
                  </label>
                  <input
                    type="date"
                    min={newMemberForm.enrollmentDate}
                    max={renewalWindowMaxIso(newMemberForm.enrollmentDate)}
                    value={newMemberForm.renewalDate}
                    onChange={(e) =>
                      setNewMemberForm((f) => ({
                        ...f,
                        renewalDate: clampRenewalDate(f.enrollmentDate, e.target.value),
                      }))
                    }
                    className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none text-[13px] [color-scheme:dark]"
                    required
                  />
                  <p className="text-[#393939] text-[9px] mt-1.5 leading-snug">
                    Permitido: desde la fecha de alta hasta {renewalWindowMaxIso(newMemberForm.enrollmentDate)} (máx. 1 año).
                  </p>
                </div>
              </div>

              <div>
                <p className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  Duración del periodo (hasta renovación)
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { m: 1, label: "1 mes" },
                      { m: 3, label: "3 meses" },
                      { m: 6, label: "6 meses" },
                      { m: 12, label: "12 meses" },
                    ] as const
                  ).map(({ m, label }) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        setNewMemberForm((f) => ({
                          ...f,
                          renewalDate: renewalAfterMonths(f.enrollmentDate, m),
                        }))
                      }
                      className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide bg-[#0e0e0e] border border-[rgba(93,63,60,0.25)] text-[#e5e2e1] hover:border-[#e31e24] hover:text-white transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                    Visitas / mes
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMemberForm.monthlyVisits}
                    onChange={(e) =>
                      setNewMemberForm({ ...newMemberForm, monthlyVisits: e.target.value })
                    }
                    className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                    Sesión prom. (min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMemberForm.avgSessionTime}
                    onChange={(e) =>
                      setNewMemberForm({ ...newMemberForm, avgSessionTime: e.target.value })
                    }
                    className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none text-[13px]"
                  />
                </div>
              </div>

              <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.15)] p-4 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={newMemberForm.enrollFaceId}
                    onChange={(e) =>
                      setNewMemberForm({ ...newMemberForm, enrollFaceId: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 accent-[#e31e24] rounded border-[rgba(93,63,60,0.4)]"
                  />
                  <div>
                    <span className="flex items-center gap-2 text-[#e5e2e1] text-[12px] font-bold">
                      <ScanFace size={16} className="text-[#e31e24] shrink-0" />
                      Dar de alta en FaceID
                    </span>
                    <p className="text-[#808080] text-[10px] mt-1 leading-relaxed">
                      Registra la plantilla facial al guardar, usando el terminal de acceso seleccionado.
                    </p>
                  </div>
                </label>
                {newMemberForm.enrollFaceId && (
                  <div>
                    <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                      Terminal para captura
                    </label>
                    <select
                      value={newMemberForm.faceIdTerminal}
                      onChange={(e) =>
                        setNewMemberForm({ ...newMemberForm, faceIdTerminal: e.target.value })
                      }
                      className="w-full bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-2.5 focus:border-[#e31e24] focus:outline-none text-[12px]"
                    >
                      <option value="TRN-MAIN-01">TRN-MAIN-01 — Entrada principal</option>
                      <option value="TRN-MAIN-02">TRN-MAIN-02 — Entrada lateral</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-[rgba(93,63,60,0.15)]">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  disabled={savingNewMember}
                  className="flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNewMember}
                  className="flex-1 bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingNewMember ? <Loader2 className="animate-spin" size={16} /> : null}
                  Guardar miembro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
