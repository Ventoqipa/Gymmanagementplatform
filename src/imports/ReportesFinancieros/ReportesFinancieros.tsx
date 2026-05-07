import svgPaths from "./svg-plkv4rciu2";

function Container1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e31e24] text-[12px] tracking-[3.6px] uppercase whitespace-nowrap">
        <p className="leading-[16px]">ANALYTICS_CORE_V2.0</p>
      </div>
    </div>
  );
}

function Heading1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 2">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-black justify-center leading-[0] relative shrink-0 text-[#e5e2e1] text-[72px] tracking-[-3.6px] uppercase whitespace-nowrap">
        <p className="leading-[72px]">REPORTS</p>
      </div>
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-[282.11px]" data-name="Container">
      <Container1 />
      <Heading1 />
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[#0e0e0e] content-stretch flex flex-col items-center justify-center px-[25px] py-[13px] relative shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[rgba(93,63,60,0.2)] border-solid inset-0 pointer-events-none" />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e5e2e1] text-[10px] text-center tracking-[1px] uppercase whitespace-nowrap">
        <p className="leading-[15px]">EXPORT_DATA</p>
      </div>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-[#e31e24] content-stretch flex flex-col items-center justify-center px-[24px] py-[13px] relative shrink-0" data-name="Button">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#fffafa] text-[10px] text-center tracking-[1px] uppercase whitespace-nowrap">
        <p className="leading-[15px]">GENERATE_PDF</p>
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="content-stretch flex gap-[16px] items-start relative shrink-0" data-name="Container">
      <Button />
      <Button1 />
    </div>
  );
}

function HeaderSection() {
  return (
    <div className="content-stretch flex items-end justify-between relative shrink-0 w-full" data-name="Header Section">
      <Container />
      <Container2 />
    </div>
  );
}

function Container5() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#393939] text-[12px] tracking-[1.2px] uppercase whitespace-nowrap">
        <p className="leading-[16px]">TOTAL_GROSS_REVENUE</p>
      </div>
    </div>
  );
}

function Heading2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-black justify-center leading-[0] relative shrink-0 text-[#e5e2e1] text-[60px] tracking-[-3px] whitespace-nowrap">
        <p className="leading-[60px]">$142,890.42</p>
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-[324.84px]" data-name="Container">
      <Container5 />
      <Heading2 />
    </div>
  );
}

function Container6() {
  return (
    <div className="h-[6px] relative shrink-0 w-[10px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10 6">
        <g id="Container">
          <path d={svgPaths.p313692c0} fill="var(--fill-0, #E31E24)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container7() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-black justify-center leading-[0] relative shrink-0 text-[#e31e24] text-[10px] whitespace-nowrap">
          <p className="leading-[15px]">+12.4%</p>
        </div>
      </div>
    </div>
  );
}

function OverlayBorder() {
  return (
    <div className="bg-[rgba(227,30,36,0.1)] content-stretch flex gap-[7.99px] items-center px-[13px] py-[5px] relative shrink-0" data-name="Overlay+Border">
      <div aria-hidden="true" className="absolute border border-[rgba(227,30,36,0.2)] border-solid inset-0 pointer-events-none" />
      <Container6 />
      <Container7 />
    </div>
  );
}

function Container3() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Container">
      <Container4 />
      <OverlayBorder />
    </div>
  );
}

function ChartVisualizationSvg() {
  return (
    <div className="content-stretch flex gap-[4px] h-[208px] items-end justify-center pt-[16px] relative shrink-0 w-full" data-name="Chart Visualization (SVG)">
      <div className="bg-[#2a2a2a] flex-[1_0_0] h-[38.39px] min-w-px relative" data-name="Background" />
      <div className="bg-[#2a2a2a] flex-[1_0_0] h-[67.19px] min-w-px relative" data-name="Background" />
      <div className="bg-[#2a2a2a] flex-[1_0_0] h-[48px] min-w-px relative" data-name="Background" />
      <div className="bg-[#393939] flex-[1_0_0] h-[105.59px] min-w-px relative" data-name="Background" />
      <div className="bg-[#393939] flex-[1_0_0] h-[86.39px] min-w-px relative" data-name="Background" />
      <div className="bg-[#393939] flex-[1_0_0] h-[134.39px] min-w-px relative" data-name="Background" />
      <div className="bg-[#e31e24] flex-[1_0_0] h-[163.19px] min-w-px relative" data-name="Background" />
      <div className="bg-[#e31e24] flex-[1_0_0] h-[124.8px] min-w-px relative" data-name="Background" />
      <div className="bg-[#e31e24] flex-[1_0_0] h-[182.39px] min-w-px relative" data-name="Background" />
      <div className="bg-[#e31e24] flex-[1_0_0] h-[153.59px] min-w-px relative" data-name="Background" />
    </div>
  );
}

