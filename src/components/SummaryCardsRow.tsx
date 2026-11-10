import React from 'react';

export interface SummaryCardItem {
  label: string;
  value: string | number;
  onClick?: () => void;
}

interface SummaryCardsRowProps {
  cards: [SummaryCardItem, SummaryCardItem, SummaryCardItem, SummaryCardItem];
}

function MiniBarGraphic() {
  const heights = [18, 11, 24, 8, 13, 17, 27];
  return (
    <div className="flex items-end gap-[2.5px] sm:gap-[3.5px] h-7 sm:h-8 select-none shrink-0" aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          style={{ height: `${h}px` }}
          className="w-[2.5px] sm:w-[3px] bg-white/95 rounded-t-[1px] inline-block"
        />
      ))}
    </div>
  );
}

export const SummaryCardsRow: React.FC<SummaryCardsRowProps> = ({ cards }) => {
  const [card1, card2, card3, card4] = cards;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      {/* Card 1: Red with Mini Bars left, Value right */}
      <div
        onClick={card1.onClick}
        className={`relative h-[96px] sm:h-[106px] rounded-xl px-3.5 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-br from-[#E03E3E] via-[#D12828] to-[#B91818] text-white shadow-xs flex flex-col justify-between overflow-hidden ${
          card1.onClick ? 'cursor-pointer hover:brightness-105 transition' : ''
        }`}
      >
        <div className="text-[12px] sm:text-[13px] font-medium text-white/95 tracking-tight relative z-10 truncate">
          {card1.label}
        </div>
        <div className="flex items-end justify-between gap-1.5 relative z-10 mt-auto">
          <MiniBarGraphic />
          <div className="text-[20px] xs:text-[22px] sm:text-[26px] leading-none font-bold text-white tabular-nums tracking-tight">
            {card1.value}
          </div>
        </div>
      </div>

      {/* Card 2: Deep Blue with Wave Silhouette */}
      <div
        onClick={card2.onClick}
        className={`relative h-[96px] sm:h-[106px] rounded-xl px-3.5 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-b from-[#0E64C8] to-[#0A4592] text-white shadow-xs flex flex-col justify-start overflow-hidden ${
          card2.onClick ? 'cursor-pointer hover:brightness-105 transition' : ''
        }`}
      >
        <div className="text-[12px] sm:text-[13px] font-medium text-white/95 tracking-tight relative z-10 truncate">
          {card2.label}
        </div>
        <div className="text-[20px] xs:text-[22px] sm:text-[24px] leading-none font-bold text-white tabular-nums tracking-tight mt-1.5 sm:mt-2 relative z-10">
          {card2.value}
        </div>
        {/* Wave SVG at bottom */}
        <svg
          className="absolute inset-x-0 bottom-0 w-full h-12 sm:h-14 pointer-events-none"
          viewBox="0 0 260 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,45 C45,25 85,55 135,38 C185,20 220,10 260,30 L260,60 L0,60 Z"
            fill="rgba(255,255,255,0.13)"
          />
          <path
            d="M0,50 C55,35 105,58 160,35 C205,15 235,20 260,42 L260,60 L0,60 Z"
            fill="rgba(56,152,255,0.22)"
          />
        </svg>
      </div>

      {/* Card 3: Medium Blue with White Oscillating Line */}
      <div
        onClick={card3.onClick}
        className={`relative h-[96px] sm:h-[106px] rounded-xl px-3.5 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-br from-[#2B88DA] via-[#1E75C7] to-[#135BA5] text-white shadow-xs flex flex-col justify-start overflow-hidden ${
          card3.onClick ? 'cursor-pointer hover:brightness-105 transition' : ''
        }`}
      >
        <div className="text-[12px] sm:text-[13px] font-medium text-white/95 tracking-tight relative z-10 truncate">
          {card3.label}
        </div>
        <div className="text-[20px] xs:text-[22px] sm:text-[24px] leading-none font-bold text-white tabular-nums tracking-tight mt-1.5 sm:mt-2 relative z-10">
          {card3.value}
        </div>
        {/* Oscillating spline line on bottom right */}
        <svg
          className="absolute right-2 sm:right-3 bottom-2 sm:bottom-2.5 w-20 sm:w-32 h-9 sm:h-11 pointer-events-none"
          viewBox="0 0 130 44"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4,34 C14,34 20,8 30,8 C40,8 45,35 55,35 C65,35 71,16 80,16 C89,16 95,34 104,34 C112,34 117,22 126,34"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Card 4: Red with Mini Bars left, Value right */}
      <div
        onClick={card4.onClick}
        className={`relative h-[96px] sm:h-[106px] rounded-xl px-3.5 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-br from-[#E03E3E] via-[#D12828] to-[#B91818] text-white shadow-xs flex flex-col justify-between overflow-hidden ${
          card4.onClick ? 'cursor-pointer hover:brightness-105 transition' : ''
        }`}
      >
        <div className="text-[12px] sm:text-[13px] font-medium text-white/95 tracking-tight relative z-10 truncate">
          {card4.label}
        </div>
        <div className="flex items-end justify-between gap-1.5 relative z-10 mt-auto">
          <MiniBarGraphic />
          <div className="text-[20px] xs:text-[22px] sm:text-[26px] leading-none font-bold text-white tabular-nums tracking-tight">
            {card4.value}
          </div>
        </div>
      </div>
    </div>
  );
};
