export default function Reports() {
  return (
    <div className="h-full bg-[#131313] p-4 md:p-8">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-6 md:mb-8">
        <div>
          <p className="text-[#e31e24] text-[10px] md:text-[12px] font-bold tracking-[2px] md:tracking-[3.6px] uppercase mb-2">
            Analytics_Core_V2.0
          </p>
          <h1 className="text-[#e5e2e1] text-[36px] md:text-[72px] font-black tracking-[-2px] md:tracking-[-3.6px] uppercase leading-tight md:leading-[72px]">
            Reports
          </h1>
        </div>
        <div className="flex gap-4">
          <button className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-6 py-3 text-[10px] font-bold tracking-[1px] uppercase hover:bg-[#1a1a1a] transition-colors">
            Export_Data
          </button>
          <button className="bg-[#e31e24] text-white px-6 py-3 text-[10px] font-bold tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors">
            Generate_PDF
          </button>
        </div>
      </div>

      {/* Revenue Card */}
      <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-8 mb-6">
        <p className="text-[#393939] text-[12px] font-bold tracking-[1.2px] uppercase mb-2">
          Total_Gross_Revenue
        </p>
        <p className="text-[#e5e2e1] text-[60px] font-black tracking-[-3px] leading-[60px] mb-6">
          $142,890.42
        </p>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-[#808080] text-[10px] mb-1">MEMBERSHIPS</p>
            <p className="text-[#e5e2e1] text-[24px] font-black">$98,450</p>
          </div>
          <div>
            <p className="text-[#808080] text-[10px] mb-1">POS_SALES</p>
            <p className="text-[#e5e2e1] text-[24px] font-black">$32,120</p>
          </div>
          <div>
            <p className="text-[#808080] text-[10px] mb-1">OTHER</p>
            <p className="text-[#e5e2e1] text-[24px] font-black">$12,320</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Member Growth */}
        <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
          <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
            Member_Growth_Rate
          </p>
          <p className="text-[#e5e2e1] text-[36px] font-black mb-2">+18.5%</p>
          <p className="text-[#808080] text-[10px] mb-6">vs last quarter</p>
          <div className="space-y-3">
            {[
              { month: "JAN", value: 85 },
              { month: "FEB", value: 92 },
              { month: "MAR", value: 88 },
              { month: "APR", value: 95 },
            ].map((item) => (
              <div key={item.month}>
                <div className="flex justify-between mb-1">
                  <span className="text-[#e5e2e1] text-[10px] font-bold">{item.month}</span>
                  <span className="text-[#808080] text-[10px]">{item.value}%</span>
                </div>
                <div className="h-2 bg-[#1a1a1a]">
                  <div className="h-full bg-[#e31e24]" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
          <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
            Top_Performing_SKU
          </p>
          <div className="space-y-4">
            {[
              { name: "ISO WHEY PROTEIN", sales: "$12,450", units: "342" },
              { name: "PRE-WORKOUT RAGE", sales: "$8,920", units: "287" },
              { name: "RECOVERY BCAA", sales: "$6,340", units: "198" },
              { name: "ELITE GYM GEAR", sales: "$4,410", units: "156" },
            ].map((product, i) => (
              <div key={i} className="border-b border-[rgba(93,63,60,0.05)] pb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-[#e5e2e1] text-[12px] font-bold">{product.name}</span>
                  <span className="text-[#e31e24] text-[12px] font-bold">{product.sales}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#808080] text-[10px]">{product.units} units sold</span>
                  <span className="text-[#808080] text-[10px]">#{i + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Churn Analysis */}
      <div className="mt-6 bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase">
            Churn_Rate_Analysis
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[#808080] text-[10px]">CURRENT RATE:</span>
            <span className="text-[#e5e2e1] text-[14px] font-black">3.2%</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { tier: "ELITE_BLK", rate: "1.8%", color: "text-[#00ff00]" },
            { tier: "PLATINUM", rate: "2.4%", color: "text-[#00ff00]" },
            { tier: "GOLD", rate: "3.9%", color: "text-[#e5e2e1]" },
            { tier: "BASIC", rate: "5.7%", color: "text-[#e31e24]" },
          ].map((item) => (
            <div key={item.tier} className="bg-[#131313] border border-[rgba(93,63,60,0.05)] p-4">
              <p className="text-[#808080] text-[10px] mb-2">{item.tier}</p>
              <p className={`text-[24px] font-black ${item.color}`}>{item.rate}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