function Container9() {
  return (
    <div className="relative self-stretch shrink-0 w-[19.59px]" data-name="Container">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] left-0 text-[#393939] text-[9px] top-[6px] tracking-[0.9px] uppercase whitespace-nowrap">
        <p className="leading-[13.5px]">JAN</p>
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="relative self-stretch shrink-0 w-[18.47px]" data-name="Container">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] left-0 text-[#393939] text-[9px] top-[6px] tracking-[0.9px] uppercase whitespace-nowrap">
        <p className="leading-[13.5px]">FEB</p>
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="relative self-stretch shrink-0 w-[22.05px]" data-name="Container">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] left-0 text-[#393939] text-[9px] top-[6px] tracking-[0.9px] uppercase whitespace-nowrap">
        <p className="leading-[13.5px]">MAR</p>
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="relative self-stretch shrink-0 w-[19.53px]" data-name="Container">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] left-0 text-[#393939] text-[9px] top-[6px] tracking-[0.9px] uppercase whitespace-nowrap">
        <p className="leading-[13.5px]">APR</p>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="relative self-stretch shrink-0 w-[21.31px]" data-name="Container">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] left-0 text-[#393939] text-[9px] top-[6px] tracking-[0.9px] uppercase whitespace-nowrap">
        <p className="leading-[13.5px]">MAY</p>
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="relative self-stretch shrink-0 w-[20.28px]" data-name="Container">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] left-0 text-[#393939] text-[9px] top-[6px] tracking-[0.9px] uppercase whitespace-nowrap">
        <p className="leading-[13.5px]">JUN</p>
      </div>
    </div>
  );
}

function Container15() {
  return (
    <div className="relative self-stretch shrink-0 w-[19.13px]" data-name="Container">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] left-0 text-[#393939] text-[9px] top-[6px] tracking-[0.9px] uppercase whitespace-nowrap">
        <p className="leading-[13.5px]">JUL</p>
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="relative self-stretch shrink-0 w-[20.33px]" data-name="Container">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] left-0 text-[#393939] text-[9px] top-[6px] tracking-[0.9px] uppercase whitespace-nowrap">
        <p className="leading-[13.5px]">AUG</p>
      </div>
    </div>
  );
}

function Container17() {
  return (
    <div className="relative self-stretch shrink-0 w-[18.58px]" data-name="Container">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] left-0 text-[#393939] text-[9px] top-[6px] tracking-[0.9px] uppercase whitespace-nowrap">
        <p className="leading-[13.5px]">SEP</p>
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="relative self-stretch shrink-0 w-[19.75px]" data-name="Container">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] left-0 text-[#393939] text-[9px] top-[6px] tracking-[0.9px] uppercase whitespace-nowrap">
        <p className="leading-[13.5px]">OCT</p>
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="h-[13.5px] relative shrink-0 w-full" data-name="Container">
      <div className="content-stretch flex items-start justify-between pr-[0.08px] relative size-full">
        <Container9 />
        <Container10 />
        <Container11 />
        <Container12 />
        <Container13 />
        <Container14 />
        <Container15 />
        <Container16 />
        <Container17 />
        <Container18 />
      </div>
    </div>
  );
}

function HeroStatTotalRevenue() {
  return (
    <div className="bg-[#1c1b1b] col-[1/span_8] drop-shadow-[0px_0px_30px_rgba(227,30,36,0.06)] justify-self-stretch relative row-1 self-start shrink-0" data-name="Hero Stat: Total Revenue">
      <div className="content-stretch flex flex-col gap-[16px] items-start p-[32px] relative size-full">
        <Container3 />
        <ChartVisualizationSvg />
        <Container8 />
      </div>
    </div>
  );
}

function Container20() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#393939] text-[12px] tracking-[1.2px] uppercase w-full">
        <p className="leading-[16px]">ACTIVE_MEMBERS</p>
      </div>
    </div>
  );
}

