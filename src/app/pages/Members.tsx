import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import imgMemberProfile from "../../imports/PerfilDeMiembroGestion/3b634f4a9044fcdaee9556d934e90fbcffd448af.png";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Wallet,
  X,
  ScanFace,
  Loader2,
  Camera,
  Upload,
  IdCard,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { addClientUseCase, listClientsUseCase } from "../core/catalog";
import {
  getSubscriptionPrice,
  type SubscriptionPeriodKey,
} from "../lib/plansStore";
import { useAuth } from "../context/AuthContext";
import { addMembershipPayment, getPaymentsForMember } from "../lib/demoStore";
import { getGymPosService } from "../config/gymPosService";
import {
  PosTicketModal,
  DEFAULT_LABELS,
  buildSubscriptionReceipt,
  type PosTicketReceipt,
  type SubscriptionConcept,
} from "@/features/pos";
import {
  loadMembers,
  saveMembers,
  type Member,
} from "../lib/membersStore";
import { mockFaceIdEnroll } from "../lib/thirdPartyMocks";

type ExpiryUrgency = "expired" | "critical" | "warning" | "notice" | "ok";

function memberFullName(m: Pick<Member, "firstName" | "lastName">): string {
  return `${m.firstName} ${m.lastName}`.trim();
}

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

function whatsAppHref(phone: string): string {
  const d = normalizePhoneDigits(phone);
  return d ? `https://wa.me/${d}` : "";
}

/** Prefijo telefónico internacional (solo dígitos, sin +). México por defecto en el formulario. */
const PHONE_COUNTRY_PREFIXES = [
  { dial: "52", country: "México" },
  { dial: "1", country: "EE.UU. / Canadá" },
  { dial: "34", country: "España" },
  { dial: "54", country: "Argentina" },
  { dial: "57", country: "Colombia" },
  { dial: "51", country: "Perú" },
] as const;

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

function subscriptionPeriodDays(member: Pick<Member, "enrollmentDate" | "renewalDate">): number {
  const start = new Date(member.enrollmentDate + "T12:00:00").getTime();
  const end = new Date(member.renewalDate + "T12:00:00").getTime();
  if (end <= start) return 1;
  return Math.round((end - start) / 86400000);
}

const LEGACY_TIER_LABELS = new Set(["ELITE_BLK", "PLATINUM_ELITE", "GOLD", "BASIC", "INACTIVE"]);

/** Nombre del plan contratado cuando está disponible (no etiquetas legacy de tier). */
function memberPlanLabel(tier: string): string | null {
  const t = tier.trim();
  if (!t || LEGACY_TIER_LABELS.has(t)) return null;
  return t;
}

function getExpiryLevel(renewalDateIso: string): ExpiryUrgency {
  return getExpiryMeta(renewalDateIso).level;
}

