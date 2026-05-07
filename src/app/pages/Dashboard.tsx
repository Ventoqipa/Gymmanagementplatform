import { Activity, Users, DollarSign, TrendingUp } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <p className="text-[#e31e24] text-[10px] font-bold tracking-[3px] uppercase mb-2">
          Operational_Overview
        </p>
        <h1 className="text-[#e5e2e1] text-[48px] font-black tracking-[-2px] uppercase">
          Dashboard
        </h1>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-6">
        {/* Current Capacity */}
        <div className="bg-[#131313] border border-[rgba(93,63,60,0.1)] p-6">
          <div className="flex items-start justify-between mb-4">
            <Activity className="text-[#e31e24]" size={24} />
            <span className="text-[10px] text-[#00ff00] font-bold tracking-[1px]">LIVE</span>
          </div>
          <p className="text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
            Current Capacity
          </p>
          <p className="text-[#e5e2e1] text-[32px] font-black leading-none">47%</p>
          <p className="text-[#808080] text-[10px] mt-2">89/190 members in facility</p>
        </div>

        {/* Daily Check-ins */}
        <div className="bg-[#131313] border border-[rgba(93,63,60,0.1)] p-6">
          <div className="flex items-start justify-between mb-4">
            <Users className="text-[#e31e24]" size={24} />
          </div>
          <p className="text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
            Daily Check-ins
          </p>
          <p className="text-[#e5e2e1] text-[32px] font-black leading-none">342</p>
          <p className="text-[#00ff00] text-[10px] mt-2">+12% vs yesterday</p>
        </div>

        {/* Revenue Today */}
        <div className="bg-[#131313] border border-[rgba(93,63,60,0.1)] p-6">
          <div className="flex items-start justify-between mb-4">
            <DollarSign className="text-[#e31e24]" size={24} />
          </div>
          <p className="text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
            Revenue Today
          </p>
          <p className="text-[#e5e2e1] text-[32px] font-black leading-none">$4,823</p>
          <p className="text-[#808080] text-[10px] mt-2">47 transactions</p>
        </div>

        {/* Active Members */}
        <div className="bg-[#131313] border border-[rgba(93,63,60,0.1)] p-6">
          <div className="flex items-start justify-between mb-4">
            <TrendingUp className="text-[#e31e24]" size={24} />
          </div>
          <p className="text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
            Active Members
          </p>
          <p className="text-[#e5e2e1] text-[32px] font-black leading-none">1,247</p>
          <p className="text-[#00ff00] text-[10px] mt-2">+23 this month</p>
        </div>
      </div>

      {/* Peak Hours Chart */}
      <div className="bg-[#131313] border border-[rgba(93,63,60,0.1)] p-6">
        <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
          Peak_Hours_Analysis
        </p>
        <div className="space-y-3">
          {[
            { time: "05:00-07:00", value: 65, label: "Morning Peak" },
            { time: "12:00-14:00", value: 45, label: "Lunch Rush" },
            { time: "17:00-20:00", value: 95, label: "Evening Peak" },
            { time: "20:00-22:00", value: 70, label: "Night Shift" },
          ].map((slot) => (
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

      {/* Recent Activity */}
      <div className="bg-[#131313] border border-[rgba(93,63,60,0.1)] p-6">
        <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
          Recent_Activity_Log
        </p>
        <div className="space-y-3">
          {[
            { action: "MEMBER_CHECKIN", name: "Marcus Chen", time: "2 min ago", tier: "ELITE_BLK" },
            { action: "POS_SALE", name: "Sarah Williams", time: "5 min ago", tier: "GOLD" },
            { action: "NEW_ENROLLMENT", name: "David Kim", time: "12 min ago", tier: "PLATINUM_ELITE" },
            { action: "MEMBER_CHECKIN", name: "Jessica Torres", time: "15 min ago", tier: "ELITE_BLK" },
          ].map((activity, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-[rgba(93,63,60,0.05)]"
            >
              <div className="flex items-center gap-4">
                <span className="text-[#e31e24] text-[9px] font-bold tracking-[1px] uppercase">
                  {activity.action}
                </span>
                <span className="text-[#e5e2e1] text-[12px] font-bold">{activity.name}</span>
                <span className="text-[#808080] text-[10px] tracking-[1px] uppercase">
                  {activity.tier}
                </span>
              </div>
              <span className="text-[#808080] text-[10px]">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