function Heading3() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-black justify-center leading-[0] relative shrink-0 text-[#e31e24] text-[72px] tracking-[-3.6px] w-full">
        <p className="leading-[72px]">1,240</p>
      </div>
    </div>
  );
}

function Container19() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start relative size-full">
        <Container20 />
        <Heading3 />
      </div>
    </div>
  );
}

function Container22() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#393939] text-[10px] tracking-[1px] uppercase whitespace-nowrap">
          <p className="leading-[15px]">NEW_THIS_MONTH</p>
        </div>
      </div>
    </div>
  );
}

function Container23() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-black justify-center leading-[0] relative shrink-0 text-[#e5e2e1] text-[18px] whitespace-nowrap">
          <p className="leading-[28px]">124</p>
        </div>
      </div>
    </div>
  );
}

function HorizontalBorder() {
  return (
    <div className="relative shrink-0 w-full" data-name="HorizontalBorder">
      <div aria-hidden="true" className="absolute border-[rgba(93,63,60,0.1)] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-end size-full">
        <div className="content-stretch flex items-end justify-between pb-[9px] pr-[0.01px] relative size-full">
          <Container22 />
          <Container23 />
        </div>
      </div>
    </div>
  );
}

function Container24() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#393939] text-[10px] tracking-[1px] uppercase whitespace-nowrap">
          <p className="leading-[15px]">CHURN_RATE</p>
        </div>
      </div>
    </div>
  );
}

function Container25() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-black justify-center leading-[0] relative shrink-0 text-[#e31e24] text-[18px] whitespace-nowrap">
          <p className="leading-[28px]">2.1%</p>
        </div>
      </div>
    </div>
  );
}

function HorizontalBorder1() {
  return (
    <div className="relative shrink-0 w-full" data-name="HorizontalBorder">
      <div aria-hidden="true" className="absolute border-[rgba(93,63,60,0.1)] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-end size-full">
        <div className="content-stretch flex items-end justify-between pb-[9px] relative size-full">
          <Container24 />
          <Container25 />
        </div>
      </div>
    </div>
  );
}

function Container21() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[16px] items-start relative size-full">
        <HorizontalBorder />
        <HorizontalBorder1 />
      </div>
    </div>
  );
}

function SideStatActiveMembers() {
  return (
    <div className="bg-[#0e0e0e] col-[9/span_4] justify-self-stretch relative row-1 self-start shrink-0" data-name="Side Stat: Active Members">
      <div aria-hidden="true" className="absolute border border-[rgba(93,63,60,0.1)] border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col items-start justify-between p-[33px] relative size-full">
        <Container19 />
        <Container21 />
      </div>
    </div>
  );
}

function Container26() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#393939] text-[12px] tracking-[1.2px] uppercase w-full">
        <p className="leading-[16px]">POS_DISTRIBUTION</p>
      </div>
    </div>
  );
}

function Container30() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e5e2e1] text-[10px] tracking-[1px] whitespace-nowrap">
        <p className="leading-[15px]">SUPPLEMENTS</p>
      </div>
    </div>
  );
}

function Container31() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e5e2e1] text-[10px] tracking-[1px] whitespace-nowrap">
        <p className="leading-[15px]">64%</p>
      </div>
    </div>
  );
}

function Container29() {
  return (
    <div className="h-[15px] relative shrink-0 w-full" data-name="Container">
      <div className="content-stretch flex items-start justify-between relative size-full">
        <Container30 />
        <Container31 />
      </div>
    </div>
  );
}

function Background() {
  return (
    <div className="bg-[#0e0e0e] h-[4px] relative shrink-0 w-full" data-name="Background">
      <div className="absolute bg-[#e31e24] inset-[0_36%_0_0]" data-name="Background" />
    </div>
  );
}

function Container28() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Container">
      <Container29 />
      <Background />
    </div>
  );
}

function Container34() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e5e2e1] text-[10px] tracking-[1px] whitespace-nowrap">
        <p className="leading-[15px]">APPAREL</p>
      </div>
    </div>
  );
}

function Container35() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e5e2e1] text-[10px] tracking-[1px] whitespace-nowrap">
        <p className="leading-[15px]">22%</p>
      </div>
    </div>
  );
}

