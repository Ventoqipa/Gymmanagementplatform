export default function AccessControl() {
  return (
    <div className="h-full bg-[#131313] p-8">
      <div className="mb-8">
        <p className="text-[#e31e24] text-[10px] font-bold tracking-[3px] uppercase mb-2">
          Biometric_Security_System
        </p>
        <h1 className="text-[#e5e2e1] text-[48px] font-black tracking-[-2px] uppercase">
          Access Control
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Terminal Status Card */}
        <div className="bg-[#2a2a2a] border border-[rgba(93,63,60,0.1)] p-6">
          <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
            Terminal_01_Status
          </p>
          <p className="text-[#e5e2e1] text-[36px] font-black mb-4">OPTIMAL</p>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-[#e7bdb8]">LATENCY</span>
                <span className="text-[#e7bdb8]">14ms</span>
              </div>
              <div className="h-1 bg-[#353534] relative">
                <div className="h-full bg-[#e31e24] w-[14%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-[#e7bdb8]">RECOGNITION_ACCURACY</span>
                <span className="text-[#e7bdb8]">99.8%</span>
              </div>
              <div className="h-1 bg-[#353534] relative">
                <div className="h-full bg-[#e31e24] w-[99%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#2a2a2a] border border-[rgba(93,63,60,0.1)] p-6 flex flex-col justify-between">
          <div>
            <p className="text-[#e7bdb8] text-[10px] font-bold tracking-[2px] uppercase mb-2">
              Quick_Action
            </p>
            <p className="text-[#e5e2e1] text-[24px] font-bold uppercase">
              Register_New_Face
            </p>
          </div>
          <button className="bg-[#e31e24] text-[#410002] py-3 px-6 font-bold text-[12px] tracking-[1.2px] uppercase hover:bg-[#c41a20] transition-colors">
            Start Enrollment
          </button>
        </div>

        {/* System Stats */}
        <div className="bg-[#2a2a2a] border border-[rgba(93,63,60,0.1)] p-6">
          <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
            Today_Activity
          </p>
          <p className="text-[#e5e2e1] text-[36px] font-black mb-4">342</p>
          <div className="space-y-2 text-[10px]">
            <div className="flex justify-between">
              <span className="text-[#808080]">SUCCESSFUL_SCANS</span>
              <span className="text-[#00ff00] font-bold">340</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#808080]">FAILED_ATTEMPTS</span>
              <span className="text-[#e31e24] font-bold">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#808080]">SUCCESS_RATE</span>
              <span className="text-[#e5e2e1] font-bold">99.4%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Access Log */}
      <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
        <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
          Live_Access_Log
        </p>
        <div className="space-y-3">
          {[
            { name: "Marcus Chen", time: "09:42:15", status: "GRANTED", tier: "ELITE_BLK" },
            { name: "Sarah Williams", time: "09:38:22", status: "GRANTED", tier: "GOLD" },
            { name: "David Kim", time: "09:35:47", status: "GRANTED", tier: "PLATINUM_ELITE" },
            { name: "Jessica Torres", time: "09:33:18", status: "GRANTED", tier: "ELITE_BLK" },
            { name: "Unknown Face", time: "09:31:05", status: "DENIED", tier: "N/A" },
          ].map((log, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-[rgba(93,63,60,0.05)]"
            >
              <div className="flex items-center gap-4">
                <span className={`text-[10px] font-bold tracking-[1px] uppercase ${
                  log.status === "GRANTED" ? "text-[#00ff00]" : "text-[#e31e24]"
                }`}>
                  {log.status}
                </span>
                <span className="text-[#e5e2e1] text-[14px] font-bold">{log.name}</span>
                <span className="text-[#808080] text-[10px] tracking-[1px] uppercase">
                  {log.tier}
                </span>
              </div>
              <span className="text-[#808080] text-[12px] font-mono">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
