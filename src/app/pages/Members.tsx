import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
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
  Pencil,
  Check,
  CheckCircle2,
} from "lucide-react";
import { addClientUseCase, listClientsUseCase, updateClientUseCase, clientIdFromMemberId, sortMembersByDateAddedDesc, listBranchPricesUseCase, buildDirectPayPeriodOptions, buildDirectDebitPeriodOptions, findPeriodOption, type BranchPricePeriodOption, type CatalogBranchPrice } from "../core/catalog";
import { getSessionPayer } from "../core/auth/authStorage";
import {
  getSubscriptionPrice,
  getDirectDebitMonthlyPrice,
  type SubscriptionPeriodKey,
} from "../lib/plansStore";
import { useAuth } from "../context/AuthContext";
import { addMembershipPayment } from "../lib/demoStore";
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

const MIN_NATIONAL_PHONE_DIGITS = 10;

function isValidNationalPhone(national: string): boolean {
  return normalizePhoneDigits(national).length >= MIN_NATIONAL_PHONE_DIGITS;
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

/** Fin del periodo permitido: alta + 18 meses. */
function renewalWindowMaxIso(enrollmentIso: string): string {
  return addMonthsIso(enrollmentIso, 18);
}

function clampRenewalDate(enrollmentIso: string, renewalIso: string): string {
  const min = enrollmentIso;
  const max = renewalWindowMaxIso(enrollmentIso);
  if (renewalIso < min) return min;
  if (renewalIso > max) return max;
  return renewalIso;
}

/** Periodos de membresía hasta renovación. */
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

function formatMxnAmount(value: number): string {
  return value.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const DEFAULT_MEMBER_PLAN_ID = 1;

/** Fallback local si el catálogo de precios no responde. */
const FALLBACK_DIRECT_PAY_OPTIONS: BranchPricePeriodOption[] = [
  { key: "1d", label: "1 día", frequencyName: "Day", priceBranchFrequencyID: 1, priceRegular: getSubscriptionPrice("1d"), priceDirectDebit: 0, period: { days: 1 } },
  { key: "1w", label: "1 semana", frequencyName: "Week", priceBranchFrequencyID: 2, priceRegular: getSubscriptionPrice("1w"), priceDirectDebit: 0, period: { weeks: 1 } },
  { key: "1m", label: "1 mes", frequencyName: "Month", priceBranchFrequencyID: 3, priceRegular: getSubscriptionPrice("1m"), priceDirectDebit: 0, period: { months: 1 }, months: 1 },
  { key: "3m", label: "3 meses", frequencyName: "Quarter", priceBranchFrequencyID: 4, priceRegular: getSubscriptionPrice("3m"), priceDirectDebit: 0, period: { months: 3 }, months: 3 },
  { key: "6m", label: "6 meses", frequencyName: "Semester", priceBranchFrequencyID: 5, priceRegular: getSubscriptionPrice("6m"), priceDirectDebit: getDirectDebitMonthlyPrice("6m"), period: { months: 6 }, months: 6 },
  { key: "12m", label: "12 meses", frequencyName: "Year", priceBranchFrequencyID: 6, priceRegular: getSubscriptionPrice("12m"), priceDirectDebit: getDirectDebitMonthlyPrice("12m"), period: { months: 12 }, months: 12 },
];

const FALLBACK_DIRECT_DEBIT_OPTIONS = FALLBACK_DIRECT_PAY_OPTIONS.filter(
  (o) => o.key === "6m" || o.key === "12m",
);

const DEFAULT_SUBSCRIPTION_FEE = "200.00";

function applyDirectDebitPeriod(
  enrollmentIso: string,
  option: BranchPricePeriodOption,
): {
  renewalDate: string;
  monthlyPrice: number;
  months: number;
  projectedTotal: number;
} {
  const months = option.months ?? (option.key === "12m" ? 12 : 6);
  const monthlyPrice = option.priceDirectDebit;
  return {
    renewalDate: renewalAfterPeriod(enrollmentIso, { months }),
    monthlyPrice,
    months,
    projectedTotal: monthlyPrice * months,
  };
}

type AddMemberWizardStep = 1 | 2 | 3 | 4;

type AddMemberStep1Field =
  | "firstName"
  | "lastName"
  | "phoneNational"
  | "emergencyPhoneNational"
  | "email";

type AddMemberStep1Errors = Partial<Record<AddMemberStep1Field, string>>;

const STEP1_FIELD_LABELS: Record<AddMemberStep1Field, string> = {
  firstName: "Nombres",
  lastName: "Apellidos",
  phoneNational: "Teléfono de contacto",
  emergencyPhoneNational: "Teléfono de emergencia",
  email: "Correo electrónico",
};

const fieldErrorClass =
  "border-[#e31e24]/70 focus:border-[#e31e24] ring-1 ring-[#e31e24]/35";
const fieldOkClass =
  "border-[rgba(93,63,60,0.2)] focus:border-[#e31e24]";


const ADD_MEMBER_WIZARD_STEPS: {
  step: AddMemberWizardStep;
  label: string;
  optional?: boolean;
}[] = [
  { step: 1, label: "Datos" },
  { step: 2, label: "Membresía" },
  { step: 3, label: "Face ID", optional: true },
  { step: 4, label: "Éxito" },
];

function applySubscriptionPeriod(
  enrollmentIso: string,
  option: BranchPricePeriodOption | null | undefined,
): { renewalDate: string; cost: string; priceBranchFrequencyID: number } {
  const opt =
    option ??
    FALLBACK_DIRECT_PAY_OPTIONS.find((p) => p.key === "1m") ??
    FALLBACK_DIRECT_PAY_OPTIONS[0];
  return {
    renewalDate: renewalAfterPeriod(enrollmentIso, opt.period),
    cost: opt.priceRegular.toFixed(2),
    priceBranchFrequencyID: opt.priceBranchFrequencyID,
  };
}

function addPeriodToDate(
  fromIso: string,
  period: { days?: number; weeks?: number; months?: number },
): string {
  const d = new Date(`${fromIso}T12:00:00`);
  if (period.days) d.setDate(d.getDate() + period.days);
  else if (period.weeks) d.setDate(d.getDate() + period.weeks * 7);
  else if (period.months) d.setMonth(d.getMonth() + period.months);
  return d.toISOString().slice(0, 10);
}

/** Fecha desde la que se extiende la vigencia al renovar. */
function renewalBaseDate(member: Pick<Member, "renewalDate">): string {
  const today = new Date().toISOString().slice(0, 10);
  return member.renewalDate >= today ? member.renewalDate : today;
}

function extendMembershipPeriod(
  fromIso: string,
  option: BranchPricePeriodOption,
  directDebit = false,
): { newRenewalDate: string; cost: string } {
  return {
    newRenewalDate: addPeriodToDate(fromIso, option.period),
    // En domiciliado el costo mostrado es la mensualidad.
    cost: (directDebit ? option.priceDirectDebit : option.priceRegular).toFixed(
      2,
    ),
  };
}

function memberToEditForm(member: Member) {
  const digits = normalizePhoneDigits(member.phone ?? "");
  let dial = "52";
  let national = digits;
  if (digits.startsWith("52") && digits.length > 10) {
    dial = "52";
    national = digits.slice(2);
  } else if (digits.length > 10) {
    dial = digits.slice(0, digits.length - 10);
    national = digits.slice(-10);
  }
  return {
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email ?? "",
    phoneCountryDial: dial,
    phoneNational: national,
    address: member.address ?? "",
    enrollmentDate: member.enrollmentDate,
    renewalDate: member.renewalDate,
    idDocumentDataUrl: member.idDocumentDataUrl ?? null,
  };
}

const emptyNewMemberForm = () => {
  const today = new Date().toISOString().slice(0, 10);
  const defaultOpt =
    FALLBACK_DIRECT_PAY_OPTIONS.find((p) => p.key === "1m") ??
    FALLBACK_DIRECT_PAY_OPTIONS[0];
  const { renewalDate, cost, priceBranchFrequencyID } = applySubscriptionPeriod(
    today,
    defaultOpt,
  );
  return {
    firstName: "",
    lastName: "",
    email: "",
    phoneCountryDial: "52",
    phoneNational: "",
    emergencyPhoneNational: "",
    planID: DEFAULT_MEMBER_PLAN_ID,
    selectedPeriodKey: defaultOpt.key as SubscriptionPeriodKey | null,
    priceBranchFrequencyID,
    /** Cuota de entrada (pago único de suscripción), independiente de la membresía. */
    subscriptionFee: DEFAULT_SUBSCRIPTION_FEE,
    /** Cobrar cuota de entrada al alta (opcional; en domiciliado inicia apagada). */
    chargeSubscriptionFee: true,
    /** Precio de la membresía según vigencia (priceRegular / priceDirectDebit). */
    membershipCost: cost,
    directDebit: false,
    paymentMethod: "CARD" as "CASH" | "CARD" | "QR",
    enrollmentDate: today,
    renewalDate,
    enrollFaceId: false,
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
  const [addMemberStep, setAddMemberStep] = useState<AddMemberWizardStep>(1);
  const [createdMemberSummary, setCreatedMemberSummary] = useState<{
    id: string;
    name: string;
    faceIdEnrolled: boolean;
    subscriptionPaid: boolean;
    subscriptionFee: number;
    membershipAmount: number;
    directDebit: boolean;
  } | null>(null);
  /** Miembro ya creado en catálogo (paso 1). */
  const [wizardMember, setWizardMember] = useState<Member | null>(null);
  const [wizardPaymentDone, setWizardPaymentDone] = useState(false);
  const [wizardSync, setWizardSync] = useState<
    null | "client" | "payment" | "faceid"
  >(null);
  const [branchPrices, setBranchPrices] = useState<CatalogBranchPrice[]>([]);
  const [branchPricesLoading, setBranchPricesLoading] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState(emptyNewMemberForm());
  const [step1Errors, setStep1Errors] = useState<AddMemberStep1Errors>({});
  const [showPurchaseConfirmModal, setShowPurchaseConfirmModal] = useState(false);

  const directPayOptions = useMemo(
    () =>
      branchPrices.length > 0
        ? buildDirectPayPeriodOptions(branchPrices)
        : FALLBACK_DIRECT_PAY_OPTIONS,
    [branchPrices],
  );
  const directDebitOptions = useMemo(
    () =>
      branchPrices.length > 0
        ? buildDirectDebitPeriodOptions(branchPrices)
        : FALLBACK_DIRECT_DEBIT_OPTIONS,
    [branchPrices],
  );

  const syncFormWithPriceOptions = (
    prices: CatalogBranchPrice[],
    form = emptyNewMemberForm(),
  ) => {
    const payOpts = buildDirectPayPeriodOptions(prices);
    const debitOpts = buildDirectDebitPeriodOptions(prices);
    if (payOpts.length === 0) return form;
    if (form.directDebit) {
      const opt =
        findPeriodOption(debitOpts, form.selectedPeriodKey) ?? debitOpts[0];
      if (!opt) return form;
      const applied = applyDirectDebitPeriod(form.enrollmentDate, opt);
      return {
        ...form,
        selectedPeriodKey: opt.key,
        priceBranchFrequencyID: opt.priceBranchFrequencyID,
        renewalDate: applied.renewalDate,
        membershipCost: applied.monthlyPrice.toFixed(2),
      };
    }
    const opt =
      findPeriodOption(payOpts, form.selectedPeriodKey) ??
      findPeriodOption(payOpts, "1m") ??
      payOpts[0];
    const applied = applySubscriptionPeriod(form.enrollmentDate, opt);
    return {
      ...form,
      selectedPeriodKey: opt.key,
      priceBranchFrequencyID: applied.priceBranchFrequencyID,
      renewalDate: applied.renewalDate,
      membershipCost: applied.cost,
    };
  };

  const loadBranchPrices = async (): Promise<CatalogBranchPrice[] | null> => {
    setBranchPricesLoading(true);
    try {
      const result = await listBranchPricesUseCase();
      if (!result.ok) {
        toast.warning("Precios locales", {
          description:
            result.message ||
            "No se pudo cargar el catálogo de precios; se usan valores de respaldo.",
        });
        setBranchPrices([]);
        return null;
      }
      setBranchPrices(result.prices);
      setNewMemberForm((prev) => syncFormWithPriceOptions(result.prices, prev));
      return result.prices;
    } finally {
      setBranchPricesLoading(false);
    }
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [filterExpiry, setFilterExpiry] = useState<ExpiryFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [paymentModalMember, setPaymentModalMember] = useState<Member | null>(null);
  const [subscriptionTicketReceipt, setSubscriptionTicketReceipt] =
    useState<PosTicketReceipt | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: getSubscriptionPrice("1m").toFixed(2),
    method: "CARD" as "CASH" | "CARD" | "QR",
    directDebit: false,
    periodKey: "1m" as SubscriptionPeriodKey,
    priceBranchFrequencyID: 3,
    newRenewalDate: "",
  });
  const [submittingRenewal, setSubmittingRenewal] = useState(false);
  /** Cobro POS de la renovación ya registrado (reintento solo actualiza vigencia). */
  const [renewalPaymentDone, setRenewalPaymentDone] = useState(false);
  const [memberEditForm, setMemberEditForm] = useState<ReturnType<typeof memberToEditForm> | null>(null);
  const [savingMemberEdit, setSavingMemberEdit] = useState(false);
  const memberEditFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!expandedMember) {
      setMemberEditForm(null);
      return;
    }
    const member = members.find((m) => m.id === expandedMember);
    if (member) setMemberEditForm(memberToEditForm(member));
  }, [expandedMember]);

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
    const list =
      filterExpiry === "ALL"
        ? searchMatchedMembers
        : searchMatchedMembers.filter(
            (member) => getExpiryLevel(member.renewalDate) === filterExpiry,
          );
    return sortMembersByDateAddedDesc(list);
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

  const openRenewalModal = (member: Member) => {
    const base = renewalBaseDate(member);
    const directDebit = member.isDirectDebit === true;
    const opt = directDebit
      ? (findPeriodOption(directDebitOptions, "6m") ?? directDebitOptions[0])
      : (findPeriodOption(directPayOptions, "1m") ?? directPayOptions[0]);
    const { newRenewalDate, cost } = extendMembershipPeriod(
      base,
      opt,
      directDebit,
    );
    setPaymentModalMember(member);
    setRenewalPaymentDone(false);
    setPaymentForm({
      amount: cost,
      method: "CARD",
      directDebit,
      periodKey: opt.key,
      priceBranchFrequencyID: opt.priceBranchFrequencyID,
      newRenewalDate,
    });
    // Refresca chips y monto con los precios del catálogo de la sucursal.
    void loadBranchPrices().then((prices) => {
      if (!prices) return;
      setPaymentForm((f) => {
        const opts = f.directDebit
          ? buildDirectDebitPeriodOptions(prices)
          : buildDirectPayPeriodOptions(prices);
        const fresh = findPeriodOption(opts, f.periodKey) ?? opts[0];
        if (!fresh) return f;
        const applied = extendMembershipPeriod(
          renewalBaseDate(member),
          fresh,
          f.directDebit,
        );
        return {
          ...f,
          periodKey: fresh.key,
          priceBranchFrequencyID: fresh.priceBranchFrequencyID,
          amount: applied.cost,
          newRenewalDate: applied.newRenewalDate,
        };
      });
    });
  };

  const handleMemberEditDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !memberEditForm) return;
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen (JPG, PNG, etc.).");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 6 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setMemberEditForm((f) =>
        f ? { ...f, idDocumentDataUrl: reader.result as string } : f,
      );
      toast.success("Documento actualizado en el formulario.");
    };
    reader.onerror = () => toast.error("No se pudo leer la imagen.");
    reader.readAsDataURL(file);
  };

  const saveMemberEdit = async (member: Member) => {
    if (!memberEditForm) return;
    const clientId = clientIdFromMemberId(member.id);
    if (!clientId) {
      toast.error("Este miembro no tiene ID de catálogo para actualizar.");
      return;
    }
    const firstName = memberEditForm.firstName.trim();
    const lastName = memberEditForm.lastName.trim();
    const national = memberEditForm.phoneNational.trim().replace(/\s+/g, " ");
    if (!firstName || !lastName || !national) {
      toast.error("Nombres y teléfono son obligatorios.");
      return;
    }
    const dial = memberEditForm.phoneCountryDial.trim();
    const phoneDisplay = `+${dial} ${national}`.replace(/\s+$/, "");

    setSavingMemberEdit(true);
    try {
      const result = await updateClientUseCase({
        clientID: clientId,
        firstName,
        lastName,
        email: memberEditForm.email.trim() || undefined,
        phoneNumber: national,
        phoneCodeNumber: dial,
        fullAddress: memberEditForm.address.trim() || undefined,
        planID: DEFAULT_MEMBER_PLAN_ID,
        enrollmentDate: memberEditForm.enrollmentDate,
        renewalDate: memberEditForm.renewalDate,
        idDocumentDataUrl: memberEditForm.idDocumentDataUrl,
        isDirectDebit: member.isDirectDebit === true,
        priceRegular:
          member.isDirectDebit === true ? 0 : (member.regularPrice ?? 0),
        priceDirectDebit:
          member.isDirectDebit === true ? (member.directDebitPrice ?? 0) : 0,
      });
      if (!result.ok) {
        toast.error("No se pudo actualizar", { description: result.message });
        return;
      }
      const row: Member = {
        ...result.member,
        phone: phoneDisplay,
        address: memberEditForm.address.trim() || undefined,
        idDocumentDataUrl: memberEditForm.idDocumentDataUrl ?? undefined,
      };
      setMembers((prev) => {
        const next = prev.map((m) => (m.id === member.id ? row : m));
        saveMembers(next);
        return next;
      });
      toast.success("Datos del miembro actualizados");
    } finally {
      setSavingMemberEdit(false);
    }
  };

  const registerSubscriptionPayment = async (opts: {
    memberId: string;
    memberName: string;
    amount: number;
    method: "CASH" | "CARD" | "QR";
    concept: SubscriptionConcept;
    periodKey?: string | null;
    /** Si es false, no guarda respaldo local: relanza el error para poder reintentar. */
    localFallback?: boolean;
  }): Promise<{ receipt: PosTicketReceipt; synced: boolean }> => {
    const payer = getSessionPayer();
    const checkoutInput = {
      memberId: opts.memberId,
      memberName: opts.memberName,
      amount: opts.amount,
      paymentMethod: opts.method,
      concept: opts.concept,
      periodKey: opts.periodKey ?? undefined,
      payerId: payer?.id,
      payerName: payer?.name,
    };
    try {
      const { receipt } =
        await getGymPosService().checkoutSubscription(checkoutInput);
      return { receipt, synced: true };
    } catch (error) {
      if (opts.localFallback === false) throw error;
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

  const applyRenewalDateLocally = (memberId: string, newRenewalDate: string) => {
    setMembers((prev) => {
      const next = prev.map((m) =>
        m.id === memberId ? { ...m, renewalDate: newRenewalDate } : m,
      );
      saveMembers(next);
      return next;
    });
  };

  /**
   * Renovación en dos etapas reintenables (mismo comportamiento que el alta):
   * 1) cobro POS (sin respaldo local; si falla, se reintenta solo el cobro),
   * 2) actualización de vigencia/precios en catálogo (si falla, el reintento
   *    salta el cobro y solo repite la actualización).
   */
  const submitRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalMember || submittingRenewal) return;

    const amount = parseFloat(paymentForm.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Ingresa un monto válido para la renovación.");
      return;
    }
    if (!paymentForm.newRenewalDate) {
      toast.error("Selecciona un periodo de vigencia.");
      return;
    }

    const member = paymentModalMember;
    const newRenewalDate = paymentForm.newRenewalDate;
    const isDirectDebit = paymentForm.directDebit;
    const debitOpt = isDirectDebit
      ? (findPeriodOption(directDebitOptions, paymentForm.periodKey) ??
        directDebitOptions[0])
      : undefined;
    const debitMonths =
      debitOpt?.months ?? (paymentForm.periodKey === "12m" ? 12 : 6);
    setSubmittingRenewal(true);

    try {
      // Etapa 1: cobro POS. En domiciliado no se cobra hoy: las mensualidades
      // se domicilian a tarjeta, por lo que se salta directo a la actualización.
      if (!renewalPaymentDone && !isDirectDebit) {
        try {
          const { receipt } = await registerSubscriptionPayment({
            memberId: member.id,
            memberName: memberFullName(member),
            amount,
            concept: "RENEWAL",
            method: paymentForm.method,
            periodKey: paymentForm.periodKey,
            localFallback: false,
          });
          setSubscriptionTicketReceipt(receipt);
          setRenewalPaymentDone(true);
        } catch (error) {
          toast.error("No se pudo registrar el cobro", {
            description: `${
              error instanceof Error
                ? error.message
                : "Error inesperado en el POS."
            } No se actualizó la vigencia; reintenta el cobro.`,
            duration: 12_000,
          });
          return;
        }
      }

      // Etapa 2: actualizar vigencia y precios en catálogo.
      const clientId = clientIdFromMemberId(member.id);
      if (clientId) {
        const digits = normalizePhoneDigits(member.phone ?? "");
        let dial = "52";
        let national = digits;
        if (digits.startsWith("52") && digits.length > 10) {
          national = digits.slice(2);
        }
        const updateResult = await updateClientUseCase({
          clientID: clientId,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          phoneNumber: national,
          phoneCodeNumber: dial,
          fullAddress: member.address,
          planID: DEFAULT_MEMBER_PLAN_ID,
          enrollmentDate: member.enrollmentDate,
          renewalDate: newRenewalDate,
          idDocumentDataUrl: member.idDocumentDataUrl,
          // Actualiza modalidad y precio según lo elegido en la renovación.
          isDirectDebit,
          priceRegular: isDirectDebit ? 0 : amount,
          priceDirectDebit: isDirectDebit ? amount : 0,
          priceBranchFrequencyID: paymentForm.priceBranchFrequencyID,
        });
        if (!updateResult.ok) {
          toast.warning(
            isDirectDebit
              ? "No se pudo actualizar la domiciliación"
              : "Cobro registrado; falta actualizar la vigencia",
            {
              description: `${updateResult.message} Reintenta: solo se repetirá la actualización${isDirectDebit ? "" : ", no el cobro"}.`,
              duration: 12_000,
            },
          );
          return;
        }
        setMembers((prev) => {
          const next = prev.map((m) =>
            m.id === member.id
              ? { ...updateResult.member, renewalDate: newRenewalDate }
              : m,
          );
          saveMembers(next);
          return next;
        });
      } else {
        applyRenewalDateLocally(member.id, newRenewalDate);
      }

      setPaymentModalMember(null);
      setRenewalPaymentDone(false);
      toast.success("Membresía renovada", {
        description: isDirectDebit
          ? `Domiciliado: ${debitMonths} cargos de $${amount.toFixed(2)} a tarjeta (total $${formatMxnAmount(amount * debitMonths)}).`
          : `Pago $${amount.toFixed(2)} registrado en POS.`,
      });
    } catch (error) {
      toast.error("No se pudo registrar la renovación", {
        description:
          error instanceof Error ? error.message : "Error inesperado al cobrar.",
      });
    } finally {
      setSubmittingRenewal(false);
    }
  };

  const clearStep1Error = (field: AddMemberStep1Field) => {
    setStep1Errors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const closeAddMemberModal = () => {
    setShowAddMemberModal(false);
    setAddMemberStep(1);
    setCreatedMemberSummary(null);
    setWizardMember(null);
    setWizardPaymentDone(false);
    setWizardSync(null);
    setBranchPrices([]);
    setBranchPricesLoading(false);
    setStep1Errors({});
    setShowPurchaseConfirmModal(false);
    setNewMemberForm(emptyNewMemberForm());
  };

  const openAddMemberModal = () => {
    setNewMemberForm(emptyNewMemberForm());
    setAddMemberStep(1);
    setCreatedMemberSummary(null);
    setWizardMember(null);
    setWizardPaymentDone(false);
    setWizardSync(null);
    setStep1Errors({});
    setShowPurchaseConfirmModal(false);
    setShowAddMemberModal(true);
    void loadBranchPrices();
  };

  const validateAddMemberStep1 = (): boolean => {
    const firstName = newMemberForm.firstName.trim();
    const lastName = newMemberForm.lastName.trim();
    const emailRaw = newMemberForm.email.trim();
    const emailNorm = emailRaw.toLowerCase();
    const dial = newMemberForm.phoneCountryDial.trim();
    const national = newMemberForm.phoneNational.trim().replace(/\s+/g, " ");
    const emergencyNational = newMemberForm.emergencyPhoneNational
      .trim()
      .replace(/\s+/g, " ");

    const errors: AddMemberStep1Errors = {};
    const messages: string[] = [];

    if (!firstName) {
      errors.firstName = "Falta indicar los nombres";
      messages.push("Nombres");
    }
    if (!lastName) {
      errors.lastName = "Falta indicar los apellidos";
      messages.push("Apellidos");
    }

    const hasMemberPhone = isValidNationalPhone(national);
    const hasEmergencyPhone = isValidNationalPhone(emergencyNational);
    const localDigits = normalizePhoneDigits(national);
    const fullDigits = localDigits ? `${dial}${localDigits}` : "";

    if (!national) {
      errors.phoneNational = "Falta el teléfono de contacto";
      messages.push("Teléfono de contacto");
    } else if (!hasMemberPhone || fullDigits.length < 11) {
      errors.phoneNational = "Revisa el número (mín. 10 dígitos)";
      messages.push("Teléfono de contacto incompleto");
    } else if (
      members.some((m) => normalizePhoneDigits(m.phone ?? "") === fullDigits)
    ) {
      errors.phoneNational = "Este número ya está registrado";
      messages.push("Ya existe un miembro con ese teléfono de contacto");
    }

    if (!emergencyNational) {
      errors.emergencyPhoneNational = "Falta el teléfono de emergencia";
      messages.push("Teléfono de emergencia");
    } else if (!hasEmergencyPhone) {
      errors.emergencyPhoneNational = "Revisa el número (mín. 10 dígitos)";
      messages.push("Teléfono de emergencia incompleto");
    } else {
      const emergencyDigits = normalizePhoneDigits(emergencyNational);
      const emergencyFullDigits = `${dial}${emergencyDigits}`;
      if (
        members.some(
          (m) => normalizePhoneDigits(m.phone ?? "") === emergencyFullDigits,
        )
      ) {
        errors.emergencyPhoneNational = "Este número ya está en uso";
        messages.push("El teléfono de emergencia ya está en uso");
      }
    }

    if (!emailNorm) {
      errors.email = "Falta indicar el correo electrónico";
      messages.push("Correo electrónico");
    } else {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm);
      if (!emailOk) {
        errors.email = "El formato del correo no es válido";
        messages.push("Correo electrónico no válido");
      } else if (
        members.some((m) => (m.email ?? "").toLowerCase() === emailNorm)
      ) {
        errors.email = "Este correo ya está registrado";
        messages.push("Ya existe un miembro con ese correo");
      }
    }

    setStep1Errors(errors);

    if (messages.length > 0) {
      toast.error("No se puede continuar", {
        description: `Completa: ${messages.join(", ")}.`,
        duration: 10_000,
      });
      return false;
    }

    return true;
  };

  const validateAddMemberStep2 = (): boolean => {
    if (!newMemberForm.selectedPeriodKey) {
      toast.error("Selecciona una vigencia de membresía.");
      return false;
    }
    if (newMemberForm.directDebit) {
      if (
        newMemberForm.selectedPeriodKey !== "6m" &&
        newMemberForm.selectedPeriodKey !== "12m"
      ) {
        toast.error("En pago domiciliado elige 6 o 12 meses.");
        return false;
      }
    }
    const enroll = newMemberForm.enrollmentDate;
    const renew = newMemberForm.renewalDate;
    const renewMax = renewalWindowMaxIso(enroll);
    if (renew < enroll || renew > renewMax) {
      toast.error(
        "La renovación debe estar entre la fecha de alta y como máximo 18 meses después.",
      );
      return false;
    }
    const membershipAmount = parseFloat(newMemberForm.membershipCost);
    if (Number.isNaN(membershipAmount) || membershipAmount <= 0) {
      toast.error(
        newMemberForm.directDebit
          ? "Indica un cobro mensual válido para la membresía domiciliada."
          : "Indica un costo válido para la membresía.",
      );
      return false;
    }
    if (newMemberForm.chargeSubscriptionFee) {
      const fee = parseFloat(newMemberForm.subscriptionFee);
      if (Number.isNaN(fee) || fee <= 0) {
        toast.error("Indica un monto válido para la cuota de suscripción.");
        return false;
      }
    }
    return true;
  };

  const goAddMemberNext = () => {
    if (addMemberStep === 1) {
      // Paso 1 es 100% local: valida y avanza; el alta se hace junto al cobro.
      if (!validateAddMemberStep1()) return;
      setStep1Errors({});
      setAddMemberStep(2);
      return;
    }
    if (addMemberStep === 2) {
      if (!validateAddMemberStep2()) return;
      if (wizardPaymentDone) {
        setAddMemberStep(3);
        return;
      }
      setShowPurchaseConfirmModal(true);
    }
  };

  const goAddMemberBack = () => {
    if (wizardSync) return;
    if (addMemberStep === 2) setAddMemberStep(1);
    else if (addMemberStep === 3) setAddMemberStep(2);
  };

  const buildClientFieldsFromForm = () => {
    const firstName = newMemberForm.firstName.trim();
    const lastName = newMemberForm.lastName.trim();
    const fullName = memberFullName({ firstName, lastName });
    const emailNorm = newMemberForm.email.trim().toLowerCase();
    const dial = newMemberForm.phoneCountryDial.trim();
    const national = newMemberForm.phoneNational.trim().replace(/\s+/g, " ");
    const emergencyNational = newMemberForm.emergencyPhoneNational
      .trim()
      .replace(/\s+/g, " ");
    const hasEmergencyPhone = isValidNationalPhone(emergencyNational);
    const phoneForApi = normalizePhoneDigits(national);
    const phoneDisplay = `+${dial} ${national}`.replace(/\s+$/, "");
    const membershipAmount = parseFloat(newMemberForm.membershipCost);
    const subscriptionFeeAmount = parseFloat(newMemberForm.subscriptionFee);
    const addressTrim = newMemberForm.address.trim();
    return {
      firstName,
      lastName,
      fullName,
      emailNorm,
      dial,
      national,
      emergencyNational,
      hasEmergencyPhone,
      phoneForApi,
      phoneDisplay,
      membershipAmount,
      subscriptionFeeAmount,
      addressTrim,
    };
  };

  /**
   * Etapa 1 del cobro: alta del cliente en catálogo.
   * Devuelve el miembro creado, o null si falló (no se intenta el cobro).
   * Idempotente: si ya existe `wizardMember`, lo reutiliza sin llamar al API.
   */
  const runWizardClientRegistration = async (
    f: ReturnType<typeof buildClientFieldsFromForm>,
  ): Promise<Member | null> => {
    if (wizardMember) return wizardMember;

    setWizardSync("client");
    try {
      const apiResult = await addClientUseCase({
        firstName: f.firstName,
        lastName: f.lastName,
        email: f.emailNorm,
        phoneNumber: f.phoneForApi,
        phoneCodeNumber: f.dial,
        emergencyPhoneNumber: f.hasEmergencyPhone
          ? f.emergencyNational
          : undefined,
        emergencyPhoneCodeNumber: f.hasEmergencyPhone ? f.dial : undefined,
        fullAddress: f.addressTrim || undefined,
        planID: DEFAULT_MEMBER_PLAN_ID,
        enrollmentDate: newMemberForm.enrollmentDate,
        renewalDate: newMemberForm.renewalDate,
        idDocumentDataUrl: newMemberForm.idDocumentDataUrl,
        isDirectDebit: newMemberForm.directDebit,
        priceRegular: newMemberForm.directDebit ? 0 : f.membershipAmount,
        priceDirectDebit: newMemberForm.directDebit ? f.membershipAmount : 0,
        priceBranchFrequencyID: newMemberForm.priceBranchFrequencyID,
        isPromotionalSubscription: !newMemberForm.chargeSubscriptionFee,
      });

      if (!apiResult.ok) {
        const statusSuffix =
          apiResult.statusCode != null && apiResult.statusCode > 0
            ? ` (HTTP ${apiResult.statusCode})`
            : "";
        toast.error(`No se pudo registrar el miembro${statusSuffix}`, {
          description: `${apiResult.message || "Sin detalle del servidor."} No se realizó ningún cobro.`,
          duration: 12_000,
        });
        return null;
      }

      const row: Member = {
        ...apiResult.member,
        phone: f.phoneDisplay,
        dateAdded: apiResult.member.dateAdded || new Date().toISOString(),
        ...(f.hasEmergencyPhone
          ? {
              emergencyPhone: `+${f.dial} ${f.emergencyNational}`.replace(
                /\s+$/,
                "",
              ),
            }
          : {}),
        ...(newMemberForm.idDocumentDataUrl
          ? { idDocumentDataUrl: newMemberForm.idDocumentDataUrl }
          : {}),
        ...(newMemberForm.directDebit
          ? {
              isDirectDebit: true,
              directDebitPrice: f.membershipAmount,
              regularPrice: 0,
            }
          : {
              isDirectDebit: false,
              regularPrice: f.membershipAmount,
              directDebitPrice: 0,
            }),
      };

      setWizardMember(row);
      setMembers((prev) => {
        const next = [row, ...prev];
        saveMembers(next);
        return next;
      });
      setMembersFromApi(true);
      setExpandedMember(row.id);
      setCurrentPage(1);
      return row;
    } catch (error) {
      toast.error("No se pudo registrar el miembro", {
        description: `${
          error instanceof Error
            ? error.message
            : "Error inesperado al guardar el miembro."
        } No se realizó ningún cobro.`,
        duration: 12_000,
      });
      return null;
    } finally {
      setWizardSync(null);
    }
  };

  /**
   * Etapa 2 del cobro: solo el pago en POS (sin respaldo local, para
   * poder reintentarlo). Devuelve true si el cobro quedó registrado.
   */
  const runWizardPayment = async (
    row: Member,
    f: ReturnType<typeof buildClientFieldsFromForm>,
  ): Promise<boolean> => {
    const posTotal =
      (newMemberForm.chargeSubscriptionFee ? f.subscriptionFeeAmount : 0) +
      (newMemberForm.directDebit ? 0 : f.membershipAmount);

    setWizardSync("payment");
    try {
      if (posTotal > 0) {
        const { receipt } = await registerSubscriptionPayment({
          memberId: row.id,
          memberName: f.fullName,
          amount: posTotal,
          concept: "MEMBERSHIP",
          method: newMemberForm.directDebit
            ? "CARD"
            : newMemberForm.paymentMethod,
          periodKey: newMemberForm.selectedPeriodKey,
          localFallback: false,
        });
        setSubscriptionTicketReceipt(receipt);
      }

      setWizardPaymentDone(true);
      setCreatedMemberSummary({
        id: row.id,
        name: f.fullName,
        faceIdEnrolled: Boolean(row.faceIdEnrolled),
        subscriptionPaid:
          posTotal > 0 && newMemberForm.chargeSubscriptionFee,
        subscriptionFee: newMemberForm.chargeSubscriptionFee
          ? f.subscriptionFeeAmount
          : 0,
        membershipAmount: f.membershipAmount,
        directDebit: newMemberForm.directDebit,
      });
      toast.success("Miembro registrado y cobro sincronizado", {
        description:
          posTotal > 0
            ? `${f.fullName} · Total $${posTotal.toFixed(2)}`
            : `${f.fullName} · Sin cobro POS en esta alta`,
      });
      return true;
    } catch (error) {
      toast.error("El alta se completó, pero falló el cobro", {
        description: `${
          error instanceof Error ? error.message : "Error inesperado en el POS."
        } Reintenta solo el cobro; el miembro no se duplicará.`,
        duration: 12_000,
      });
      return false;
    } finally {
      setWizardSync(null);
    }
  };

  /**
   * Paso 2: alta + cobro como etapas separadas y reintenables.
   * Si falla el alta, no se cobra. Si falla solo el cobro,
   * el reintento salta el alta y solo repite el pago.
   */
  const confirmPurchaseAndContinue = async () => {
    if (!validateAddMemberStep2()) return;
    if (wizardPaymentDone) {
      setShowPurchaseConfirmModal(false);
      setAddMemberStep(3);
      return;
    }

    const f = buildClientFieldsFromForm();

    const row = await runWizardClientRegistration(f);
    if (!row) return;

    const paid = await runWizardPayment(row, f);
    if (!paid) return;

    setShowPurchaseConfirmModal(false);
    setAddMemberStep(3);
  };

  /** Paso 3: Face ID (opcional). */
  const completeFaceIdStep = async (opts: { enrollFaceId: boolean }) => {
    if (!wizardMember) {
      toast.error("No hay miembro creado. Regresa al paso 1.");
      setAddMemberStep(1);
      return;
    }

    let row = wizardMember;
    const fullName = memberFullName(row);

    if (opts.enrollFaceId) {
      setWizardSync("faceid");
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
      } finally {
        setWizardSync(null);
      }
    }

    setWizardMember(row);
    setMembers((prev) => {
      const next = prev.map((m) => (m.id === row.id ? row : m));
      saveMembers(next);
      return next;
    });
    setCreatedMemberSummary((prev) =>
      prev
        ? { ...prev, faceIdEnrolled: Boolean(row.faceIdEnrolled) }
        : {
            id: row.id,
            name: fullName,
            faceIdEnrolled: Boolean(row.faceIdEnrolled),
            subscriptionPaid: wizardPaymentDone,
            subscriptionFee: newMemberForm.chargeSubscriptionFee
              ? parseFloat(newMemberForm.subscriptionFee) || 0
              : 0,
            membershipAmount: parseFloat(newMemberForm.membershipCost) || 0,
            directDebit: newMemberForm.directDebit,
          }
    );
    setFilterExpiry("ALL");
    setSearchTerm("");
    setAddMemberStep(4);
    toast.success("Alta completada", {
      description: `${fullName} · ${row.id}`,
    });
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
                        onClick={() => openRenewalModal(member)}
                        className="inline-flex items-center justify-center gap-2 bg-[#e31e24] text-white px-4 py-2.5 text-[10px] font-bold tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors"
                      >
                        <Wallet size={14} />
                        Renovar membresía
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
                        {member.isDirectDebit ? (
                          <p className="text-[#b8d4ff] text-[11px] mb-4 font-semibold">
                            Pago domiciliado
                            {member.directDebitPrice != null && member.directDebitPrice > 0
                              ? ` · $${member.directDebitPrice.toLocaleString("es-MX", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                              : ""}
                          </p>
                        ) : null}
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

                      {/* Estadísticas de actividad */}
                      <div className="w-full min-w-0 bg-[#2a2a2a] border border-[rgba(93,63,60,0.05)] p-5 sm:p-6 md:col-span-2 xl:col-span-1">
                        <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
                          Estadísticas de actividad
                        </p>
                        <div className="space-y-4">
                          <div>
                            <p className="text-[#808080] text-[10px] mb-1">Visitas del mes</p>
                            <p className="text-[#e5e2e1] text-[16px] font-black">{member.monthlyVisits}</p>
                          </div>
                          <div>
                            <p className="text-[#808080] text-[10px] mb-1">Tiempo promedio de sesión</p>
                            <p className="text-[#e5e2e1] text-[16px] font-black">{member.avgSessionTime} min</p>
                          </div>
                          <div>
                            <p className="text-[#808080] text-[10px] mb-1">Miembro desde</p>
                            <p className="text-[#e5e2e1] text-[14px] font-black">
                              {new Date(member.enrollmentDate).toLocaleDateString("es-MX", {
                                year: "numeric",
                                month: "short",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {memberEditForm && (
                      <div className="w-full min-w-0 bg-[#131313] border border-[rgba(93,63,60,0.12)] p-5 sm:p-6">
                        <p className="flex items-center gap-2 text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-5">
                          <Pencil size={14} />
                          Modificar datos del miembro
                        </p>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[#808080] text-[10px] uppercase block mb-1">Nombre</label>
                                <input
                                  type="text"
                                  value={memberEditForm.firstName}
                                  onChange={(e) =>
                                    setMemberEditForm((f) =>
                                      f ? { ...f, firstName: e.target.value } : f,
                                    )
                                  }
                                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2 text-[12px] focus:border-[#e31e24] focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[#808080] text-[10px] uppercase block mb-1">Apellidos</label>
                                <input
                                  type="text"
                                  value={memberEditForm.lastName}
                                  onChange={(e) =>
                                    setMemberEditForm((f) =>
                                      f ? { ...f, lastName: e.target.value } : f,
                                    )
                                  }
                                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2 text-[12px] focus:border-[#e31e24] focus:outline-none"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[#808080] text-[10px] uppercase block mb-1">Correo</label>
                              <input
                                type="email"
                                value={memberEditForm.email}
                                onChange={(e) =>
                                  setMemberEditForm((f) =>
                                    f ? { ...f, email: e.target.value } : f,
                                  )
                                }
                                className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2 text-[12px] focus:border-[#e31e24] focus:outline-none"
                              />
                            </div>
                            <div className="grid grid-cols-[80px_1fr] gap-2">
                              <div>
                                <label className="text-[#808080] text-[10px] uppercase block mb-1">Lada</label>
                                <input
                                  type="text"
                                  value={memberEditForm.phoneCountryDial}
                                  onChange={(e) =>
                                    setMemberEditForm((f) =>
                                      f ? { ...f, phoneCountryDial: e.target.value } : f,
                                    )
                                  }
                                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2 text-[12px] font-mono focus:border-[#e31e24] focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[#808080] text-[10px] uppercase block mb-1">Teléfono</label>
                                <input
                                  type="tel"
                                  value={memberEditForm.phoneNational}
                                  onChange={(e) =>
                                    setMemberEditForm((f) =>
                                      f ? { ...f, phoneNational: e.target.value } : f,
                                    )
                                  }
                                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2 text-[12px] font-mono focus:border-[#e31e24] focus:outline-none"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[#808080] text-[10px] uppercase block mb-1">Domicilio</label>
                              <textarea
                                value={memberEditForm.address}
                                onChange={(e) =>
                                  setMemberEditForm((f) =>
                                    f ? { ...f, address: e.target.value } : f,
                                  )
                                }
                                rows={2}
                                className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2 text-[12px] focus:border-[#e31e24] focus:outline-none resize-y"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[#808080] text-[10px] uppercase block mb-1">Alta</label>
                                <input
                                  type="date"
                                  value={memberEditForm.enrollmentDate}
                                  onChange={(e) =>
                                    setMemberEditForm((f) =>
                                      f ? { ...f, enrollmentDate: e.target.value } : f,
                                    )
                                  }
                                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2 text-[12px] focus:border-[#e31e24] focus:outline-none [color-scheme:dark]"
                                />
                              </div>
                              <div>
                                <label className="text-[#808080] text-[10px] uppercase block mb-1">Renovación</label>
                                <input
                                  type="date"
                                  value={memberEditForm.renewalDate}
                                  onChange={(e) =>
                                    setMemberEditForm((f) =>
                                      f ? { ...f, renewalDate: e.target.value } : f,
                                    )
                                  }
                                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2 text-[12px] focus:border-[#e31e24] focus:outline-none [color-scheme:dark]"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={savingMemberEdit}
                              onClick={() => void saveMemberEdit(member)}
                              className="w-full sm:w-auto bg-[#e31e24] text-white px-6 py-2.5 text-[10px] font-bold tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                            >
                              {savingMemberEdit ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                <Pencil size={14} />
                              )}
                              Guardar cambios
                            </button>
                          </div>

                          <div>
                            <p className="text-[#808080] text-[10px] uppercase tracking-wide mb-3">
                              Documentos cargados
                            </p>
                            {memberEditForm.idDocumentDataUrl ? (
                              <div className="space-y-3">
                                <a
                                  href={memberEditForm.idDocumentDataUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block rounded border border-[rgba(93,63,60,0.25)] overflow-hidden bg-[#0e0e0e] hover:border-[#e31e24]/50 transition-colors"
                                >
                                  <img
                                    src={memberEditForm.idDocumentDataUrl}
                                    alt={`Identificación ${member.id}`}
                                    className="w-full max-h-[280px] object-contain"
                                  />
                                </a>
                                <p className="text-[#808080] text-[10px]">
                                  Identificación oficial · clic para abrir en tamaño completo
                                </p>
                              </div>
                            ) : (
                              <p className="text-[#5a5a5a] text-[12px] mb-3">
                                No hay documentos en el expediente. Sube una identificación.
                              </p>
                            )}
                            <input
                              ref={memberEditFileRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleMemberEditDocument}
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => memberEditFileRef.current?.click()}
                                className="inline-flex items-center gap-2 bg-[#0e0e0e] border border-[rgba(93,63,60,0.25)] text-[#e5e2e1] px-4 py-2 text-[10px] font-bold uppercase tracking-wide hover:border-[#e31e24] transition-colors"
                              >
                                <Upload size={14} />
                                {memberEditForm.idDocumentDataUrl ? "Reemplazar documento" : "Subir documento"}
                              </button>
                              {memberEditForm.idDocumentDataUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMemberEditForm((f) =>
                                      f ? { ...f, idDocumentDataUrl: null } : f,
                                    )
                                  }
                                  className="text-[#808080] hover:text-[#e31e24] text-[10px] font-bold uppercase tracking-wide px-2"
                                >
                                  Quitar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
          <div className="bg-[#131313] border border-[rgba(93,63,60,0.2)] p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
                  Renovación de membresía
                </p>
                <h3 className="text-[#e5e2e1] text-[16px] font-black uppercase leading-tight">
                  {memberFullName(paymentModalMember)}
                </h3>
                <p className="text-[#808080] text-[11px] font-mono mt-1">{paymentModalMember.id}</p>
                <p className="text-[#a8a4a3] text-[11px] mt-2">
                  Vigencia actual hasta{" "}
                  <span className="text-[#e5e2e1] font-bold">
                    {formatRenewalDate(paymentModalMember.renewalDate)}
                  </span>
                </p>
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
            <form onSubmit={submitRenewal} className="space-y-4">
              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  Forma de pago
                  {branchPricesLoading ? (
                    <span className="ml-2 inline-flex items-center gap-1 font-medium normal-case tracking-normal text-[#5a5a5a]">
                      <Loader2 className="animate-spin" size={12} />
                      precios…
                    </span>
                  ) : null}
                </label>
                <div className="flex border border-[rgba(93,63,60,0.25)] overflow-hidden">
                  <button
                    type="button"
                    disabled={renewalPaymentDone}
                    onClick={() => {
                      const opt =
                        findPeriodOption(directPayOptions, "1m") ??
                        directPayOptions[0];
                      if (!opt) return;
                      const base = renewalBaseDate(paymentModalMember);
                      const { newRenewalDate, cost } = extendMembershipPeriod(
                        base,
                        opt,
                      );
                      setPaymentForm((f) => ({
                        ...f,
                        directDebit: false,
                        periodKey: opt.key,
                        priceBranchFrequencyID: opt.priceBranchFrequencyID,
                        amount: cost,
                        newRenewalDate,
                      }));
                    }}
                    className={`flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      !paymentForm.directDebit
                        ? "bg-[#e31e24]/15 text-white border-b-2 border-[#e31e24]"
                        : "bg-[#0e0e0e] text-[#808080] hover:text-[#e5e2e1]"
                    }`}
                  >
                    Pago directo
                  </button>
                  <button
                    type="button"
                    disabled={renewalPaymentDone}
                    onClick={() => {
                      const opt =
                        findPeriodOption(
                          directDebitOptions,
                          paymentForm.periodKey === "12m" ? "12m" : "6m",
                        ) ?? directDebitOptions[0];
                      if (!opt) return;
                      const base = renewalBaseDate(paymentModalMember);
                      const { newRenewalDate, cost } = extendMembershipPeriod(
                        base,
                        opt,
                        true,
                      );
                      setPaymentForm((f) => ({
                        ...f,
                        directDebit: true,
                        method: "CARD",
                        periodKey: opt.key,
                        priceBranchFrequencyID: opt.priceBranchFrequencyID,
                        amount: cost,
                        newRenewalDate,
                      }));
                    }}
                    className={`flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      paymentForm.directDebit
                        ? "bg-[#e31e24]/15 text-white border-b-2 border-[#e31e24]"
                        : "bg-[#0e0e0e] text-[#808080] hover:text-[#e5e2e1]"
                    }`}
                  >
                    Domiciliado
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  Periodo de vigencia
                  {paymentForm.directDebit ? (
                    <span className="ml-1 font-medium normal-case tracking-normal text-[#5a5a5a]">
                      · precio = cobro mensual
                    </span>
                  ) : null}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(paymentForm.directDebit
                    ? directDebitOptions
                    : directPayOptions
                  ).map((opt) => {
                    const active = paymentForm.periodKey === opt.key;
                    return (
                      <button
                        key={opt.priceBranchFrequencyID}
                        type="button"
                        disabled={renewalPaymentDone}
                        onClick={() => {
                          const base = renewalBaseDate(paymentModalMember);
                          const { newRenewalDate, cost } =
                            extendMembershipPeriod(
                              base,
                              opt,
                              paymentForm.directDebit,
                            );
                          setPaymentForm((f) => ({
                            ...f,
                            periodKey: opt.key,
                            priceBranchFrequencyID: opt.priceBranchFrequencyID,
                            amount: cost,
                            newRenewalDate,
                          }));
                        }}
                        className={`px-3 py-2 text-[10px] font-bold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          active
                            ? "bg-[#e31e24]/15 border-[#e31e24]/50 text-white"
                            : "bg-[#0e0e0e] border-[rgba(93,63,60,0.25)] text-[#e5e2e1] hover:border-[#e31e24]"
                        }`}
                      >
                        <span className="block uppercase tracking-wide">{opt.label}</span>
                        <span className="block text-[11px] mt-0.5 tabular-nums">
                          $
                          {formatMxnAmount(
                            paymentForm.directDebit
                              ? opt.priceDirectDebit
                              : opt.priceRegular,
                          )}
                          {paymentForm.directDebit ? "/mes" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.15)] px-4 py-3">
                <p className="text-[#808080] text-[10px] uppercase tracking-wide mb-1">
                  Nueva vigencia hasta
                </p>
                <p className="text-[#e5e2e1] text-[15px] font-black">
                  {formatRenewalDate(paymentForm.newRenewalDate)}
                </p>
              </div>
              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  {paymentForm.directDebit
                    ? "Cobro mensual (MXN)"
                    : "Monto (MXN)"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.amount}
                  disabled={renewalPaymentDone}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none font-['Space_Grotesk',sans-serif] disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                />
                <p className="text-[#5a5a5a] text-[10px] mt-1">
                  Se actualiza al elegir el periodo; puedes ajustarlo si aplica descuento.
                </p>
              </div>
              {paymentForm.directDebit ? (
                <div className="rounded-sm border border-[rgba(93,63,60,0.2)] bg-[#0e0e0e] px-3 py-2.5 text-[11px]">
                  <p className="text-[#808080] text-[9px] font-bold uppercase tracking-wide mb-1.5">
                    Simulación de cobro domiciliado
                  </p>
                  {(() => {
                    const opt =
                      findPeriodOption(
                        directDebitOptions,
                        paymentForm.periodKey,
                      ) ?? directDebitOptions[0];
                    const months =
                      opt?.months ?? (paymentForm.periodKey === "12m" ? 12 : 6);
                    const monthly = parseFloat(paymentForm.amount) || 0;
                    return (
                      <ul className="space-y-1 text-[#b0b0b0]">
                        <li className="flex justify-between gap-2">
                          <span>
                            {months} cargos × ${formatMxnAmount(monthly)}
                          </span>
                          <span className="tabular-nums font-bold text-[#e5e2e1]">
                            ${formatMxnAmount(monthly * months)}
                          </span>
                        </li>
                        <li className="flex justify-between gap-2 border-t border-[rgba(93,63,60,0.15)] pt-1.5 text-[#e5e2e1]">
                          <span className="font-bold">
                            Total proyectado en el periodo
                          </span>
                          <span className="tabular-nums font-black text-[#e31e24]">
                            ${formatMxnAmount(monthly * months)}
                          </span>
                        </li>
                      </ul>
                    );
                  })()}
                  <p className="text-[#5a5a5a] text-[10px] mt-2 leading-relaxed">
                    Los cargos se domicilian a tarjeta; hoy no se registra cobro
                    en el POS.
                  </p>
                </div>
              ) : null}
              {renewalPaymentDone ? (
                <div className="rounded-sm border border-[#e31e24]/40 bg-[#e31e24]/10 px-3 py-2.5 text-[11px] text-[#ffb4ae] leading-relaxed">
                  El cobro ya quedó registrado en el POS. Al reintentar solo se
                  actualizará la vigencia; no se cobrará de nuevo.
                </div>
              ) : null}
              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  Método de pago
                  {paymentForm.directDebit ? (
                    <span className="ml-1 font-medium normal-case tracking-normal text-[#5a5a5a]">
                      · domiciliado a tarjeta
                    </span>
                  ) : null}
                </label>
                <select
                  value={paymentForm.directDebit ? "CARD" : paymentForm.method}
                  disabled={renewalPaymentDone || paymentForm.directDebit}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      method: e.target.value as typeof paymentForm.method,
                    })
                  }
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
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
                  disabled={submittingRenewal}
                  className="flex-1 bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {submittingRenewal ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Procesando…
                    </>
                  ) : renewalPaymentDone ? (
                    "Reintentar actualización"
                  ) : (
                    "Confirmar renovación"
                  )}
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
              if (
                e.target === e.currentTarget &&
                addMemberStep !== 4 &&
                !wizardSync
              ) {
                closeAddMemberModal();
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-member-title"
              className={`relative w-full min-w-0 shrink-0 border border-[rgba(93,63,60,0.2)] bg-[#131313] p-5 shadow-2xl sm:p-6 md:p-8 ${
                addMemberStep === 2
                  ? "max-w-lg lg:max-w-5xl lg:h-[min(720px,88dvh)] lg:flex lg:flex-col"
                  : "max-w-lg lg:max-w-3xl"
              }`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {wizardSync ? (
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#131313]/92 px-6"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="animate-spin text-[#e31e24]" size={36} />
                  <p className="text-[#e5e2e1] text-[12px] font-bold tracking-[1.5px] uppercase text-center">
                    {wizardSync === "client" && "Sincronizando cliente…"}
                    {wizardSync === "payment" && "Sincronizando cobro…"}
                    {wizardSync === "faceid" && "Sincronizando Face ID…"}
                  </p>
                </div>
              ) : null}

              <div className="mb-5 flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
                    Nuevo miembro
                  </p>
                  <h3
                    id="add-member-title"
                    className="text-[#e5e2e1] text-[clamp(1.125rem,4vw,1.375rem)] font-black uppercase tracking-tight break-words"
                  >
                    {addMemberStep === 1 && "Datos del cliente"}
                    {addMemberStep === 2 && "Suscripción y membresía"}
                    {addMemberStep === 3 && "Alta Face ID"}
                    {addMemberStep === 4 && "Alta completada"}
                  </h3>
                </div>
                {addMemberStep !== 4 ? (
                  <button
                    type="button"
                    onClick={closeAddMemberModal}
                    disabled={Boolean(wizardSync)}
                    className="text-[#808080] hover:text-[#e31e24] transition-colors shrink-0 rounded p-0.5 disabled:opacity-40"
                    aria-label="Cerrar"
                  >
                    <X size={22} />
                  </button>
                ) : null}
              </div>

              {/* Stepper */}
              <ol className="mb-6 flex flex-wrap items-center gap-2 sm:gap-3">
                {ADD_MEMBER_WIZARD_STEPS.map(({ step, label, optional }) => {
                  const done = addMemberStep > step;
                  const active = addMemberStep === step;
                  return (
                    <li key={step} className="flex items-center gap-2 min-w-0">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          done
                            ? "bg-[#e31e24] text-white"
                            : active
                              ? "bg-[#e31e24]/20 text-[#e31e24] ring-1 ring-[#e31e24]/50"
                              : "bg-[#0e0e0e] text-[#5a5a5a] ring-1 ring-[rgba(93,63,60,0.25)]"
                        }`}
                      >
                        {done ? <Check size={14} /> : step}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide ${
                          active ? "text-[#e5e2e1]" : "text-[#5a5a5a]"
                        }`}
                      >
                        {label}
                        {optional ? (
                          <span className="ml-1 font-medium normal-case text-[#4a4a4a]">
                            (opc.)
                          </span>
                        ) : null}
                      </span>
                      {step < 4 ? (
                        <span className="hidden sm:inline text-[#393939] mx-1">/</span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>

              {/* Paso 1: datos */}
              {addMemberStep === 1 && (
                <div className="min-w-0 space-y-4">
                  <p className="text-[#808080] text-[11px] leading-relaxed">
                    Obligatorios (*): nombres, apellidos, teléfono de contacto, teléfono de
                    emergencia y correo. La identificación es opcional.
                  </p>
                  {Object.keys(step1Errors).length > 0 ? (
                    <div
                      role="alert"
                      className="rounded-sm border border-[#e31e24]/45 bg-[#e31e24]/10 px-3 py-2.5 text-[11px] text-[#ff8a80] leading-relaxed"
                    >
                      <p className="font-bold uppercase tracking-wide text-[#ff6b6b] mb-1.5">
                        No se puede continuar
                      </p>
                      <p className="text-[#ffb4ae] mb-2">
                        Completa estos datos para pasar al siguiente paso:
                      </p>
                      <ul className="space-y-1">
                        {(
                          Object.entries(step1Errors) as [
                            AddMemberStep1Field,
                            string,
                          ][]
                        ).map(([key, msg]) => (
                          <li key={key} className="flex gap-2">
                            <span className="text-[#e31e24] shrink-0">•</span>
                            <span>
                              <span className="font-semibold text-[#ffc9c4]">
                                {STEP1_FIELD_LABELS[key]}:
                              </span>{" "}
                              {msg}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="min-w-0">
                      <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                        Nombres <span className="text-[#e31e24]">*</span>
                      </label>
                      <input
                        type="text"
                        value={newMemberForm.firstName}
                        onChange={(e) => {
                          clearStep1Error("firstName");
                          setNewMemberForm({ ...newMemberForm, firstName: e.target.value });
                        }}
                        placeholder="Ej. Ana María"
                        aria-invalid={Boolean(step1Errors.firstName)}
                        className={`w-full min-w-0 box-border bg-[#0e0e0e] border text-[#e5e2e1] px-4 py-3 focus:outline-none text-[13px] sm:text-[14px] ${
                          step1Errors.firstName ? fieldErrorClass : fieldOkClass
                        }`}
                        autoFocus
                      />
                      {step1Errors.firstName ? (
                        <p className="mt-1 text-[10px] text-[#ff6b6b]">{step1Errors.firstName}</p>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                        Apellidos <span className="text-[#e31e24]">*</span>
                      </label>
                      <input
                        type="text"
                        value={newMemberForm.lastName}
                        onChange={(e) => {
                          clearStep1Error("lastName");
                          setNewMemberForm({ ...newMemberForm, lastName: e.target.value });
                        }}
                        placeholder="Ej. García López"
                        aria-invalid={Boolean(step1Errors.lastName)}
                        className={`w-full min-w-0 box-border bg-[#0e0e0e] border text-[#e5e2e1] px-4 py-3 focus:outline-none text-[13px] sm:text-[14px] ${
                          step1Errors.lastName ? fieldErrorClass : fieldOkClass
                        }`}
                      />
                      {step1Errors.lastName ? (
                        <p className="mt-1 text-[10px] text-[#ff6b6b]">{step1Errors.lastName}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="flex items-center gap-2 text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                      <MessageCircle size={12} className="text-[#25d366] shrink-0" />
                      WhatsApp / teléfono del miembro{" "}
                      <span className="text-[#e31e24]">*</span>
                    </label>
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                      <div ref={phonePrefixRef} className="relative w-full shrink-0 sm:w-[5.25rem]">
                        <button
                          type="button"
                          onClick={() => setPhonePrefixMenuOpen((o) => !o)}
                          className={`flex h-full min-h-[46px] w-full items-center justify-between gap-1 border bg-[#0e0e0e] px-2.5 py-3 text-left text-[#e5e2e1] focus:outline-none text-[13px] ${
                            step1Errors.phoneNational ? fieldErrorClass : fieldOkClass
                          }`}
                          aria-expanded={phonePrefixMenuOpen}
                        >
                          <span className="font-mono tabular-nums">
                            +{newMemberForm.phoneCountryDial}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`shrink-0 text-[#808080] transition-transform ${
                              phonePrefixMenuOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {phonePrefixMenuOpen ? (
                          <ul
                            role="listbox"
                            className="absolute left-0 right-0 z-30 mt-1 max-h-48 overflow-auto border border-[rgba(93,63,60,0.25)] bg-[#0e0e0e] py-1 shadow-xl sm:min-w-[14rem]"
                          >
                            {PHONE_COUNTRY_PREFIXES.map((p) => (
                              <li key={p.dial} role="none">
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={newMemberForm.phoneCountryDial === p.dial}
                                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[12px] hover:bg-[#1a1a1a] ${
                                    newMemberForm.phoneCountryDial === p.dial
                                      ? "bg-[#1a1a1a] text-[#e31e24]"
                                      : "text-[#e5e2e1]"
                                  }`}
                                  onClick={() => {
                                    setNewMemberForm({
                                      ...newMemberForm,
                                      phoneCountryDial: p.dial,
                                    });
                                    setPhonePrefixMenuOpen(false);
                                  }}
                                >
                                  <span className="text-[#b0b0b0]">{p.country}</span>
                                  <span className="font-mono">+{p.dial}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={newMemberForm.phoneNational}
                        onChange={(e) => {
                          clearStep1Error("phoneNational");
                          setNewMemberForm({
                            ...newMemberForm,
                            phoneNational: e.target.value,
                          });
                        }}
                        placeholder="55 1234 5678"
                        aria-invalid={Boolean(step1Errors.phoneNational)}
                        className={`min-w-0 flex-1 box-border border bg-[#0e0e0e] px-4 py-3 text-[#e5e2e1] focus:outline-none text-[13px] ${
                          step1Errors.phoneNational ? fieldErrorClass : fieldOkClass
                        }`}
                      />
                    </div>
                    {step1Errors.phoneNational ? (
                      <p className="mt-1 text-[10px] text-[#ff6b6b]">
                        {step1Errors.phoneNational}
                      </p>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <label className="flex items-center gap-2 text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                      <Phone size={12} className="text-[#e31e24] shrink-0" />
                      Teléfono de emergencia <span className="text-[#e31e24]">*</span>
                    </label>
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                      <div
                        className={`flex min-h-[46px] w-full sm:w-[5.25rem] items-center justify-center border bg-[#131313] px-2.5 font-mono text-[#808080] text-[13px] ${
                          step1Errors.emergencyPhoneNational
                            ? "border-[#e31e24]/70"
                            : "border-[rgba(93,63,60,0.2)]"
                        }`}
                      >
                        +{newMemberForm.phoneCountryDial}
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={newMemberForm.emergencyPhoneNational}
                        onChange={(e) => {
                          clearStep1Error("emergencyPhoneNational");
                          setNewMemberForm({
                            ...newMemberForm,
                            emergencyPhoneNational: e.target.value,
                          });
                        }}
                        placeholder="Contacto de emergencia"
                        aria-invalid={Boolean(step1Errors.emergencyPhoneNational)}
                        className={`min-w-0 flex-1 box-border border bg-[#0e0e0e] px-4 py-3 text-[#e5e2e1] focus:outline-none text-[13px] ${
                          step1Errors.emergencyPhoneNational
                            ? fieldErrorClass
                            : fieldOkClass
                        }`}
                      />
                    </div>
                    {step1Errors.emergencyPhoneNational ? (
                      <p className="mt-1 text-[10px] text-[#ff6b6b]">
                        {step1Errors.emergencyPhoneNational}
                      </p>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                      Correo electrónico <span className="text-[#e31e24]">*</span>
                    </label>
                    <input
                      type="email"
                      value={newMemberForm.email}
                      onChange={(e) => {
                        clearStep1Error("email");
                        setNewMemberForm({ ...newMemberForm, email: e.target.value });
                      }}
                      placeholder="correo@ejemplo.com"
                      aria-invalid={Boolean(step1Errors.email)}
                      className={`w-full box-border bg-[#0e0e0e] border text-[#e5e2e1] px-4 py-3 focus:outline-none text-[13px] ${
                        step1Errors.email ? fieldErrorClass : fieldOkClass
                      }`}
                    />
                    {step1Errors.email ? (
                      <p className="mt-1 text-[10px] text-[#ff6b6b]">{step1Errors.email}</p>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <label className="flex items-center gap-2 text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                      <MapPin size={12} className="text-[#e31e24] shrink-0" />
                      Domicilio
                    </label>
                    <textarea
                      value={newMemberForm.address}
                      onChange={(e) =>
                        setNewMemberForm({ ...newMemberForm, address: e.target.value })
                      }
                      placeholder="Calle, número, colonia, CP, ciudad, estado"
                      rows={3}
                      className="w-full box-border bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none text-[13px] resize-y min-h-[80px] placeholder:text-[#5a5a5a]"
                    />
                  </div>

                  <div className="min-w-0 overflow-hidden rounded-sm bg-[#0e0e0e] border border-[rgba(93,63,60,0.15)] p-4">
                    <p className="flex items-center gap-2 text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase">
                      <IdCard size={14} className="text-[#e31e24]" />
                      Identificación oficial{" "}
                      <span className="font-normal normal-case text-[#5a5a5a]">(opcional)</span>
                    </p>
                    <p className="mt-2 text-[#5a5a5a] text-[9px] leading-relaxed">
                      Puedes adjuntarla después. Importa archivo o toma foto con la cámara.
                    </p>
                    <input
                      ref={idFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleIdDocumentFile}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => idFileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wide bg-[#131313] border border-[rgba(93,63,60,0.25)] text-[#e5e2e1] hover:border-[#e31e24]"
                      >
                        <Upload size={14} />
                        Importar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowIdCameraModal(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wide bg-[#131313] border border-[rgba(93,63,60,0.25)] text-[#e5e2e1] hover:border-[#e31e24]"
                      >
                        <Camera size={14} />
                        Tomar foto
                      </button>
                      {newMemberForm.idDocumentDataUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setNewMemberForm((f) => ({ ...f, idDocumentDataUrl: null }))
                          }
                          className="inline-flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase text-[#808080] hover:text-[#e31e24]"
                        >
                          Quitar
                        </button>
                      ) : null}
                    </div>
                    {newMemberForm.idDocumentDataUrl ? (
                      <div className="mt-3 max-h-[180px] overflow-hidden rounded border border-[rgba(93,63,60,0.2)] bg-[#131313]">
                        <img
                          src={newMemberForm.idDocumentDataUrl}
                          alt="Vista previa identificación"
                          className="w-full h-auto max-h-[180px] object-contain"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Paso 2: cuota de entrada + membresía */}
              {addMemberStep === 2 && (
                <div className="min-w-0 flex-1 min-h-0 lg:overflow-y-auto lg:pr-1">
                <div className="min-w-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:gap-8 lg:items-start">
                  <div className="min-w-0 space-y-4">
                    {/* Suscripción compacta */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-sm border border-[rgba(93,63,60,0.15)] bg-[#0e0e0e] px-3 py-2.5">
                      <Wallet size={14} className="text-[#e31e24] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[#e5e2e1] text-[11px] font-bold uppercase tracking-wide leading-none">
                          Suscripción
                        </p>
                        <p className="text-[#5a5a5a] text-[9px] mt-0.5">
                          Cuota de entrada · opcional
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={newMemberForm.chargeSubscriptionFee}
                        aria-label="Cobrar cuota de suscripción"
                        onClick={() => {
                          setNewMemberForm((f) => ({
                            ...f,
                            chargeSubscriptionFee: !f.chargeSubscriptionFee,
                          }));
                        }}
                        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${
                          newMemberForm.chargeSubscriptionFee
                            ? "bg-[#e31e24]"
                            : "bg-[#2a2a2a]"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                            newMemberForm.chargeSubscriptionFee
                              ? "translate-x-4"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                      <div
                        className={`w-full sm:w-auto sm:min-w-[9.5rem] transition-opacity ${
                          newMemberForm.chargeSubscriptionFee
                            ? "opacity-100"
                            : "opacity-40"
                        }`}
                      >
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#808080]">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={!newMemberForm.chargeSubscriptionFee}
                            value={newMemberForm.subscriptionFee}
                            onChange={(e) =>
                              setNewMemberForm((f) => ({
                                ...f,
                                subscriptionFee: e.target.value,
                              }))
                            }
                            className="w-full box-border bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] pl-6 pr-3 py-2 focus:border-[#e31e24] focus:outline-none text-[13px] font-bold tabular-nums disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tabs membresía */}
                    <div>
                      <p className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                        Membresía
                        {branchPricesLoading ? (
                          <span className="ml-2 inline-flex items-center gap-1 font-medium normal-case tracking-normal text-[#5a5a5a]">
                            <Loader2 className="animate-spin" size={12} />
                            precios…
                          </span>
                        ) : null}
                      </p>
                      <div className="flex border border-[rgba(93,63,60,0.25)] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            const opt =
                              findPeriodOption(
                                directPayOptions,
                                newMemberForm.selectedPeriodKey,
                              ) ??
                              findPeriodOption(directPayOptions, "1m") ??
                              directPayOptions[0];
                            const {
                              renewalDate,
                              cost,
                              priceBranchFrequencyID,
                            } = applySubscriptionPeriod(
                              newMemberForm.enrollmentDate,
                              opt,
                            );
                            setNewMemberForm((f) => ({
                              ...f,
                              directDebit: false,
                              chargeSubscriptionFee: true,
                              selectedPeriodKey: opt.key,
                              priceBranchFrequencyID,
                              renewalDate,
                              membershipCost: cost,
                            }));
                          }}
                          className={`flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                            !newMemberForm.directDebit
                              ? "bg-[#e31e24]/15 text-white border-b-2 border-[#e31e24]"
                              : "bg-[#0e0e0e] text-[#808080] hover:text-[#e5e2e1]"
                          }`}
                        >
                          Pago directo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const opt =
                              findPeriodOption(
                                directDebitOptions,
                                newMemberForm.selectedPeriodKey === "12m"
                                  ? "12m"
                                  : "6m",
                              ) ?? directDebitOptions[0];
                            if (!opt) return;
                            const { renewalDate, monthlyPrice } =
                              applyDirectDebitPeriod(
                                newMemberForm.enrollmentDate,
                                opt,
                              );
                            setNewMemberForm((f) => ({
                              ...f,
                              directDebit: true,
                              chargeSubscriptionFee: false,
                              paymentMethod: "CARD",
                              selectedPeriodKey: opt.key,
                              priceBranchFrequencyID: opt.priceBranchFrequencyID,
                              renewalDate,
                              membershipCost: monthlyPrice.toFixed(2),
                            }));
                          }}
                          className={`flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                            newMemberForm.directDebit
                              ? "bg-[#e31e24]/15 text-white border-b-2 border-[#e31e24]"
                              : "bg-[#0e0e0e] text-[#808080] hover:text-[#e5e2e1]"
                          }`}
                        >
                          Domiciliado
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                        Vigencia
                        {newMemberForm.directDebit ? (
                          <span className="ml-1 font-medium normal-case tracking-normal text-[#5a5a5a]">
                            · precio = cobro mensual
                          </span>
                        ) : null}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {newMemberForm.directDebit
                          ? directDebitOptions.map((opt) => {
                              const active =
                                newMemberForm.selectedPeriodKey === opt.key;
                              const months = opt.months ?? 6;
                              const monthly = opt.priceDirectDebit;
                              return (
                                <button
                                  key={opt.priceBranchFrequencyID}
                                  type="button"
                                  onClick={() => {
                                    const { renewalDate, monthlyPrice } =
                                      applyDirectDebitPeriod(
                                        newMemberForm.enrollmentDate,
                                        opt,
                                      );
                                    setNewMemberForm((f) => ({
                                      ...f,
                                      selectedPeriodKey: opt.key,
                                      priceBranchFrequencyID:
                                        opt.priceBranchFrequencyID,
                                      renewalDate,
                                      membershipCost: monthlyPrice.toFixed(2),
                                    }));
                                  }}
                                  className={`min-w-[6rem] px-3 py-2 text-left border transition-colors ${
                                    active
                                      ? "bg-[#e31e24]/15 border-[#e31e24]/50 text-white"
                                      : "bg-[#0e0e0e] border-[rgba(93,63,60,0.25)] text-[#e5e2e1] hover:border-[#e31e24]"
                                  }`}
                                >
                                  <span className="block text-[10px] font-bold uppercase tracking-wide">
                                    {opt.label}
                                  </span>
                                  <span className="block text-[12px] font-bold tabular-nums mt-0.5 text-[#e31e24]">
                                    ${formatMxnAmount(monthly)}
                                    <span className="text-[9px] font-medium text-[#808080]">
                                      /mes
                                    </span>
                                  </span>
                                  <span className="block text-[9px] text-[#5a5a5a] mt-0.5 tabular-nums">
                                    ≈ ${formatMxnAmount(monthly * months)} total
                                  </span>
                                </button>
                              );
                            })
                          : directPayOptions.map((opt) => {
                              const active =
                                newMemberForm.selectedPeriodKey === opt.key;
                              return (
                                <button
                                  key={opt.priceBranchFrequencyID}
                                  type="button"
                                  onClick={() => {
                                    const {
                                      renewalDate,
                                      cost,
                                      priceBranchFrequencyID,
                                    } = applySubscriptionPeriod(
                                      newMemberForm.enrollmentDate,
                                      opt,
                                    );
                                    setNewMemberForm((f) => ({
                                      ...f,
                                      selectedPeriodKey: opt.key,
                                      priceBranchFrequencyID,
                                      renewalDate,
                                      membershipCost: cost,
                                    }));
                                  }}
                                  className={`min-w-[5.5rem] px-3 py-2 text-left border transition-colors ${
                                    active
                                      ? "bg-[#e31e24]/15 border-[#e31e24]/50 text-white"
                                      : "bg-[#0e0e0e] border-[rgba(93,63,60,0.25)] text-[#e5e2e1] hover:border-[#e31e24]"
                                  }`}
                                >
                                  <span className="block text-[10px] font-bold uppercase tracking-wide">
                                    {opt.label}
                                  </span>
                                  <span className="block text-[12px] font-bold tabular-nums mt-0.5 text-[#e31e24]">
                                    ${formatMxnAmount(opt.priceRegular)}
                                  </span>
                                </button>
                              );
                            })}
                      </div>
                    </div>

                    {newMemberForm.directDebit &&
                    (newMemberForm.selectedPeriodKey === "6m" ||
                      newMemberForm.selectedPeriodKey === "12m") ? (
                      <div className="rounded-sm border border-[rgba(93,63,60,0.2)] bg-[#131313] px-3 py-2.5 text-[11px] min-h-[108px]">
                        <p className="text-[#808080] text-[9px] font-bold uppercase tracking-wide mb-1.5">
                          Simulación de cobro domiciliado
                        </p>
                        {(() => {
                          const opt =
                            findPeriodOption(
                              directDebitOptions,
                              newMemberForm.selectedPeriodKey,
                            ) ?? directDebitOptions[0];
                          if (!opt) return null;
                          const sim = applyDirectDebitPeriod(
                            newMemberForm.enrollmentDate,
                            opt,
                          );
                          const feeOn = newMemberForm.chargeSubscriptionFee
                            ? parseFloat(newMemberForm.subscriptionFee) || 0
                            : 0;
                          return (
                            <ul className="space-y-1 text-[#b0b0b0]">
                              <li className="flex justify-between gap-2">
                                <span>
                                  {sim.months} cargos × $
                                  {formatMxnAmount(sim.monthlyPrice)}
                                </span>
                                <span className="tabular-nums font-bold text-[#e5e2e1]">
                                  ${formatMxnAmount(sim.projectedTotal)}
                                </span>
                              </li>
                              {feeOn > 0 ? (
                                <li className="flex justify-between gap-2">
                                  <span>Cuota de suscripción (hoy)</span>
                                  <span className="tabular-nums font-bold text-[#e5e2e1]">
                                    ${formatMxnAmount(feeOn)}
                                  </span>
                                </li>
                              ) : null}
                              <li className="flex justify-between gap-2 border-t border-[rgba(93,63,60,0.15)] pt-1.5 text-[#e5e2e1]">
                                <span className="font-bold">
                                  Proyectado en el periodo
                                </span>
                                <span className="tabular-nums font-black text-[#e31e24]">
                                  ${formatMxnAmount(sim.projectedTotal + feeOn)}
                                </span>
                              </li>
                            </ul>
                          );
                        })()}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="min-w-0">
                        <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-1.5">
                          Alta
                        </label>
                        <input
                          type="date"
                          value={newMemberForm.enrollmentDate}
                          onChange={(e) => {
                            const ed = e.target.value;
                            setNewMemberForm((f) => {
                              if (f.directDebit) {
                                const opt =
                                  findPeriodOption(
                                    directDebitOptions,
                                    f.selectedPeriodKey,
                                  ) ?? directDebitOptions[0];
                                if (!opt) {
                                  return { ...f, enrollmentDate: ed };
                                }
                                const { renewalDate, monthlyPrice } =
                                  applyDirectDebitPeriod(ed, opt);
                                return {
                                  ...f,
                                  enrollmentDate: ed,
                                  renewalDate,
                                  priceBranchFrequencyID:
                                    opt.priceBranchFrequencyID,
                                  membershipCost: monthlyPrice.toFixed(2),
                                };
                              }
                              const opt =
                                findPeriodOption(
                                  directPayOptions,
                                  f.selectedPeriodKey,
                                ) ??
                                findPeriodOption(directPayOptions, "1m") ??
                                directPayOptions[0];
                              const {
                                renewalDate,
                                cost,
                                priceBranchFrequencyID,
                              } = applySubscriptionPeriod(ed, opt);
                              return {
                                ...f,
                                enrollmentDate: ed,
                                renewalDate: clampRenewalDate(ed, renewalDate),
                                priceBranchFrequencyID,
                                membershipCost: cost,
                              };
                            });
                          }}
                          className="w-full box-border bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2.5 focus:border-[#e31e24] focus:outline-none text-[13px] [color-scheme:dark]"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-1.5">
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
                              renewalDate: clampRenewalDate(
                                f.enrollmentDate,
                                e.target.value,
                              ),
                              selectedPeriodKey: null,
                            }))
                          }
                          className="w-full box-border bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2.5 focus:border-[#e31e24] focus:outline-none text-[13px] [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resumen cobro — derecha en desktop */}
                  <aside className="mt-5 lg:mt-0 min-w-0 rounded-sm border border-[rgba(93,63,60,0.2)] bg-[#0e0e0e] p-4 lg:sticky lg:top-0 space-y-4">
                    <p className="text-[#e5e2e1] text-[11px] font-bold uppercase tracking-wide">
                      Resumen de cobro
                    </p>
                    <div className="space-y-2 text-[12px]">
                      <div className="flex justify-between gap-3">
                        <span className="text-[#808080]">Suscripción</span>
                        <span
                          className={`font-bold tabular-nums ${
                            newMemberForm.chargeSubscriptionFee
                              ? "text-[#e5e2e1]"
                              : "text-[#5a5a5a] line-through"
                          }`}
                        >
                          $
                          {formatMxnAmount(
                            parseFloat(newMemberForm.subscriptionFee) || 0,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-[#808080]">
                          {newMemberForm.directDebit
                            ? "Primera mensualidad"
                            : "Membresía"}
                        </span>
                        <span className="font-bold tabular-nums text-[#e5e2e1]">
                          $
                          {formatMxnAmount(
                            parseFloat(newMemberForm.membershipCost) || 0,
                          )}
                        </span>
                      </div>
                      <div className="border-t border-[rgba(93,63,60,0.2)] pt-2 flex justify-between gap-3 items-baseline">
                        <span className="text-[#e5e2e1] text-[11px] font-bold uppercase tracking-wide">
                          Total a cobrar hoy
                        </span>
                        <span className="text-[#e31e24] text-[20px] font-black tabular-nums leading-none">
                          $
                          {formatMxnAmount(
                            (newMemberForm.chargeSubscriptionFee
                              ? parseFloat(newMemberForm.subscriptionFee) || 0
                              : 0) +
                              (newMemberForm.directDebit
                                ? 0
                                : parseFloat(newMemberForm.membershipCost) || 0),
                          )}
                        </span>
                      </div>
                      <p className="text-[#5a5a5a] text-[9px] leading-relaxed">
                        {newMemberForm.directDebit
                          ? `La primera mensualidad es de $${formatMxnAmount(parseFloat(newMemberForm.membershipCost) || 0)} (domiciliada a tarjeta). Hoy solo se cobra la cuota de suscripción, si aplica.`
                          : "Pago directo: cuota + membresía se cobran al confirmar."}
                      </p>
                    </div>

                    <div>
                      <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-1.5">
                        Forma de pago
                      </label>
                      {newMemberForm.directDebit ? (
                        <div className="w-full box-border bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2.5 text-[13px] opacity-70">
                          Tarjeta
                          <p className="text-[9px] text-[#5a5a5a] mt-1 normal-case tracking-normal font-medium">
                            El domiciliado siempre se cobra con tarjeta.
                          </p>
                        </div>
                      ) : (
                        <select
                          value={newMemberForm.paymentMethod}
                          onChange={(e) =>
                            setNewMemberForm((f) => ({
                              ...f,
                              paymentMethod: e.target.value as typeof f.paymentMethod,
                            }))
                          }
                          className="w-full box-border bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2.5 focus:border-[#e31e24] focus:outline-none text-[13px]"
                        >
                          <option value="CASH">Efectivo</option>
                          <option value="CARD">Tarjeta</option>
                          <option value="QR">QR / transferencia</option>
                        </select>
                      )}
                    </div>
                  </aside>
                </div>
                </div>
              )}

              {/* Paso 3: Face ID opcional */}
              {addMemberStep === 3 && (
                <div className="min-w-0 space-y-4">
                  <div className="rounded-sm bg-[#0e0e0e] border border-[rgba(93,63,60,0.15)] p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <ScanFace size={22} className="text-[#e31e24] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[#e5e2e1] text-[14px] font-bold uppercase tracking-wide">
                          Alta biométrica Face ID
                        </p>
                        <p className="text-[#808080] text-[11px] mt-2 leading-relaxed">
                          Puedes registrar el rostro ahora o omitir este paso y completarlo después
                          desde Control de acceso.
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                        Terminal para captura
                      </label>
                      <select
                        value={newMemberForm.faceIdTerminal}
                        onChange={(e) =>
                          setNewMemberForm({
                            ...newMemberForm,
                            faceIdTerminal: e.target.value,
                          })
                        }
                        className="w-full box-border bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2.5 focus:border-[#e31e24] focus:outline-none text-[12px]"
                      >
                        <option value="TRN-MAIN-01">TRN-MAIN-01 — Entrada principal</option>
                        <option value="TRN-MAIN-02">TRN-MAIN-02 — Entrada lateral</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 4: éxito */}
              {addMemberStep === 4 && createdMemberSummary && (
                <div className="min-w-0 py-4 text-center space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e31e24]/15 text-[#e31e24]">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <p className="text-[#e5e2e1] text-[18px] font-black uppercase tracking-tight">
                      {createdMemberSummary.name}
                    </p>
                    <p className="text-[#808080] text-[12px] mt-1 font-mono">
                      {createdMemberSummary.id}
                    </p>
                  </div>
                  <ul className="text-left max-w-sm mx-auto space-y-2 text-[12px] text-[#b0b0b0]">
                    <li>
                      {createdMemberSummary.subscriptionPaid
                        ? `Cuota de suscripción · $${createdMemberSummary.subscriptionFee.toFixed(2)}`
                        : "Sin cuota de suscripción"}
                    </li>
                    <li>
                      {createdMemberSummary.directDebit
                        ? `Membresía domiciliada · $${createdMemberSummary.membershipAmount.toFixed(2)}`
                        : `Membresía pago directo · $${createdMemberSummary.membershipAmount.toFixed(2)}`}
                    </li>
                    <li>
                      Face ID:{" "}
                      {createdMemberSummary.faceIdEnrolled
                        ? "registrado"
                        : "omitido (puedes completarlo después)"}
                    </li>
                  </ul>
                </div>
              )}

              {/* Acciones del wizard */}
              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[rgba(93,63,60,0.15)] pt-4 sm:flex-row sm:gap-3 shrink-0">
                {addMemberStep === 1 && (
                  <>
                    <button
                      type="button"
                      onClick={closeAddMemberModal}
                      disabled={Boolean(wizardSync)}
                      className="min-h-[44px] w-full sm:flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#1a1a1a] disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={goAddMemberNext}
                      disabled={Boolean(wizardSync)}
                      className="min-h-[44px] w-full sm:flex-1 bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] disabled:opacity-50"
                    >
                      Continuar
                    </button>
                  </>
                )}
                {addMemberStep === 2 && (
                  <>
                    <button
                      type="button"
                      onClick={goAddMemberBack}
                      disabled={Boolean(wizardSync)}
                      className="min-h-[44px] w-full sm:flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#1a1a1a] disabled:opacity-50"
                    >
                      Atrás
                    </button>
                    <button
                      type="button"
                      onClick={goAddMemberNext}
                      disabled={Boolean(wizardSync)}
                      className="min-h-[44px] w-full sm:flex-1 bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {wizardSync === "payment" ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : null}
                      {wizardPaymentDone ? "Continuar" : "Pagar"}
                    </button>
                  </>
                )}
                {addMemberStep === 3 && (
                  <>
                    <button
                      type="button"
                      onClick={goAddMemberBack}
                      disabled={Boolean(wizardSync)}
                      className="min-h-[44px] w-full sm:flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#1a1a1a] disabled:opacity-50"
                    >
                      Atrás
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(wizardSync)}
                      onClick={() => void completeFaceIdStep({ enrollFaceId: false })}
                      className="min-h-[44px] w-full sm:flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.35)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:border-[#e31e24] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      Omitir Face ID
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(wizardSync)}
                      onClick={() => void completeFaceIdStep({ enrollFaceId: true })}
                      className="min-h-[44px] w-full sm:flex-1 bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {wizardSync === "faceid" ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : null}
                      Registrar con Face ID
                    </button>
                  </>
                )}
                {addMemberStep === 4 && (
                  <button
                    type="button"
                    onClick={closeAddMemberModal}
                    className="min-h-[44px] w-full bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20]"
                  >
                    Listo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPurchaseConfirmModal && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="purchase-confirm-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !wizardSync) {
              setShowPurchaseConfirmModal(false);
            }
          }}
        >
          <div
            className="relative w-full max-w-md border border-[rgba(93,63,60,0.3)] bg-[#131313] p-5 sm:p-6 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {wizardSync ? (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#131313]/95 px-6"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="animate-spin text-[#e31e24]" size={36} />
                <p className="text-[#e5e2e1] text-[12px] font-bold tracking-[1.5px] uppercase text-center">
                  {wizardSync === "client"
                    ? "Registrando miembro…"
                    : "Registrando cobro…"}
                </p>
                <p className="text-[#808080] text-[10px] text-center leading-relaxed">
                  {wizardSync === "client"
                    ? "Paso 1 de 2 · Alta en catálogo"
                    : "Paso 2 de 2 · Cobro en POS"}
                </p>
              </div>
            ) : null}
            <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
              Confirmar compra
            </p>
            <h3
              id="purchase-confirm-title"
              className="text-[#e5e2e1] text-[18px] font-black uppercase tracking-tight mb-4"
            >
              Resumen de compra
            </h3>
            <ul className="space-y-2.5 text-[13px] mb-5">
              <li className="flex justify-between gap-3 border-b border-[rgba(93,63,60,0.12)] pb-2">
                <span className="text-[#808080]">Tipo</span>
                <span className="text-[#e5e2e1] font-bold">
                  {newMemberForm.directDebit ? "Domiciliado" : "Pago directo"}
                </span>
              </li>
              <li className="flex justify-between gap-3 border-b border-[rgba(93,63,60,0.12)] pb-2">
                <span className="text-[#808080]">Vigencia</span>
                <span className="text-[#e5e2e1] font-bold">
                  {newMemberForm.directDebit
                    ? directDebitOptions.find(
                        (p) => p.key === newMemberForm.selectedPeriodKey,
                      )?.label ?? "—"
                    : directPayOptions.find(
                        (p) => p.key === newMemberForm.selectedPeriodKey,
                      )?.label ?? "—"}
                </span>
              </li>
              <li className="flex justify-between gap-3 border-b border-[rgba(93,63,60,0.12)] pb-2">
                <span className="text-[#808080]">Suscripción</span>
                <span className="text-[#e5e2e1] font-bold tabular-nums">
                  {newMemberForm.chargeSubscriptionFee
                    ? `$${formatMxnAmount(parseFloat(newMemberForm.subscriptionFee) || 0)}`
                    : "No aplica"}
                </span>
              </li>
              <li className="flex justify-between gap-3 border-b border-[rgba(93,63,60,0.12)] pb-2">
                <span className="text-[#808080]">
                  {newMemberForm.directDebit ? "Primera mensualidad" : "Membresía"}
                </span>
                <span className="text-[#e5e2e1] font-bold tabular-nums">
                  $
                  {formatMxnAmount(parseFloat(newMemberForm.membershipCost) || 0)}
                </span>
              </li>
              {newMemberForm.directDebit ? (
                <li className="border-b border-[rgba(93,63,60,0.12)] pb-2">
                  <p className="text-[#808080] text-[11px] leading-relaxed">
                    La primera mensualidad domiciliada a tarjeta es de{" "}
                    <span className="text-[#e5e2e1] font-bold tabular-nums">
                      $
                      {formatMxnAmount(
                        parseFloat(newMemberForm.membershipCost) || 0,
                      )}
                    </span>
                    .
                    {(newMemberForm.selectedPeriodKey === "6m" ||
                      newMemberForm.selectedPeriodKey === "12m") &&
                      (() => {
                        const debitOpt =
                          findPeriodOption(
                            directDebitOptions,
                            newMemberForm.selectedPeriodKey,
                          ) ?? directDebitOptions[0];
                        if (!debitOpt) return null;
                        return (
                          <>
                            {" "}
                            En el periodo se proyectan{" "}
                            <span className="text-[#e5e2e1] font-bold tabular-nums">
                              $
                              {formatMxnAmount(
                                applyDirectDebitPeriod(
                                  newMemberForm.enrollmentDate,
                                  debitOpt,
                                ).projectedTotal,
                              )}
                            </span>
                            .
                          </>
                        );
                      })()}
                  </p>
                </li>
              ) : null}
              <li className="border-b border-[rgba(93,63,60,0.12)] pb-2 space-y-1.5">
                <label className="block text-[#808080] text-[11px]">
                  Forma de pago
                </label>
                {newMemberForm.directDebit ? (
                  <div className="w-full box-border bg-[#0e0e0e] border border-[rgba(93,63,60,0.25)] text-[#e5e2e1] px-3 py-2.5 text-[13px] font-bold opacity-80">
                    Tarjeta
                    <p className="text-[9px] text-[#5a5a5a] mt-1 font-medium">
                      Domiciliado: solo tarjeta.
                    </p>
                  </div>
                ) : (
                  <select
                    value={newMemberForm.paymentMethod}
                    onChange={(e) =>
                      setNewMemberForm((f) => ({
                        ...f,
                        paymentMethod: e.target.value as typeof f.paymentMethod,
                      }))
                    }
                    className="w-full box-border bg-[#0e0e0e] border border-[rgba(93,63,60,0.25)] text-[#e5e2e1] px-3 py-2.5 focus:border-[#e31e24] focus:outline-none text-[13px] font-bold"
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="QR">QR / transferencia</option>
                  </select>
                )}
              </li>
              <li className="flex justify-between gap-3 items-baseline pt-1">
                <span className="text-[#e5e2e1] text-[11px] font-bold uppercase tracking-wide">
                  Total hoy
                </span>
                <span className="text-[#e31e24] text-[22px] font-black tabular-nums">
                  $
                  {formatMxnAmount(
                    (newMemberForm.chargeSubscriptionFee
                      ? parseFloat(newMemberForm.subscriptionFee) || 0
                      : 0) +
                      (newMemberForm.directDebit
                        ? 0
                        : parseFloat(newMemberForm.membershipCost) || 0),
                  )}
                </span>
              </li>
            </ul>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={() => setShowPurchaseConfirmModal(false)}
                disabled={Boolean(wizardSync)}
                className="min-h-[44px] w-full sm:flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#1a1a1a] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmPurchaseAndContinue()}
                disabled={Boolean(wizardSync)}
                className="min-h-[44px] w-full sm:flex-1 bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {wizardSync ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : null}
                {wizardMember ? "Reintentar cobro" : "Confirmar pago"}
              </button>
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