function Container33() {
  return (
    <div className="content-stretch flex h-[15px] items-start justify-between relative shrink-0 w-full" data-name="Container">
      <Container34 />
      <Container35 />
    </div>
  );
}

function Background1() {
  return (
    <div className="bg-[#0e0e0e] h-[4px] relative shrink-0 w-full" data-name="Background">
      <div className="absolute bg-[#e31e24] inset-[0_78%_0_0]" data-name="Background" />
    </div>
  );
}

function Container32() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Container">
      <Container33 />
      <Background1 />
    </div>
  );
}

function Container38() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e5e2e1] text-[10px] tracking-[1px] whitespace-nowrap">
        <p className="leading-[15px]">ACCESSORIES</p>
      </div>
    </div>
  );
}

function Container39() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e5e2e1] text-[10px] tracking-[1px] whitespace-nowrap">
        <p className="leading-[15px]">14%</p>
      </div>
    </div>
  );
}

function Container37() {
  return (
    <div className="content-stretch flex h-[15px] items-start justify-between relative shrink-0 w-full" data-name="Container">
      <Container38 />
      <Container39 />
    </div>
  );
}

function Background2() {
  return (
    <div className="bg-[#0e0e0e] h-[4px] relative shrink-0 w-full" data-name="Background">
      <div className="absolute bg-[#e31e24] inset-[0_86%_0_0]" data-name="Background" />
    </div>
  );
}

function Container36() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Container">
      <Container37 />
      <Background2 />
    </div>
  );
}

function Container27() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full" data-name="Container">
      <Container28 />
      <Container32 />
      <Container36 />
    </div>
  );
}

function PosSalesSegment() {
  return (
    <div className="bg-[#2a2a2a] col-[1/span_4] justify-self-stretch relative row-2 self-start shrink-0" data-name="POS Sales Segment">
      <div className="content-stretch flex flex-col gap-[24px] items-start pb-[80px] pt-[32px] px-[32px] relative size-full">
        <Container26 />
        <Container27 />
      </div>
    </div>
  );
}

function Container40() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#393939] text-[12px] tracking-[1.2px] uppercase w-full">
        <p className="leading-[16px]">TOP_PERFORMING_SKU</p>
      </div>
    </div>
  );
}

function Cell() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[16px] pt-px px-px relative shrink-0 w-[253.14px]" data-name="Cell">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#393939] text-[9px] tracking-[1.8px] whitespace-nowrap">
        <p className="leading-[normal]">PRODUCT_NAME</p>
      </div>
    </div>
  );
}

function Cell1() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[16px] pt-px px-px relative shrink-0 w-[140.91px]" data-name="Cell">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#393939] text-[9px] tracking-[1.8px] whitespace-nowrap">
        <p className="leading-[normal]">UNITS_SOLD</p>
      </div>
    </div>
  );
}

function Cell2() {
  return (
    <div className="content-stretch flex flex-col items-end pb-[16px] pt-px px-px relative shrink-0 w-[159.28px]" data-name="Cell">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#393939] text-[9px] text-right tracking-[1.8px] whitespace-nowrap">
        <p className="leading-[normal]">GROSS_VALUE</p>
      </div>
    </div>
  );
}

function Row() {
  return (
    <div className="relative shrink-0 w-full" data-name="Row">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-center relative size-full">
        <Cell />
        <Cell1 />
        <Cell2 />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="content-stretch flex flex-col items-start mb-[-1px] pb-px relative shrink-0 w-full" data-name="Header">
      <div aria-hidden="true" className="absolute border-[rgba(93,63,60,0.1)] border-b border-solid inset-0 pointer-events-none" />
      <Row />
    </div>
  );
}

function Data() {
  return (
    <div className="relative shrink-0 w-[253.14px]" data-name="Data">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start px-px py-[16.5px] relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e5e2e1] text-[12px] tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[16px]">ISO_WHEY_PRO_2KG</p>
        </div>
      </div>
    </div>
  );
}

function Data1() {
  return (
    <div className="relative shrink-0 w-[140.91px]" data-name="Data">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start px-px py-[16.5px] relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e5e2e1] text-[12px] tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[16px]">412</p>
        </div>
      </div>
    </div>
  );
}

function Data2() {
  return (
    <div className="relative shrink-0 w-[159.28px]" data-name="Data">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-end px-px py-[16.5px] relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e31e24] text-[12px] text-right tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[16px]">$28,840.00</p>
        </div>
      </div>
    </div>
  );
}