function memberInitials(member: Pick<Member, "firstName" | "lastName">): string {
  const a = member.firstName.trim()[0] ?? "";
  const b = member.lastName.trim()[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

function expiryAvatarClass(level: ExpiryUrgency): string {
  switch (level) {
    case "expired":
      return "bg-[#e31e24]/25 text-[#ff6b6b] ring-1 ring-[#e31e24]/40";
    case "critical":
      return "bg-[#ff5722]/20 text-[#ffab91] ring-1 ring-[#ff5722]/35";
    case "warning":
      return "bg-[#ffa726]/18 text-[#ffcc80] ring-1 ring-[#ffa726]/35";
    case "notice":
      return "bg-[#fdd835]/12 text-[#fff59d] ring-1 ring-[#fdd835]/30";
    default:
      return "bg-[#00c853]/12 text-[#69f0ae] ring-1 ring-[#00c853]/30";
  }
}

function expiryRowBorderClass(level: ExpiryUrgency, expanded: boolean): string {
  if (expanded) return "border-l-[#e31e24]";
  switch (level) {
    case "expired":
      return "border-l-[#e31e24]/90";
    case "critical":
      return "border-l-[#ff5722]/75";
    case "warning":
      return "border-l-[#ffa726]/60";
    case "notice":
      return "border-l-[#fdd835]/45";
    default:
      return "border-l-transparent";
  }
}

type ExpiryFilter = ExpiryUrgency | "ALL";

const EXPIRY_FILTER_OPTIONS: {
  value: ExpiryFilter;
  label: string;
  shortLabel: string;
  dotClass: string;
}[] = [
  { value: "ALL", label: "Todos", shortLabel: "Todos", dotClass: "bg-[#808080]" },
  { value: "expired", label: "Vencida", shortLabel: "Vencida", dotClass: "bg-[#e31e24]" },
  { value: "critical", label: "≤7 días", shortLabel: "≤7d", dotClass: "bg-[#ff5722]" },
  { value: "warning", label: "8–30 días", shortLabel: "8–30d", dotClass: "bg-[#ffa726]" },
  { value: "notice", label: "31–90 días", shortLabel: "31–90d", dotClass: "bg-[#ffeb3b]" },
  { value: "ok", label: "OK (>90 días)", shortLabel: ">90d", dotClass: "bg-[#00c853]" },
];

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

function formatRenewalDate(renewalDateIso: string): string {
  return new Date(renewalDateIso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MemberExpiryIndicator({
  member,
  layout = "stack",
}: {
  member: Member;
  /** compact: solo pill · stack: vertical · twoRow: fecha+estado / barra+periodo */
  layout?: "compact" | "stack" | "twoRow";
}) {
  const meta = getExpiryMeta(member.renewalDate);
  const progress = membershipPeriodProgress(member.enrollmentDate, member.renewalDate);
  const pct = Math.round(progress * 100);
  const tooltip = `Vigencia: ${meta.label}. Periodo membresía ~${pct}% transcurrido (alta → renovación).`;

  const pill = (
    <span
      className={`inline-flex items-center w-fit max-w-full px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wide leading-tight shrink-0 ${urgencyPillClass(
        meta.level
      )}`}
    >
      {meta.label}
    </span>
  );

  const progressBlock = (
    <div className="flex flex-col gap-1 w-full min-w-0">
      <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden w-full">
        <div
          className={`h-full rounded-full transition-[width] ${urgencyBarClass(meta.level)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[8px] text-[#5a5a5a] uppercase tracking-wide truncate">
        Periodo {pct}% · hasta renovación
      </span>
    </div>
  );

  if (layout === "compact") {
    return (
      <span
        className={`inline-flex items-center max-w-full px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wide leading-tight ${urgencyPillClass(meta.level)}`}
        title={tooltip}
      >
        {meta.label}
      </span>
    );
  }

  if (layout === "twoRow") {
    return (
      <div
        className="grid grid-rows-2 gap-1.5 w-full min-w-0"
        title={tooltip}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 min-w-0">
          <span className="text-[#e5e2e1] text-[11px] whitespace-nowrap shrink-0">
            {formatRenewalDate(member.renewalDate)}
          </span>
          {pill}
        </div>
        {progressBlock}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-0 w-full max-w-[220px] sm:max-w-none" title={tooltip}>
      {pill}
      {progressBlock}
    </div>
  );
}

const ITEMS_PER_PAGE = 8;

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

/** Periodos de membresía hasta renovación (tope: 1 año desde la alta). */
function renewalAfterPeriod(
  enrollmentIso: string,
  period: { days?: number; weeks?: number; months?: number },
): string {
  const d = new Date(enrollmentIso + "T12:00:00");
  if (period.days) d.setDate(d.getDate() + period.days);
  else if (period.weeks) d.setDate(d.getDate() + period.weeks * 7);
  else if (period.months) d.setMonth(d.getMonth() + period.months);
  return clampRenewalDate(enrollmentIso, d.toISOString().slice(0, 10));
}

function renewalAfterMonths(enrollmentIso: string, months: number): string {
  return renewalAfterPeriod(enrollmentIso, { months });
}

const DEFAULT_MEMBER_PLAN_ID = 1;

const SUBSCRIPTION_PERIOD_OPTIONS = [
  { key: "1d" as const, label: "1 día", period: { days: 1 } },
  { key: "1w" as const, label: "1 semana", period: { weeks: 1 } },
  { key: "1m" as const, label: "1 mes", period: { months: 1 } },
  { key: "3m" as const, label: "3 meses", period: { months: 3 } },
  { key: "6m" as const, label: "6 meses", period: { months: 6 } },
  { key: "12m" as const, label: "12 meses", period: { months: 12 } },
];

function applySubscriptionPeriod(
  enrollmentIso: string,
  periodKey: SubscriptionPeriodKey | null,
): { renewalDate: string; cost: string } {
  const key = periodKey ?? "1m";
  const opt = SUBSCRIPTION_PERIOD_OPTIONS.find((p) => p.key === key);
  if (!opt) {
    return {
      renewalDate: renewalAfterMonths(enrollmentIso, 1),
      cost: getSubscriptionPrice("1m").toFixed(2),
    };
  }
  return {
    renewalDate: renewalAfterPeriod(enrollmentIso, opt.period),
    cost: getSubscriptionPrice(key).toFixed(2),
  };
}

const emptyNewMemberForm = () => {
  const today = new Date().toISOString().slice(0, 10);
  const defaultPeriod: SubscriptionPeriodKey = "1m";
  const { renewalDate, cost } = applySubscriptionPeriod(today, defaultPeriod);
  return {
    firstName: "",
    lastName: "",
    email: "",
    phoneCountryDial: "52",
    phoneNational: "",
    emergencyPhoneNational: "",
    planID: DEFAULT_MEMBER_PLAN_ID,
    selectedPeriodKey: defaultPeriod as SubscriptionPeriodKey | null,
    subscriptionCost: cost,
    payNow: true,
    paymentMethod: "CARD" as "CASH" | "CARD" | "QR",
    enrollmentDate: today,
    renewalDate,
    enrollFaceId: true,
    faceIdTerminal: "TRN-MAIN-01",
    address: "",
    idDocumentDataUrl: null as string | null,
  };
};

export default function Members() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersFromApi, setMembersFromApi] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState(emptyNewMemberForm());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterExpiry, setFilterExpiry] = useState<ExpiryFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [paymentModalMember, setPaymentModalMember] = useState<Member | null>(null);
  const [subscriptionTicketReceipt, setSubscriptionTicketReceipt] =
    useState<PosTicketReceipt | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "89.99",
    concept: "MEMBERSHIP" as "MEMBERSHIP" | "RENEWAL" | "OTHER",
    method: "CARD" as "CASH" | "CARD" | "QR",
  });
  const [paymentsTick, setPaymentsTick] = useState(0);

  const refreshMembersFromApi = async () => {
    if (!isAuthenticated) {
      setMembers([]);
      setMembersFromApi(false);
      setMembersLoading(false);
      return;
    }

    setMembersLoading(true);
    const result = await listClientsUseCase();
    if (result.ok) {
      setMembers(result.members);
      saveMembers(result.members);
      setMembersFromApi(true);
    } else {
      const cached = loadMembers();
      setMembers(cached);
      setMembersFromApi(false);
      if (cached.length === 0) {
        toast.error("No se pudo cargar la lista de miembros", {
          description: result.message,
        });
      } else {
        toast.warning("Sin conexión; mostrando última copia guardada", {
          description: result.message,
        });
      }
    }
    setMembersLoading(false);
  };

  useEffect(() => {
    void refreshMembersFromApi();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!membersFromApi) {
      saveMembers(members);
    }
  }, [members, membersFromApi]);
  const [savingNewMember, setSavingNewMember] = useState(false);
  const [phonePrefixMenuOpen, setPhonePrefixMenuOpen] = useState(false);
  const phonePrefixRef = useRef<HTMLDivElement>(null);
  const [showIdCameraModal, setShowIdCameraModal] = useState(false);
  const [idCameraStarting, setIdCameraStarting] = useState(false);
  const idFileInputRef = useRef<HTMLInputElement>(null);
  const idVideoRef = useRef<HTMLVideoElement>(null);
  const idCameraStreamRef = useRef<MediaStream | null>(null);

  const stopIdCameraStream = () => {
    idCameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    idCameraStreamRef.current = null;
    const v = idVideoRef.current;
    if (v) v.srcObject = null;
  };

  useEffect(() => {
    if (!showAddMemberModal) setPhonePrefixMenuOpen(false);
  }, [showAddMemberModal]);

  useEffect(() => {
    if (!phonePrefixMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (phonePrefixRef.current && !phonePrefixRef.current.contains(e.target as Node)) {
        setPhonePrefixMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [phonePrefixMenuOpen]);

  useEffect(() => {
    if (!showAddMemberModal) setShowIdCameraModal(false);
  }, [showAddMemberModal]);

  useEffect(() => {
    return () => stopIdCameraStream();
  }, []);

  useEffect(() => {
    if (!showIdCameraModal) return;

    let cancelled = false;

    const start = async () => {
      if (!window.isSecureContext) {
        toast.error("La cámara requiere HTTPS o http://localhost", {
          description: "Abre la app en localhost o con certificado SSL, o usa Importar imagen.",
        });
        setShowIdCameraModal(false);
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Este navegador no expone la cámara desde la web", {
          description: "Usa Importar imagen o prueba con Chrome / Safari actualizado.",
        });
        setShowIdCameraModal(false);
        return;
      }

      setIdCameraStarting(true);
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        idCameraStreamRef.current = stream;
        const el = idVideoRef.current;
        if (el) {
          el.srcObject = stream;
          await el.play().catch(() => {});
        }
      } catch {
        if (!cancelled) {
          toast.error("No se pudo usar la cámara", {
            description: "Revisa permisos del sitio en el navegador o usa Importar imagen.",
          });
          setShowIdCameraModal(false);
        }
      } finally {
        if (!cancelled) setIdCameraStarting(false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopIdCameraStream();
    };
  }, [showIdCameraModal]);

  const captureIdPhotoFromStream = () => {
    const video = idVideoRef.current;
    if (!video?.videoWidth) {
      toast.error("Espera un momento a que arranque la cámara.");
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
    const maxBytes = 6 * 1024 * 1024;
    if (approxBytes > maxBytes) {
      toast.error("La foto es demasiado grande; intenta menos zoom o mejor luz.");
      return;
    }
    setNewMemberForm((f) => ({ ...f, idDocumentDataUrl: dataUrl }));
    toast.success("Foto capturada");
    setShowIdCameraModal(false);
    stopIdCameraStream();
  };

  const handleIdDocumentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen (JPG, PNG, etc.).");
      return;
    }
    const maxBytes = 6 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("La imagen debe pesar menos de 6 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setNewMemberForm((f) => ({ ...f, idDocumentDataUrl: dataUrl }));
      toast.success("Identificación adjunta al expediente de alta.");
    };
    reader.onerror = () => toast.error("No se pudo leer la imagen.");
    reader.readAsDataURL(file);
  };

  // Filter members
  const searchMatchedMembers = useMemo(() => {
    const q = searchTerm.toLowerCase();
    const qCompact = q.replace(/\s/g, "");
    const qPhoneDigits = normalizePhoneDigits(searchTerm);

    return members.filter((member) => {
      const addr = (member.address ?? "").toLowerCase();
      const emailLower = (member.email ?? "").toLowerCase();
      const phoneDigits = normalizePhoneDigits(member.phone ?? "");
      const fullName = memberFullName(member).toLowerCase();

      return (
        fullName.includes(q) ||
        member.firstName.toLowerCase().includes(q) ||
        member.lastName.toLowerCase().includes(q) ||
        member.id.toLowerCase().includes(q) ||
        (emailLower && emailLower.includes(q)) ||
        (member.phone ?? "").toLowerCase().replace(/\s/g, "").includes(qCompact) ||
        (qPhoneDigits.length >= 4 && phoneDigits.includes(qPhoneDigits)) ||
        addr.includes(q)
      );
    });
  }, [members, searchTerm]);

  const expiryFilterCounts = useMemo(() => {
    const counts: Record<ExpiryFilter, number> = {
      ALL: searchMatchedMembers.length,
      expired: 0,
      critical: 0,
      warning: 0,
      notice: 0,
      ok: 0,
    };
    for (const member of searchMatchedMembers) {
      counts[getExpiryLevel(member.renewalDate)] += 1;
    }
    return counts;
  }, [searchMatchedMembers]);

  const filteredMembers = useMemo(() => {
    if (filterExpiry === "ALL") return searchMatchedMembers;
    return searchMatchedMembers.filter(
      (member) => getExpiryLevel(member.renewalDate) === filterExpiry,
    );
  }, [searchMatchedMembers, filterExpiry]);

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentMembers = filteredMembers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = <T,>(setter: (value: T) => void, value: T) => {
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

  const registerSubscriptionPayment = async (opts: {
    memberId: string;
    memberName: string;
    amount: number;
    method: "CASH" | "CARD" | "QR";
    concept: SubscriptionConcept;
    periodKey?: string | null;
  }): Promise<{ receipt: PosTicketReceipt; synced: boolean }> => {
    const checkoutInput = {
      memberId: opts.memberId,
      memberName: opts.memberName,
      amount: opts.amount,
      paymentMethod: opts.method,
      concept: opts.concept,
      periodKey: opts.periodKey ?? undefined,
    };
    try {
      const { receipt } =
        await getGymPosService().checkoutSubscription(checkoutInput);
      return { receipt, synced: true };
    } catch {
      addMembershipPayment({
        memberId: opts.memberId,
        amount: opts.amount,
        concept: opts.concept,
        method: opts.method,
      });
      return {
        receipt: buildSubscriptionReceipt(
          checkoutInput,
          `TKT-${Date.now().toString(36).toUpperCase()}`,
        ),
        synced: false,
      };
    }
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalMember) return;
    const amount = parseFloat(paymentForm.amount);
    if (Number.isNaN(amount) || amount <= 0) return;
    const { receipt, synced } = await registerSubscriptionPayment({
      memberId: paymentModalMember.id,
      memberName: memberFullName(paymentModalMember),
      amount,
      concept: paymentForm.concept,
      method: paymentForm.method,
    });
    if (synced) {
      toast.success("Pago de suscripción registrado");
    } else {
      toast.warning("Pago guardado localmente", {
        description:
          "No se pudo sincronizar con el POS API; quedó en almacén local.",
      });
    }
    setPaymentModalMember(null);
    setSubscriptionTicketReceipt(receipt);
    setPaymentsTick((t) => t + 1);
  };

  const openAddMemberModal = () => {
    setNewMemberForm(emptyNewMemberForm());
    setShowAddMemberModal(true);
  };

  const submitNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const firstName = newMemberForm.firstName.trim();
    const lastName = newMemberForm.lastName.trim();
    const fullName = memberFullName({ firstName, lastName });
    const emailRaw = newMemberForm.email.trim();
    const emailNorm = emailRaw.toLowerCase();
    const dial = newMemberForm.phoneCountryDial.trim();
    const national = newMemberForm.phoneNational.trim().replace(/\s+/g, " ");

    if (!firstName || !lastName || !national) {
      toast.error("Nombres, apellidos y número de teléfono son obligatorios.");
      return;
    }

    const localDigits = normalizePhoneDigits(national);
    if (!localDigits.length) {
      toast.error("Ingresa el número (sin repetir el prefijo del país).");
      return;
    }

    const fullDigits = `${dial}${localDigits}`;
    if (fullDigits.length < 11) {
      toast.error("El número parece incompleto. Revisa el prefijo del país y los dígitos.");
      return;
    }

    if (members.some((m) => normalizePhoneDigits(m.phone ?? "") === fullDigits)) {
      toast.error("Ya existe un miembro con ese número.");
      return;
    }

    const phoneForApi = localDigits;
    const phoneDisplay = `+${dial} ${national}`.replace(/\s+$/, "");
    if (emailNorm) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm);
      if (!emailOk) {
        toast.error("Correo no válido.");
        return;
      }
      if (members.some((m) => (m.email ?? "").toLowerCase() === emailNorm)) {
        toast.error("Ya existe un miembro con ese correo.");
        return;
      }
    }
    const enroll = newMemberForm.enrollmentDate;
    const renew = newMemberForm.renewalDate;
    const renewMax = renewalWindowMaxIso(enroll);
    if (renew < enroll || renew > renewMax) {
      toast.error("La renovación debe estar entre la fecha de alta y como máximo un año después.");
      return;
    }
    const paymentAmount = parseFloat(newMemberForm.subscriptionCost);
    if (newMemberForm.payNow && (Number.isNaN(paymentAmount) || paymentAmount <= 0)) {
      toast.error("Indica un costo de suscripción válido para registrar el pago.");
      return;
    }
    const addressTrim = newMemberForm.address.trim();
    const emergencyNational = newMemberForm.emergencyPhoneNational.trim().replace(/\s+/g, " ");
    if (emergencyNational) {
      const emergencyDigits = normalizePhoneDigits(emergencyNational);
      if (emergencyDigits.length < 10) {
        toast.error("El teléfono de emergencia parece incompleto.");
        return;
      }
    }
    setSavingNewMember(true);

    try {
      const apiResult = await addClientUseCase({
        firstName,
        lastName,
        email: emailNorm || undefined,
        phoneNumber: phoneForApi,
        phoneCodeNumber: dial,
        emergencyPhoneNumber: emergencyNational || undefined,
        emergencyPhoneCodeNumber: emergencyNational ? dial : undefined,
        fullAddress: addressTrim || undefined,
        planID: DEFAULT_MEMBER_PLAN_ID,
        enrollmentDate: newMemberForm.enrollmentDate,
        renewalDate: newMemberForm.renewalDate,
        idDocumentDataUrl: newMemberForm.idDocumentDataUrl,
      });

      if (!apiResult.ok) {
        toast.error("No se pudo registrar el miembro", {
          description: apiResult.message,
        });
        return;
      }

      let row = apiResult.member;
      const emergencyDisplay = emergencyNational
        ? `+${dial} ${emergencyNational}`.replace(/\s+$/, "")
        : undefined;
      row = {
        ...row,
        phone: phoneDisplay,
        ...(emergencyDisplay ? { emergencyPhone: emergencyDisplay } : {}),
        ...(newMemberForm.idDocumentDataUrl
          ? { idDocumentDataUrl: newMemberForm.idDocumentDataUrl }
          : {}),
      };

      if (newMemberForm.enrollFaceId) {
        try {
          const res = await mockFaceIdEnroll({
            terminalId: newMemberForm.faceIdTerminal,
            memberId: row.id,
            displayName: fullName,
          });
          row = {
            ...row,
            faceIdTemplateId: res.templateId,
            faceIdEnrolled: true,
          };
        } catch {
          toast.warning("No se vinculó el rostro", {
            description:
              "Complete el alta FaceID desde Control de acceso cuando el lector esté disponible.",
          });
        }
      }

      setMembers((prev) => {
        const next = [row, ...prev];
        saveMembers(next);
        return next;
      });
      if (newMemberForm.payNow) {
        const { receipt, synced } = await registerSubscriptionPayment({
          memberId: row.id,
          memberName: fullName,
          amount: paymentAmount,
          concept: "MEMBERSHIP",
          method: newMemberForm.paymentMethod,
          periodKey: newMemberForm.selectedPeriodKey,
        });
        if (!synced) {
          toast.warning("Miembro registrado; pago solo en almacén local", {
            description: "No se pudo registrar el cobro en el POS API.",
          });
        }
        setSubscriptionTicketReceipt(receipt);
        setPaymentsTick((t) => t + 1);
      }
      setMembersFromApi(true);
      setShowAddMemberModal(false);
      setExpandedMember(row.id);
      setCurrentPage(1);
      setSearchTerm("");
      setFilterExpiry("ALL");
      toast.success("Miembro registrado", {
        description:
          newMemberForm.payNow
            ? `${fullName} · ${row.id} · Pago $${paymentAmount.toFixed(2)} registrado`
            : newMemberForm.enrollFaceId && row.faceIdEnrolled
              ? `${fullName} · ${row.id} · Rostro registrado`
              : `${fullName} · ${row.id}`,
      });
    } finally {
      setSavingNewMember(false);
    }
  };

  return (
    <div className="h-full bg-[#131313] p-4 md:p-6">
      <div className="mb-3 md:mb-4">
        <h1 className="text-[#e5e2e1] text-[22px] md:text-[30px] font-black tracking-[-0.5px] uppercase leading-tight">
          Miembros
        </h1>
      </div>

      {/* Members List */}
      <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase">
            Directorio de miembros
          </p>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => void refreshMembersFromApi()}
              disabled={membersLoading}
              className="text-[#808080] hover:text-[#e5e2e1] text-[10px] font-bold uppercase tracking-wide disabled:opacity-50"
            >
              Actualizar
            </button>
            <span className="text-[#808080] text-[10px]">
              Mostrando {startIndex + 1}-{Math.min(endIndex, filteredMembers.length)} de {filteredMembers.length}
            </span>
            <button
              type="button"
              onClick={openAddMemberModal}
              className="bg-[#e31e24] text-white px-4 py-2 flex items-center gap-2 text-[10px] font-bold tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors"
            >
              <UserPlus size={14} />
              Agregar miembro
            </button>
          </div>
        </div>

        {/* Search and vigencia filters */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#808080]" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Nombre, ID, WhatsApp o correo..."
              className="w-full bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] pl-10 pr-4 py-2.5 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif] text-[12px]"
            />
          </div>

          <div>
            <p className="text-[#808080] text-[9px] font-bold uppercase tracking-[1px] mb-2">
              Filtrar por vigencia
            </p>
            <div className="flex flex-wrap gap-2">
              {EXPIRY_FILTER_OPTIONS.map((opt) => {
                const active = filterExpiry === opt.value;
                const count = expiryFilterCounts[opt.value];
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleFilterChange(setFilterExpiry, opt.value)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-[10px] font-bold uppercase tracking-wide transition-colors ${
                      active
                        ? "bg-[#e31e24]/15 border-[#e31e24]/50 text-[#e5e2e1]"
                        : "bg-[#131313] border-[rgba(93,63,60,0.2)] text-[#808080] hover:border-[rgba(93,63,60,0.45)] hover:text-[#e5e2e1]"
                    }`}
                    title={opt.label}
                  >
                    <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${opt.dotClass}`} />
                    <span className="hidden sm:inline">{opt.label}</span>
                    <span className="sm:hidden">{opt.shortLabel}</span>
                    <span
                      className={`tabular-nums text-[9px] px-1.5 py-0.5 rounded ${
                        active ? "bg-[#e31e24]/25 text-white" : "bg-[#1a1a1a] text-[#5a5a5a]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Members list — ancho completo, sin scroll horizontal forzado */}
        <div className="w-full space-y-0">
          {/* Table Header */}
          <div className="hidden lg:grid w-full grid-cols-12 gap-3 xl:gap-4 pb-3 border-b border-[rgba(93,63,60,0.2)]">
            <div className="col-span-4 xl:col-span-3">
              <span className="text-[#808080] text-[9px] font-bold tracking-[1px] uppercase">Nombre</span>
            </div>
            <div className="col-span-2">
              <span className="text-[#808080] text-[9px] font-bold tracking-[1px] uppercase">Alta</span>
            </div>
            <div className="col-span-4 xl:col-span-3">
              <span className="text-[#808080] text-[9px] font-bold tracking-[1px] uppercase">Vigencia</span>
            </div>
            <div className="col-span-1 text-center">
              <span className="text-[#808080] text-[9px] font-bold tracking-[1px] uppercase">Visitas</span>
            </div>
            <div className="col-span-1" aria-hidden />
          </div>

          {/* Table Rows */}
          {membersLoading ? (
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-[#e31e24]" size={28} />
              <p className="text-[#808080] text-[14px]">Cargando miembros…</p>
            </div>
          ) : currentMembers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[#808080] text-[14px]">
                {filterExpiry !== "ALL"
                  ? "Ningún miembro coincide con este filtro de vigencia"
                  : "No se encontraron miembros"}
              </p>
              {filterExpiry !== "ALL" && (
                <button
                  type="button"
                  onClick={() => handleFilterChange(setFilterExpiry, "ALL")}
                  className="mt-3 text-[#e31e24] text-[11px] font-bold uppercase tracking-wide hover:underline"
                >
                  Ver todos
                </button>
              )}
            </div>
          ) : (
            currentMembers.map((member) => {
              const expiryLevel = getExpiryLevel(member.renewalDate);
              const isExpanded = expandedMember === member.id;

              return (
              <div key={member.id} className="w-full min-w-0 group/member">
                {/* Member Row - Desktop */}
                <div
                  onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                  className={`hidden lg:grid w-full grid-cols-12 gap-3 xl:gap-4 py-3.5 px-2 border-b border-l-2 transition-colors cursor-pointer min-w-0 ${
                    isExpanded
                      ? "bg-[#1a1a1a] border-b-[rgba(93,63,60,0.08)]"
                      : "border-b-[rgba(93,63,60,0.05)] hover:bg-[#131313]"
                  } ${expiryRowBorderClass(expiryLevel, isExpanded)}`}
                >
                  <div className="col-span-4 xl:col-span-3 flex items-center gap-3 min-w-0">
                    <div
                      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-black ${expiryAvatarClass(expiryLevel)}`}
                      aria-hidden
                    >
                      {memberInitials(member)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0 mb-0.5">
                        <span className="text-[#e5e2e1] text-[14px] font-bold truncate">
                          {memberFullName(member)}
                        </span>
                      </div>
                      <span className="text-[#e5e2e1] text-[10px] font-mono tracking-tight truncate block" title={member.phone}>
                        {member.phone}
                      </span>
                      {member.email ? (
                        <span className="text-[#808080] text-[9px] truncate block" title={member.email}>
                          {member.email}
                        </span>
                      ) : (
                        <span className="text-[#5a5a5a] text-[9px]">Sin correo</span>
                      )}
                    </div>
                  </div>
                 
                  <div className="col-span-2 flex flex-col justify-center gap-0.5">
                    <span className="text-[#808080] text-[8px] uppercase tracking-wide">Alta</span>
                    <span className="text-[#e5e2e1] text-[11px]">
                      {formatRenewalDate(member.enrollmentDate)}
                    </span>
                  </div>
                  <div className="col-span-4 xl:col-span-3 flex items-center min-w-0 pr-1">
                    <MemberExpiryIndicator member={member} layout="twoRow" />
                  </div>
                  <div className="col-span-1 flex flex-col items-center justify-center gap-0.5">
                    <span className="text-[#808080] text-[8px] uppercase tracking-wide">Vis.</span>
                    <span className="text-[#e5e2e1] text-[13px] font-bold tabular-nums">{member.monthlyVisits}</span>
                  </div>
                  <div className="col-span-1 flex items-center justify-end pr-1">
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-[#e31e24]" />
                    ) : (
                      <ChevronDown size={16} className="text-[#808080] group-hover/member:text-[#e5e2e1] transition-colors" />
                    )}
                  </div>
                </div>

                {/* Member Row - Mobile */}
                <div
                  onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                  className={`lg:hidden w-full p-4 border-b border-l-2 transition-colors cursor-pointer min-w-0 ${
                    isExpanded
                      ? "bg-[#1a1a1a] border-b-[rgba(93,63,60,0.08)]"
                      : "border-b-[rgba(93,63,60,0.05)] bg-[#131313] hover:bg-[#1a1a1a]"
                  } ${expiryRowBorderClass(expiryLevel, isExpanded)}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[12px] font-black ${expiryAvatarClass(expiryLevel)}`}
                      aria-hidden
                    >
                      {memberInitials(member)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5">
                            <span className="text-[#e5e2e1] text-[15px] font-bold leading-tight block">
                              {memberFullName(member)}
                            </span>
                          </div>
                          <span className="text-[#808080] text-[10px] font-mono">{member.id}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-[#e31e24] shrink-0 mt-0.5" />
                        ) : (
                          <ChevronDown size={16} className="text-[#808080] shrink-0 mt-0.5" />
                        )}
                      </div>
                      <span className="text-[#e5e2e1] text-[11px] font-mono block truncate">{member.phone}</span>
                      {member.email ? (
                        <span className="text-[#808080] text-[9px] block truncate mt-0.5">{member.email}</span>
                      ) : (
                        <span className="text-[#5a5a5a] text-[9px] mt-0.5">Sin correo</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 w-full min-w-0 pl-14">
                    <MemberExpiryIndicator member={member} layout="twoRow" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] mt-3 pl-14 pt-2 border-t border-[rgba(93,63,60,0.08)]">
                    <span className="text-[#808080]">
                      Alta · {formatRenewalDate(member.enrollmentDate)}
                    </span>
                    <span className="text-[#808080] tabular-nums">
                      <span className="text-[#e5e2e1] font-bold">{member.monthlyVisits}</span> visitas
                    </span>
                  </div>
                </div>

                {/* Expanded Details — ancho completo del contenedor */}
                {isExpanded && (
                  <div className="w-full min-w-0 bg-[#0e0e0e] border-b border-[rgba(93,63,60,0.12)] border-l-2 border-l-[#e31e24] p-4 sm:p-6 lg:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full">
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
                              memberName: memberFullName(member),
                            },
                          })
                        }
                        className="inline-flex items-center justify-center gap-2 bg-[#0e0e0e] border border-[rgba(93,63,60,0.25)] text-[#e5e2e1] px-4 py-2.5 text-[10px] font-bold tracking-[1px] uppercase hover:border-[#e31e24] transition-colors"
                      >
                        <ShoppingCart size={14} />
                        Vender en tienda
                      </button>
                    </div>
                    <div className="w-full flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-[rgba(93,63,60,0.12)] bg-[#131313] px-4 py-3">
                      <span className="text-[#808080] text-[9px] font-bold uppercase tracking-wide shrink-0">
                        Canal principal
                      </span>
                      {whatsAppHref(member.phone) ? (
                        <a
                          href={whatsAppHref(member.phone)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-[#25d366] text-[12px] font-bold hover:underline min-w-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle size={16} className="shrink-0" />
                          <span className="truncate font-mono">{member.phone}</span>
                        </a>
                      ) : (
                        <span className="text-[#e5e2e1] text-[12px] font-mono">{member.phone}</span>
                      )}
                      {member.email ? (
                        <span className="text-[#808080] text-[11px] min-w-0 truncate" title={member.email}>
                          Correo: {member.email}
                        </span>
                      ) : (
                        <span className="text-[#5a5a5a] text-[10px]">Sin correo registrado</span>
                      )}
                      {member.emergencyPhone ? (
                        <span className="text-[#808080] text-[11px] min-w-0 truncate" title={member.emergencyPhone}>
                          Emergencia: {member.emergencyPhone}
                        </span>
                      ) : null}
                    </div>
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                      {/* Suscripción / vigencia */}
                      <div className="w-full min-w-0 bg-[#2a2a2a] border border-[rgba(93,63,60,0.05)] p-5 sm:p-6">
                        <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] mb-2">
                          SUSCRIPCIÓN
                        </p>
                        <h2 className="text-white text-[15px] sm:text-[17px] font-bold mb-1 leading-tight">
                          {getExpiryMeta(member.renewalDate).label}
                        </h2>
                        <p className="text-[#e7bdb8] text-[12px] mb-5">
                          Acceso por tiempo · periodo de {subscriptionPeriodDays(member)} días
                        </p>
                        {memberPlanLabel(member.tier) && (
                          <p className="text-[#808080] text-[11px] mb-4">
                            Plan contratado:{" "}
                            <span className="text-[#e5e2e1] font-bold">{memberPlanLabel(member.tier)}</span>
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[rgba(93,63,60,0.1)]">
                          <div>
                            <p className="text-[#393939] text-[9px] font-bold mb-1">INICIO</p>
                            <p className="text-white text-[13px] font-black">
                              {formatRenewalDate(member.enrollmentDate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[#393939] text-[9px] font-bold mb-1">VENCE</p>
                            <p className="text-white text-[13px] font-black">
                              {formatRenewalDate(member.renewalDate)}
                            </p>
                          </div>
                        </div>
                        <div className="pt-4 mt-3 border-t border-[rgba(93,63,60,0.08)]">
                          <p className="text-[#e31e24] text-[9px] font-bold tracking-[1.5px] uppercase mb-3">
                            Estado de vigencia
                          </p>
                          <MemberExpiryIndicator member={member} layout="twoRow" />
                        </div>
                      </div>

                      {/* Biometric Enrollment */}
                      <div className="w-full min-w-0 bg-[#2a2a2a] border border-[rgba(93,63,60,0.05)] p-5 sm:p-6">
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
                      <div className="w-full min-w-0 bg-[#2a2a2a] border border-[rgba(93,63,60,0.05)] p-5 sm:p-6 md:col-span-2 xl:col-span-1">
                        <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
                          Activity_Stats
                        </p>
                        <div className="space-y-4">
                          <div>
                            <p className="text-[#808080] text-[10px] mb-1">MONTHLY VISITS</p>
                            <p className="text-[#e5e2e1] text-[16px] font-black">{member.monthlyVisits}</p>
                          </div>
                          <div>
                            <p className="text-[#808080] text-[10px] mb-1">AVG SESSION TIME</p>
                            <p className="text-[#e5e2e1] text-[16px] font-black">{member.avgSessionTime} MIN</p>
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

                    {(member.address || member.idDocumentDataUrl) && (
                      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                        {member.address && (
                          <div className="w-full min-w-0 bg-[#131313] border border-[rgba(93,63,60,0.1)] p-5">
                            <p className="flex items-center gap-2 text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-3">
                              <MapPin size={14} />
                              Domicilio
                            </p>
                            <p className="text-[#e5e2e1] text-[13px] leading-relaxed whitespace-pre-wrap">
                              {member.address}
                            </p>
                          </div>
                        )}
                        {member.idDocumentDataUrl && (
                          <div className="w-full min-w-0 bg-[#131313] border border-[rgba(93,63,60,0.1)] p-5">
                            <p className="flex items-center gap-2 text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-3">
                              <IdCard size={14} />
                              ID · expediente
                            </p>
                            <a
                              href={member.idDocumentDataUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded border border-[rgba(93,63,60,0.2)] overflow-hidden bg-[#131313] hover:border-[#e31e24]/50 transition-colors"
                            >
                              <img
                                src={member.idDocumentDataUrl}
                                alt={`Identificación ${member.id}`}
                                className="w-full max-h-[240px] object-contain"
                              />
                            </a>
                            <p className="text-[#393939] text-[9px] mt-2">
                              Clic para abrir en pestaña nueva.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Payment history — demo store */}
                    <div className="w-full min-w-0 bg-[#131313] border border-[rgba(93,63,60,0.1)] p-4 sm:p-6">
                      <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
                        Historial de pagos (membresía)
                      </p>
                      {paymentsForExpanded.length === 0 ? (
                        <p className="text-[#808080] text-[12px]">Sin pagos registrados.</p>
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
            );
            })
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
                <h3 className="text-[#e5e2e1] text-[16px] font-black uppercase leading-tight">
                  {memberFullName(paymentModalMember)}
                </h3>
                <p className="text-[#808080] text-[11px] font-mono mt-1">{paymentModalMember.id}</p>
                <p className="text-[#e5e2e1] text-[11px] font-mono mt-1">{paymentModalMember.phone}</p>
                {paymentModalMember.email && (
                  <p className="text-[#808080] text-[10px] mt-0.5 truncate max-w-[280px]" title={paymentModalMember.email}>
                    {paymentModalMember.email}
                  </p>
                )}
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
        <div className="fixed inset-0 z-[55] overflow-y-auto overscroll-y-contain bg-black/70">
          <div
            className="flex min-h-[100dvh] w-full box-border items-start justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4 sm:py-10"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowAddMemberModal(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-member-title"
              className="relative w-full max-w-lg min-w-0 shrink-0 border border-[rgba(93,63,60,0.2)] bg-[#131313] p-5 shadow-2xl sm:p-6 md:p-8 lg:max-w-4xl lg:p-10 xl:max-w-5xl 2xl:max-w-6xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
            <div className="mb-6 flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
                  Nuevo miembro
                </p>
                <h3 id="add-member-title" className="text-[#e5e2e1] text-[clamp(1.125rem,4vw,1.375rem)] font-black uppercase tracking-tight break-words">
                  Alta en directorio
                </h3>
                <p className="text-[#808080] text-[11px] mt-2 leading-relaxed break-words">
                  Comunicación principal por <span className="text-[#e5e2e1] font-semibold">WhatsApp</span> (teléfono obligatorio).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="text-[#808080] hover:text-[#e31e24] transition-colors shrink-0 rounded p-0.5"
                aria-label="Cerrar"
              >
                <X size={22} />
              </button>
            </div>

            <form
              onSubmit={submitNewMember}
              className="min-w-0 max-w-full space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8 lg:gap-y-5 lg:space-y-0 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] xl:gap-x-12 2xl:gap-x-14"
            >
              {/* Columna: datos de contacto y expediente */}
              <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
                <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-x-4 xl:gap-y-4">
                  <div className="min-w-0">
                    <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                      Nombres
                    </label>
                    <input
                      type="text"
                      value={newMemberForm.firstName}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, firstName: e.target.value })}
                      placeholder="Ej. Ana María"
                      className="w-full min-w-0 max-w-full box-border bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none font-['Space_Grotesk',sans-serif] text-[13px] sm:text-[14px]"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                      Apellidos
                    </label>
                    <input
                      type="text"
                      value={newMemberForm.lastName}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, lastName: e.target.value })}
                      placeholder="Ej. García López"
                      className="w-full min-w-0 max-w-full box-border bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none font-['Space_Grotesk',sans-serif] text-[13px] sm:text-[14px]"
                      required
                    />
                  </div>
                  <div className="min-w-0 xl:col-span-2">
                    <label className="flex items-center gap-2 text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                      <MessageCircle size={12} className="text-[#25d366] shrink-0" />
                      WhatsApp / teléfono
                    </label>
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                      <div ref={phonePrefixRef} className="relative w-full shrink-0 sm:w-[5.25rem]">
                        <button
                          type="button"
                          onClick={() => setPhonePrefixMenuOpen((o) => !o)}
                          className="flex h-full min-h-[46px] w-full items-center justify-between gap-1 border border-[rgba(93,63,60,0.2)] bg-[#0e0e0e] px-2.5 py-3 text-left text-[#e5e2e1] focus:border-[#e31e24] focus:outline-none [color-scheme:dark] text-[13px] sm:text-[14px]"
                          aria-expanded={phonePrefixMenuOpen}
                          aria-haspopup="listbox"
                          aria-label="Prefijo de país"
                        >
                          <span className="font-mono tabular-nums">+{newMemberForm.phoneCountryDial}</span>
                          <ChevronDown
                            size={14}
                            className={`shrink-0 text-[#808080] transition-transform ${phonePrefixMenuOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {phonePrefixMenuOpen ? (
                          <ul
                            role="listbox"
                            className="absolute left-0 right-0 z-30 mt-1 max-h-48 overflow-auto border border-[rgba(93,63,60,0.25)] bg-[#0e0e0e] py-1 shadow-xl sm:left-0 sm:right-auto sm:min-w-[14rem]"
                          >
                            {PHONE_COUNTRY_PREFIXES.map((p) => (
                              <li key={p.dial} role="none">
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={newMemberForm.phoneCountryDial === p.dial}
                                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[12px] sm:text-[13px] hover:bg-[#1a1a1a] ${
                                    newMemberForm.phoneCountryDial === p.dial ? "bg-[#1a1a1a] text-[#e31e24]" : "text-[#e5e2e1]"
                                  }`}
                                  onClick={() => {
                                    setNewMemberForm({ ...newMemberForm, phoneCountryDial: p.dial });
                                    setPhonePrefixMenuOpen(false);
                                  }}
                                >
                                  <span className="min-w-0 text-[11px] sm:text-[12px] text-[#b0b0b0]">{p.country}</span>
                                  <span className="shrink-0 font-mono tabular-nums">+{p.dial}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        value={newMemberForm.phoneNational}
                        onChange={(e) =>
                          setNewMemberForm({ ...newMemberForm, phoneNational: e.target.value })
                        }
                        placeholder="55 1234 5678"
                        className="min-w-0 flex-1 box-border border border-[rgba(93,63,60,0.2)] bg-[#0e0e0e] px-4 py-3 font-['Space_Grotesk',sans-serif] text-[#e5e2e1] focus:border-[#e31e24] focus:outline-none text-[13px] sm:text-[14px]"
                        required
                      />
                    </div>
                  </div>
                  <div className="min-w-0 xl:col-span-2">
                    <label className="flex items-center gap-2 text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                      <Phone size={12} className="text-[#e31e24] shrink-0" />
                      Teléfono de emergencia{" "}
                      <span className="font-normal normal-case text-[#5a5a5a]">(opcional)</span>
                    </label>
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                      <div className="w-full shrink-0 sm:w-[5.25rem]">
                        <div className="flex h-full min-h-[46px] w-full items-center justify-center border border-[rgba(93,63,60,0.2)] bg-[#131313] px-2.5 py-3 font-mono text-[#808080] text-[13px] sm:text-[14px]">
                          +{newMemberForm.phoneCountryDial}
                        </div>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        value={newMemberForm.emergencyPhoneNational}
                        onChange={(e) =>
                          setNewMemberForm({
                            ...newMemberForm,
                            emergencyPhoneNational: e.target.value,
                          })
                        }
                        placeholder="Contacto de emergencia"
                        className="min-w-0 flex-1 box-border border border-[rgba(93,63,60,0.2)] bg-[#0e0e0e] px-4 py-3 font-['Space_Grotesk',sans-serif] text-[#e5e2e1] focus:border-[#e31e24] focus:outline-none text-[13px] sm:text-[14px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                    Correo electrónico{" "}
                    <span className="font-normal normal-case text-[#5a5a5a]">(opcional)</span>
                  </label>
                  <input
                    type="email"
                    value={newMemberForm.email}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    className="w-full min-w-0 max-w-full box-border bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none font-['Space_Grotesk',sans-serif] text-[13px] sm:text-[14px]"
                  />
                </div>

              <div className="min-w-0">
                <label className="flex items-center gap-2 text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  <MapPin size={12} className="text-[#e31e24] shrink-0" />
                  Domicilio
                </label>
                <textarea
                  value={newMemberForm.address}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, address: e.target.value })}
                  placeholder="Calle, número, colonia, CP, ciudad, estado"
                  rows={3}
                  className="w-full min-w-0 max-w-full box-border bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none font-['Space_Grotesk',sans-serif] text-[13px] sm:text-[14px] resize-y min-h-[80px] placeholder:text-[#5a5a5a]"
                />
               
              </div>

              <div className="min-w-0 overflow-hidden rounded-sm bg-[#0e0e0e] border border-[rgba(93,63,60,0.15)] p-4">
                <p className="flex items-center gap-2 text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase">
                  <IdCard size={14} className="text-[#e31e24]" />
                  Identificación oficial
                </p>
                <div
                  className={
                    newMemberForm.idDocumentDataUrl
                      ? "mt-3 grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-start xl:gap-5"
                      : "mt-3 space-y-3"
                  }
                >
                  <div className="min-w-0 space-y-3">
                    <p className="text-[#5a5a5a] text-[9px] leading-relaxed">
                      Importa archivo o abre la cámara (vista previa en vivo y captura). Requiere permiso del navegador;
                      en escritorio muchos equipos solo abren cámara vía este visor, no con el botón del sistema.
                    </p>
                    <input
                      ref={idFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleIdDocumentFile}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => idFileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wide bg-[#131313] border border-[rgba(93,63,60,0.25)] text-[#e5e2e1] hover:border-[#e31e24] transition-colors"
                      >
                        <Upload size={14} />
                        Importar imagen
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowIdCameraModal(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wide bg-[#131313] border border-[rgba(93,63,60,0.25)] text-[#e5e2e1] hover:border-[#e31e24] transition-colors"
                      >
                        <Camera size={14} />
                        Tomar foto
                      </button>
                      {newMemberForm.idDocumentDataUrl && (
                        <button
                          type="button"
                          onClick={() => setNewMemberForm((f) => ({ ...f, idDocumentDataUrl: null }))}
                          className="inline-flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[#808080] hover:text-[#e31e24] border border-transparent hover:border-[rgba(227,30,36,0.35)] transition-colors"
                        >
                          Quitar archivo
                        </button>
                      )}
                    </div>
                  </div>
                  {newMemberForm.idDocumentDataUrl && (
                    <div className="relative min-w-0 rounded border border-[rgba(93,63,60,0.2)] overflow-hidden bg-[#131313] max-h-[200px] xl:max-h-[min(320px,45vh)] xl:sticky xl:top-0">
                      <img
                        src={newMemberForm.idDocumentDataUrl}
                        alt="Vista previa identificación"
                        className="w-full h-auto max-h-[200px] xl:max-h-[min(320px,45vh)] object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
              </div>

              {/* Columna: suscripción, fechas y acceso */}
              <div className="flex min-w-0 flex-col gap-4 border-[rgba(93,63,60,0.08)] lg:gap-5 lg:border-l lg:pl-8 xl:pl-12">
              <div>
                <p className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  Periodo de vigencia
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUBSCRIPTION_PERIOD_OPTIONS.map(({ key, label, period }) => {
                    const active = newMemberForm.selectedPeriodKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          const { renewalDate, cost } = applySubscriptionPeriod(
                            newMemberForm.enrollmentDate,
                            key,
                          );
                          setNewMemberForm((f) => ({
                            ...f,
                            selectedPeriodKey: key,
                            renewalDate,
                            subscriptionCost: cost,
                          }));
                        }}
                        className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wide border transition-colors ${
                          active
                            ? "bg-[#e31e24]/15 border-[#e31e24]/50 text-white"
                            : "bg-[#0e0e0e] border-[rgba(93,63,60,0.25)] text-[#e5e2e1] hover:border-[#e31e24] hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 min-w-0">
                <div className="min-w-0">
                  <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                    Alta (enrollment)
                  </label>
                  <input
                    type="date"
                    value={newMemberForm.enrollmentDate}
                    onChange={(e) => {
                      const ed = e.target.value;
                      setNewMemberForm((f) => {
                        const { renewalDate, cost } = applySubscriptionPeriod(
                          ed,
                          f.selectedPeriodKey,
                        );
                        return {
                          ...f,
                          enrollmentDate: ed,
                          renewalDate: clampRenewalDate(ed, renewalDate),
                          subscriptionCost: cost,
                        };
                      });
                    }}
                    className="w-full min-w-0 max-w-full box-border bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-3 sm:px-4 focus:border-[#e31e24] focus:outline-none text-[13px] sm:text-[14px] [color-scheme:dark]"
                    required
                  />
                </div>
                <div className="min-w-0">
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
                        selectedPeriodKey: null,
                      }))
                    }
                    className="w-full min-w-0 max-w-full box-border bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-3 sm:px-4 focus:border-[#e31e24] focus:outline-none text-[13px] sm:text-[14px] [color-scheme:dark]"
                    required
                  />
                  <p className="text-[#393939] text-[9px] mt-1.5 leading-snug">
                    Permitido: desde la fecha de alta hasta {renewalWindowMaxIso(newMemberForm.enrollmentDate)} (máx. 1 año).
                  </p>
                </div>
              </div>

              <div className="min-w-0 rounded-sm bg-[#0e0e0e] border border-[rgba(93,63,60,0.15)] p-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet size={16} className="text-[#e31e24] shrink-0" />
                  <p className="text-[#e5e2e1] text-[12px] font-bold uppercase tracking-wide">
                    Pago de suscripción
                  </p>
                </div>
                <div>
                  <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                    Costo de suscripción (MXN)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newMemberForm.subscriptionCost}
                    onChange={(e) =>
                      setNewMemberForm((f) => ({
                        ...f,
                        subscriptionCost: e.target.value,
                        selectedPeriodKey: null,
                      }))
                    }
                    className="w-full min-w-0 max-w-full box-border bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none text-[14px] font-bold tabular-nums"
                    required
                  />
                  <p className="text-[#393939] text-[9px] mt-1.5">
                    Se llena al elegir un periodo; puedes ajustarlo manualmente.
                  </p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMemberForm.payNow}
                    onChange={(e) =>
                      setNewMemberForm((f) => ({ ...f, payNow: e.target.checked }))
                    }
                    className="mt-1 w-4 h-4 accent-[#e31e24] rounded border-[rgba(93,63,60,0.4)]"
                  />
                  <div>
                    <span className="text-[#e5e2e1] text-[12px] font-bold">
                      Registrar pago al guardar
                    </span>
                    <p className="text-[#808080] text-[10px] mt-1 leading-relaxed">
                      Cobra la suscripción en el mismo paso del alta del miembro.
                    </p>
                  </div>
                </label>
                {newMemberForm.payNow && (
                  <div>
                    <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                      Método de pago
                    </label>
                    <select
                      value={newMemberForm.paymentMethod}
                      onChange={(e) =>
                        setNewMemberForm((f) => ({
                          ...f,
                          paymentMethod: e.target.value as typeof f.paymentMethod,
                        }))
                      }
                      className="w-full min-w-0 max-w-full box-border bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none text-[13px]"
                    >
                      <option value="CASH">Efectivo</option>
                      <option value="CARD">Tarjeta</option>
                      <option value="QR">QR / transferencia</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="min-w-0 overflow-hidden rounded-sm bg-[#0e0e0e] border border-[rgba(93,63,60,0.15)] p-4 space-y-3">
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
                      className="w-full min-w-0 max-w-full box-border bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2.5 sm:px-4 focus:border-[#e31e24] focus:outline-none text-[11px] sm:text-[12px]"
                    >
                      <option value="TRN-MAIN-01">TRN-MAIN-01 — Entrada principal</option>
                      <option value="TRN-MAIN-02">TRN-MAIN-02 — Entrada lateral</option>
                    </select>
                  </div>
                )}
              </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[rgba(93,63,60,0.15)] pt-3 sm:flex-row sm:gap-3 sm:pt-4 lg:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  disabled={savingNewMember}
                  className="min-h-[44px] w-full sm:flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNewMember}
                  className="min-h-[44px] w-full sm:flex-1 bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingNewMember ? <Loader2 className="animate-spin" size={16} /> : null}
                  {newMemberForm.payNow ? "Guardar y cobrar" : "Guardar miembro"}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {showIdCameraModal && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-[70] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="id-camera-title"
        >
          <div className="bg-[#131313] border border-[rgba(93,63,60,0.3)] max-w-lg w-full p-5 md:p-6 shadow-2xl">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div>
                <p id="id-camera-title" className="text-[#e5e2e1] text-[16px] font-black uppercase tracking-tight">
                  Capturar identificación
                </p>
                <p className="text-[#808080] text-[10px] mt-1 leading-relaxed">
                  Enmarca el documento y pulsa Capturar. Si no ves imagen, permite el acceso a la cámara en la barra del
                  navegador.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIdCameraModal(false)}
                className="text-[#808080] hover:text-[#e31e24] transition-colors shrink-0 p-1"
                aria-label="Cerrar cámara"
              >
                <X size={22} />
              </button>
            </div>
            <div className="relative rounded border border-[rgba(93,63,60,0.25)] bg-black overflow-hidden aspect-[4/3] max-h-[55vh]">
              <video
                ref={idVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {idCameraStarting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-[#e5e2e1]">
                  <Loader2 className="animate-spin" size={28} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">Iniciando cámara…</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowIdCameraModal(false)}
                className="flex-1 min-w-[120px] bg-[#0e0e0e] border border-[rgba(93,63,60,0.25)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#1a1a1a] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={captureIdPhotoFromStream}
                disabled={idCameraStarting}
                className="flex-1 min-w-[120px] bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Capturar foto
              </button>
            </div>
          </div>
        </div>
      )}
      {subscriptionTicketReceipt && (
        <PosTicketModal
          receipt={subscriptionTicketReceipt}
          labels={DEFAULT_LABELS}
          onClose={() => setSubscriptionTicketReceipt(null)}
        />
      )}
    </div>
  );
}
