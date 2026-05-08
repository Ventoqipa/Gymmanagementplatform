import { useState } from "react";
import imgMemberProfile from "../../imports/PerfilDeMiembroGestion/3b634f4a9044fcdaee9556d934e90fbcffd448af.png";
import { Search, ChevronLeft, ChevronRight, UserPlus, ChevronDown, ChevronUp } from "lucide-react";

interface Member {
  id: string;
  name: string;
  tier: string;
  status: "ACTIVE" | "EXPIRED" | "PENDING";
  enrollmentDate: string;
  renewalDate: string;
  monthlyVisits: number;
  avgSessionTime: number;
  email: string;
}

const ALL_MEMBERS: Member[] = [
  { id: "MEM-1247", name: "Marcus Chen", tier: "ELITE_BLK", status: "ACTIVE", enrollmentDate: "2024-05-01", renewalDate: "2024-11-01", monthlyVisits: 23, avgSessionTime: 87, email: "marcus.chen@email.com" },
  { id: "MEM-1246", name: "Sarah Williams", tier: "GOLD", status: "ACTIVE", enrollmentDate: "2024-04-28", renewalDate: "2024-10-28", monthlyVisits: 18, avgSessionTime: 65, email: "sarah.w@email.com" },
  { id: "MEM-1245", name: "David Kim", tier: "PLATINUM_ELITE", status: "ACTIVE", enrollmentDate: "2024-04-25", renewalDate: "2024-10-25", monthlyVisits: 20, avgSessionTime: 92, email: "david.kim@email.com" },
  { id: "MEM-1244", name: "Jessica Torres", tier: "ELITE_BLK", status: "ACTIVE", enrollmentDate: "2024-04-20", renewalDate: "2024-10-20", monthlyVisits: 25, avgSessionTime: 105, email: "j.torres@email.com" },
  { id: "MEM-1243", name: "Michael Johnson", tier: "GOLD", status: "EXPIRED", enrollmentDate: "2024-04-15", renewalDate: "2024-04-15", monthlyVisits: 12, avgSessionTime: 55, email: "mjohnson@email.com" },
  { id: "MEM-1242", name: "Emily Rodriguez", tier: "PLATINUM_ELITE", status: "ACTIVE", enrollmentDate: "2024-04-10", renewalDate: "2024-10-10", monthlyVisits: 22, avgSessionTime: 78, email: "emily.r@email.com" },
  { id: "MEM-1241", name: "James Anderson", tier: "BASIC", status: "ACTIVE", enrollmentDate: "2024-04-05", renewalDate: "2024-10-05", monthlyVisits: 15, avgSessionTime: 60, email: "james.a@email.com" },
  { id: "MEM-1240", name: "Lisa Martinez", tier: "ELITE_BLK", status: "ACTIVE", enrollmentDate: "2024-03-30", renewalDate: "2024-09-30", monthlyVisits: 28, avgSessionTime: 95, email: "lisa.m@email.com" },
  { id: "MEM-1239", name: "Robert Taylor", tier: "GOLD", status: "PENDING", enrollmentDate: "2024-03-25", renewalDate: "2024-09-25", monthlyVisits: 10, avgSessionTime: 45, email: "robert.t@email.com" },
  { id: "MEM-1238", name: "Amanda White", tier: "PLATINUM_ELITE", status: "ACTIVE", enrollmentDate: "2024-03-20", renewalDate: "2024-09-20", monthlyVisits: 19, avgSessionTime: 82, email: "amanda.w@email.com" },
  { id: "MEM-1237", name: "Christopher Lee", tier: "BASIC", status: "ACTIVE", enrollmentDate: "2024-03-15", renewalDate: "2024-09-15", monthlyVisits: 14, avgSessionTime: 58, email: "chris.lee@email.com" },
  { id: "MEM-1236", name: "Nicole Brown", tier: "ELITE_BLK", status: "ACTIVE", enrollmentDate: "2024-03-10", renewalDate: "2024-09-10", monthlyVisits: 26, avgSessionTime: 98, email: "nicole.b@email.com" },
  { id: "MEM-1235", name: "Daniel Garcia", tier: "GOLD", status: "EXPIRED", enrollmentDate: "2024-03-05", renewalDate: "2024-03-05", monthlyVisits: 8, avgSessionTime: 40, email: "daniel.g@email.com" },
  { id: "MEM-1234", name: "Rachel Miller", tier: "PLATINUM_ELITE", status: "ACTIVE", enrollmentDate: "2024-02-28", renewalDate: "2024-08-28", monthlyVisits: 21, avgSessionTime: 85, email: "rachel.m@email.com" },
  { id: "MEM-1233", name: "Kevin Wilson", tier: "BASIC", status: "ACTIVE", enrollmentDate: "2024-02-20", renewalDate: "2024-08-20", monthlyVisits: 16, avgSessionTime: 62, email: "kevin.w@email.com" },
  { id: "MEM-1232", name: "Samantha Davis", tier: "ELITE_BLK", status: "ACTIVE", enrollmentDate: "2024-02-15", renewalDate: "2024-08-15", monthlyVisits: 27, avgSessionTime: 102, email: "samantha.d@email.com" },
  { id: "MEM-1231", name: "Brian Moore", tier: "GOLD", status: "ACTIVE", enrollmentDate: "2024-02-10", renewalDate: "2024-08-10", monthlyVisits: 17, avgSessionTime: 68, email: "brian.m@email.com" },
  { id: "MEM-1230", name: "Ashley Jackson", tier: "PLATINUM_ELITE", status: "PENDING", enrollmentDate: "2024-02-05", renewalDate: "2024-08-05", monthlyVisits: 11, avgSessionTime: 50, email: "ashley.j@email.com" },
];