function Row1() {
  return (
    <div className="content-stretch flex items-start justify-center mb-[-1px] pb-px relative shrink-0 w-full" data-name="Row">
      <div aria-hidden="true" className="absolute border-[rgba(93,63,60,0.05)] border-b border-solid inset-0 pointer-events-none" />
      <Data />
      <Data1 />
      <Data2 />
    </div>
  );
}

function Data3() {
  return (
    <div className="relative shrink-0 w-[253.14px]" data-name="Data">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start px-px py-[16.5px] relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e5e2e1] text-[12px] tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[16px]">KINETIC_GRIP_STRAPS</p>
        </div>
      </div>
    </div>
  );
}

function Data4() {
  return (
    <div className="relative shrink-0 w-[140.91px]" data-name="Data">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start px-px py-[16.5px] relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e5e2e1] text-[12px] tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[16px]">284</p>
        </div>
      </div>
    </div>
  );
}

function Data5() {
  return (
    <div className="relative shrink-0 w-[159.28px]" data-name="Data">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-end px-px py-[16.5px] relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e31e24] text-[12px] text-right tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[16px]">$8,520.00</p>
        </div>
      </div>
    </div>
  );
}

function Row2() {
  return (
    <div className="content-stretch flex items-start justify-center mb-[-1px] pb-px relative shrink-0 w-full" data-name="Row">
      <div aria-hidden="true" className="absolute border-[rgba(93,63,60,0.05)] border-b border-solid inset-0 pointer-events-none" />
      <Data3 />
      <Data4 />
      <Data5 />
    </div>
  );
}

function Data6() {
  return (
    <div className="relative shrink-0 w-[253.14px]" data-name="Data">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start px-px py-[16.5px] relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e5e2e1] text-[12px] tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[16px]">THERMAL_LIFT_PRE_v4</p>
        </div>
      </div>
    </div>
  );
}

function Data7() {
  return (
    <div className="relative shrink-0 w-[140.91px]" data-name="Data">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start px-px py-[16.5px] relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e5e2e1] text-[12px] tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[16px]">195</p>
        </div>
      </div>
    </div>
  );
}

function Data8() {
  return (
    <div className="relative shrink-0 w-[159.28px]" data-name="Data">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-end px-px py-[16.5px] relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e31e24] text-[12px] text-right tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[16px]">$12,675.00</p>
        </div>
      </div>
    </div>
  );
}

function Row3() {
  return (
    <div className="content-stretch flex items-start justify-center pb-px relative shrink-0 w-full" data-name="Row">
      <div aria-hidden="true" className="absolute border-[rgba(93,63,60,0.05)] border-b border-solid inset-0 pointer-events-none" />
      <Data6 />
      <Data7 />
      <Data8 />
    </div>
  );
}

function Body() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Body">
      <Row1 />
      <Row2 />
      <Row3 />
    </div>
  );
}

function Table() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Table">
      <Header />
      <Body />
    </div>
  );
}

function TopProductsList() {
  return (
    <div className="bg-[#1c1b1b] col-[5/span_8] justify-self-stretch relative row-2 self-start shrink-0" data-name="Top Products List">
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[32px] relative size-full">
        <Container40 />
        <Table />
      </div>
    </div>
  );
}

function BentoGridLayout() {
  return (
    <div className="gap-x-[4px] gap-y-[4px] grid grid-cols-[repeat(12,minmax(0,1fr))] grid-rows-[__397.50px_281px] relative shrink-0 w-full" data-name="Bento Grid Layout">
      <HeroStatTotalRevenue />
      <SideStatActiveMembers />
      <PosSalesSegment />
      <TopProductsList />
    </div>
  );
}

function Container42() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-black justify-center leading-[0] relative shrink-0 text-[#e5e2e1] text-[10px] tracking-[1px] uppercase whitespace-nowrap">
        <p className="leading-[15px]">LIVE_SYNC_ACTIVE: SERVER_NORTH_DELTA_04</p>
      </div>
    </div>
  );
}

function Container41() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[16px] items-center relative size-full">
        <div className="bg-[#e31e24] relative rounded-[9999px] shrink-0 size-[8px]" data-name="Background" />
        <Container42 />
      </div>
    </div>
  );
}

function Container43() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#393939] text-[10px] uppercase whitespace-nowrap">
          <p className="leading-[15px]">LAST_CALCULATION: 2023-10-27T14:42:01Z</p>
        </div>
      </div>
    </div>
  );
}

function SystemStatusBanner() {
  return (
    <div className="bg-[#131313] relative shrink-0 w-full" data-name="System Status Banner">
      <div aria-hidden="true" className="absolute border border-[rgba(227,30,36,0.3)] border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between p-[17px] relative size-full">
          <Container41 />
          <Container43 />
        </div>
      </div>
    </div>
  );
}

function MainContentCanvas() {
  return (
    <div className="relative shrink-0 w-full" data-name="Main Content Canvas">
      <div className="content-stretch flex flex-col gap-[48px] items-start pb-[48px] pt-[80px] px-[48px] relative size-full">
        <HeaderSection />
        <BentoGridLayout />
        <SystemStatusBanner />
      </div>
    </div>
  );
}

function Container44() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Container">
          <path d={svgPaths.p85bff00} fill="var(--fill-0, #FFFAFA)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Background3() {
  return (
    <div className="bg-[#e31e24] relative shrink-0 size-[40px]" data-name="Background">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Container44 />
      </div>
    </div>
  );
}

function Container46() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-black justify-center leading-[0] relative shrink-0 text-[#e31e24] text-[14px] tracking-[-0.7px] whitespace-nowrap">
        <p className="leading-[20px]">ADMIN_SYS</p>
      </div>
    </div>
  );
}

function Container47() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold justify-center leading-[0] not-italic relative shrink-0 text-[#393939] text-[10px] tracking-[1px] uppercase whitespace-nowrap">
        <p className="leading-[15px]">STATION_042</p>
      </div>
    </div>
  );
}

function Container45() {
  return (
    <div className="relative shrink-0 w-[78.95px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Container46 />
        <Container47 />
      </div>
    </div>
  );
}

function HorizontalBorder2() {
  return (
    <div className="content-stretch flex gap-[16px] items-center pb-[17px] pt-[16px] relative shrink-0 w-full" data-name="HorizontalBorder">
      <div aria-hidden="true" className="absolute border-[rgba(93,63,60,0.1)] border-b border-solid inset-0 pointer-events-none" />
      <Background3 />
      <Container45 />
    </div>
  );
}

function Margin() {
  return (
    <div className="relative shrink-0 w-full" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[40px] px-[24px] relative size-full">
        <HorizontalBorder2 />
      </div>
    </div>
  );
}

function Container48() {
  return (
    <div className="relative shrink-0 size-[10.5px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.5 10.5">
        <g id="Container">
          <path d={svgPaths.pa26e300} fill="var(--fill-0, #393939)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container49() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#393939] text-[12px] tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[16px]">DASHBOARD</p>
      </div>
    </div>
  );
}

function Link() {
  return (
    <div className="opacity-70 relative shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[16px] items-center px-[24px] py-[16px] relative size-full">
          <Container48 />
          <Container49 />
        </div>
      </div>
    </div>
  );
}

function Container50() {
  return (
    <div className="h-[9.333px] relative shrink-0 w-[12.833px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.8333 9.33333">
        <g id="Container">
          <path d={svgPaths.p1d3af800} fill="var(--fill-0, #393939)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container51() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#393939] text-[12px] tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[16px]">MEMBERS</p>
      </div>
    </div>
  );
}

function Link1() {
  return (
    <div className="opacity-70 relative shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[16px] items-center px-[24px] py-[16px] relative size-full">
          <Container50 />
          <Container51 />
        </div>
      </div>
    </div>
  );
}

function Container52() {
  return (
    <div className="relative shrink-0 size-[11.667px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.6667 11.6667">
        <g id="Container">
          <path d={svgPaths.p2ab96f00} fill="var(--fill-0, #393939)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container53() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#393939] text-[12px] tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[16px]">POS_TERMINAL</p>
      </div>
    </div>
  );
}

function Link2() {
  return (
    <div className="opacity-70 relative shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[16px] items-center px-[24px] py-[16px] relative size-full">
          <Container52 />
          <Container53 />
        </div>
      </div>
    </div>
  );
}