const ITEMS_PER_PAGE = 8;

export default function Members() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTier, setFilterTier] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  // Filter members
  const filteredMembers = ALL_MEMBERS.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTier = filterTier === "ALL" || member.tier === filterTier;
    const matchesStatus = filterStatus === "ALL" || member.status === filterStatus;

    return matchesSearch && matchesTier && matchesStatus;
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
            <button className="bg-[#e31e24] text-white px-4 py-2 flex items-center gap-2 text-[10px] font-bold tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors">
              <UserPlus size={14} />
              Add Member
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Search Bar */}
          <div className="md:col-span-1">
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

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => handleFilterChange(setFilterStatus, e.target.value)}
              className="w-full bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-2.5 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif] text-[12px]"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>
        </div>

        {/* Members Table */}
        <div className="space-y-1 overflow-x-auto">
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-12 gap-4 pb-3 border-b border-[rgba(93,63,60,0.2)] min-w-[900px]">
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
            <div className="col-span-2">
              <span className="text-[#808080] text-[9px] font-bold tracking-[1px] uppercase">Renewal</span>
            </div>
            <div className="col-span-1 text-center">
              <span className="text-[#808080] text-[9px] font-bold tracking-[1px] uppercase">Visits</span>
            </div>
            <div className="col-span-1 text-right">
              <span className="text-[#808080] text-[9px] font-bold tracking-[1px] uppercase">Status</span>
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
                  className="hidden lg:grid grid-cols-12 gap-4 py-3 border-b border-[rgba(93,63,60,0.05)] hover:bg-[#131313] transition-colors cursor-pointer min-w-[900px]"
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
                  <div className="col-span-2 flex items-center">
                    <span className="text-[#e5e2e1] text-[11px]">
                      {new Date(member.renewalDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-[#e5e2e1] text-[12px] font-bold">{member.monthlyVisits}</span>
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <span className={`text-[10px] font-bold ${
                      member.status === "ACTIVE" ? "text-[#00ff00]" :
                      member.status === "EXPIRED" ? "text-[#e31e24]" :
                      "text-[#ffa500]"
                    }`}>
                      {member.status}
                    </span>
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
                    <span className={`text-[10px] font-bold ${
                      member.status === "ACTIVE" ? "text-[#00ff00]" :
                      member.status === "EXPIRED" ? "text-[#e31e24]" :
                      "text-[#ffa500]"
                    }`}>
                      {member.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] mt-2">
                    <span className="text-[#e31e24] font-bold tracking-[1px] uppercase">{member.tier}</span>
                    <span className="text-[#808080]">{member.monthlyVisits} visits</span>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedMember === member.id && (
                  <div className="bg-[#131313] border-b border-[rgba(93,63,60,0.05)] p-4 md:p-6">
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
                            <span className="text-[#00ff00] font-bold">ENROLLED</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-[#808080]">LAST_SCAN</span>
                            <span className="text-[#e5e2e1] font-bold">2024-05-07</span>
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
    </div>
  );
}