function Container54() {
  return (
    <div className="relative shrink-0 size-[10.5px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.5 10.5">
        <g id="Container">
          <path d={svgPaths.p83b7680} fill="var(--fill-0, #E31E24)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container55() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e31e24] text-[12px] tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[16px]">REPORTS</p>
        </div>
      </div>
    </div>
  );
}

function Link3() {
  return (
    <div className="bg-[rgba(57,57,57,0.1)] relative shrink-0 w-full" data-name="Link">
      <div aria-hidden="true" className="absolute border-[#e31e24] border-l-4 border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[16px] items-center pl-[28px] pr-[24px] py-[16px] relative size-full">
          <Container54 />
          <Container55 />
        </div>
      </div>
    </div>
  );
}

function Nav() {
  return (
    <div className="relative shrink-0 w-full" data-name="Nav">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start relative size-full">
        <Link />
        <Link1 />
        <Link2 />
        <Link3 />
      </div>
    </div>
  );
}

function AsideNavigationDrawerDesktopOnly() {
  return (
    <div className="absolute bg-[#0e0e0e] content-stretch flex flex-col h-[1024px] items-start left-0 pr-px pt-[80px] top-0 w-[256px]" data-name="Aside - NavigationDrawer (Desktop Only)">
      <div aria-hidden="true" className="absolute border-[rgba(57,57,57,0.1)] border-r border-solid inset-0 pointer-events-none" />
      <Margin />
      <Nav />
    </div>
  );
}

function Container57() {
  return (
    <div className="h-[18.506px] relative shrink-0 w-[18.032px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18.0318 18.5059">
        <g id="Container">
          <path d={svgPaths.p26ad4c00} fill="var(--fill-0, #E31E24)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Heading() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Heading 1">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e31e24] text-[20px] tracking-[-1px] uppercase whitespace-nowrap">
        <p className="leading-[28px]">KINETIC_PRECISION_POS</p>
      </div>
    </div>
  );
}

function Container56() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center relative size-full">
        <Container57 />
        <Heading />
      </div>
    </div>
  );
}

function Container60() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#393939] text-[12px] tracking-[1.2px] whitespace-nowrap">
        <p className="leading-[16px]">DASHBOARD</p>
      </div>
    </div>
  );
}

function Container61() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#393939] text-[12px] tracking-[1.2px] whitespace-nowrap">
        <p className="leading-[16px]">MEMBERS</p>
      </div>
    </div>
  );
}

function Container62() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#e31e24] text-[12px] tracking-[1.2px] whitespace-nowrap">
        <p className="leading-[16px]">REPORTS</p>
      </div>
    </div>
  );
}

function Container59() {
  return (
    <div className="content-stretch flex gap-[24px] items-center relative shrink-0" data-name="Container">
      <Container60 />
      <Container61 />
      <Container62 />
    </div>
  );
}

function Container63() {
  return (
    <div className="h-[10px] relative shrink-0 w-[10.05px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.05 10">
        <g id="Container">
          <path d={svgPaths.p20b1ad80} fill="var(--fill-0, #E5E2E1)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function BackgroundBorder() {
  return (
    <div className="bg-[#353534] content-stretch flex items-center justify-center p-px relative shrink-0 size-[32px]" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border border-[rgba(93,63,60,0.15)] border-solid inset-0 pointer-events-none" />
      <Container63 />
    </div>
  );
}

function Container58() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[32px] items-center relative size-full">
        <Container59 />
        <BackgroundBorder />
      </div>
    </div>
  );
}

function NavTopAppBarComponent() {
  return (
    <div className="absolute bg-[#131313] content-stretch flex h-[64px] items-center justify-between left-0 pb-px px-[24px] top-0 w-[1280px]" data-name="Nav - TopAppBar Component">
      <div aria-hidden="true" className="absolute border-[rgba(57,57,57,0.2)] border-b border-solid inset-0 pointer-events-none" />
      <Container56 />
      <Container58 />
    </div>
  );
}

export default function ReportesFinancieros() {
  return (
    <div className="content-stretch flex flex-col items-start pl-[256px] relative size-full" style={{ backgroundImage: "linear-gradient(90deg, rgb(19, 19, 19) 0%, rgb(19, 19, 19) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)" }} data-name="Reportes Financieros">
      <MainContentCanvas />
      <AsideNavigationDrawerDesktopOnly />
      <NavTopAppBarComponent />
    </div>
  );
}