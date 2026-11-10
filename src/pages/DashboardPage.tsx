import React, { useMemo, useState } from 'react';
import { Users, Coins, UserPlus, Calendar, Search } from 'lucide-react';
import {
  ActivityItem,
  AttendanceRecord,
  EventRecord,
  GivingRecord,
  MemberRecord,
  PageId,
} from '../data/demoData';
import {
  formatCurrencyUSD,
  formatDayMonth,
  formatDayMonthYear,
  formatMonthDay,
  formatTime12h,
  getEffectiveEventStatus,
  isSameMonthAndYear,
} from '../utils/dateUtils';
import { SummaryCardsRow } from '../components/SummaryCardsRow';
import { PaginationFooter } from '../components/PaginationFooter';

interface DashboardPageProps {
  referenceDate: string;
  members: MemberRecord[];
  attendance: AttendanceRecord[];
  giving: GivingRecord[];
  events: EventRecord[];
  activities: ActivityItem[];
  onNavigate: (page: PageId) => void;
  onQuickAction?: (action: 'member' | 'attendance' | 'giving' | 'event') => void;
}

type TimeframeOption = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export const DashboardPage: React.FC<DashboardPageProps> = ({
  referenceDate,
  members,
  attendance,
  giving,
  events,
  activities,
  onNavigate,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('MONTHLY');
  const [eventSearch, setEventSearch] = useState('');
  const [eventPage, setEventPage] = useState(1);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Sort attendance records chronologically up to referenceDate (or all if none <= referenceDate)
  const relevantAttendance = useMemo(() => {
    const upToRef = attendance.filter((a) => a.date <= referenceDate);
    const source = upToRef.length > 0 ? upToRef : attendance;
    return [...source].sort((a, b) => a.date.localeCompare(b.date));
  }, [attendance, referenceDate]);

  // Latest Sunday attendance record
  const latestAttendance = useMemo(() => {
    if (relevantAttendance.length === 0) {
      return { members: 0, visitors: 0, total: 0, date: referenceDate, service: 'Sunday Worship Service' };
    }
    return relevantAttendance[relevantAttendance.length - 1];
  }, [relevantAttendance, referenceDate]);

  // Filter chart data by selected timeframe tab
  const chartRecords = useMemo(() => {
    if (relevantAttendance.length === 0) return [];
    if (timeframe === 'DAILY') {
      return relevantAttendance.slice(-3);
    }
    if (timeframe === 'WEEKLY') {
      return relevantAttendance.slice(-4);
    }
    if (timeframe === 'MONTHLY') {
      return relevantAttendance.slice(-4);
    }
    return relevantAttendance.slice(-8);
  }, [relevantAttendance, timeframe]);

  // Monthly giving total for referenceDate's month (or all if none in reference month)
  const monthlyGivingTotal = useMemo(() => {
    const inMonth = giving.filter(
      (g) => isSameMonthAndYear(g.date, referenceDate) && g.date <= referenceDate
    );
    const list = inMonth.length > 0 ? inMonth : giving;
    return list.reduce((sum, item) => sum + item.amount, 0);
  }, [giving, referenceDate]);

  // Upcoming events relative to referenceDate
  const upcomingEventsList = useMemo(() => {
    return events
      .filter((e) => getEffectiveEventStatus(e, referenceDate) === 'Upcoming')
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [events, referenceDate]);

  const filteredUpcomingEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    if (!q) return upcomingEventsList;
    return upcomingEventsList.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        formatDayMonthYear(e.date).toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q)
    );
  }, [upcomingEventsList, eventSearch]);

  const EVENT_PAGE_SIZE = 3;
  const totalEventPages = Math.max(1, Math.ceil(filteredUpcomingEvents.length / EVENT_PAGE_SIZE));
  const currentEventPage = Math.min(eventPage, totalEventPages);
  const displayedEvents = filteredUpcomingEvents.slice(
    (currentEventPage - 1) * EVENT_PAGE_SIZE,
    currentEventPage * EVENT_PAGE_SIZE
  );

  // Chart geometry and scales
  const chartGeometry = useMemo(() => {
    const width = 460;
    const height = 185;
    const padLeft = 36;
    const padRight = 18;
    const padTop = 14;
    const padBottom = 26;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const totals = chartRecords.map((r) => r.total);
    const minVal = totals.length ? Math.min(...totals) : 140;
    const maxVal = totals.length ? Math.max(...totals) : 200;

    const yMin = minVal >= 140 && maxVal <= 195 ? 140 : Math.max(0, Math.floor((minVal - 15) / 10) * 10);
    const yMax = minVal >= 140 && maxVal <= 195 ? 200 : Math.ceil((maxVal + 15) / 10) * 10;
    const yRange = Math.max(10, yMax - yMin);

    const step = yRange <= 60 ? 10 : Math.ceil(yRange / 6 / 10) * 10;
    const ticks: number[] = [];
    for (let v = yMin; v <= yMax; v += step) {
      ticks.push(v);
    }

    const getX = (idx: number, count: number) => {
      if (count <= 1) return padLeft + plotW / 2;
      return padLeft + (idx / (count - 1)) * plotW;
    };

    const getY = (val: number) => {
      return padTop + plotH - ((val - yMin) / yRange) * plotH;
    };

    const points = chartRecords.map((rec, i) => ({
      x: getX(i, chartRecords.length),
      y: getY(rec.total),
      record: rec,
    }));

    const n = points.length;
    const avgGrowth =
      n > 1 ? (chartRecords[n - 1].total - chartRecords[0].total) / (n - 1) : 5;
    const trendOffset = Math.max(4, Math.round(avgGrowth * 0.65));

    const trendPoints = points.map((pt, i) => {
      const val = chartRecords[i].total + (i === 0 ? 1 : trendOffset + (i % 2 === 1 ? 2 : 0));
      return {
        x: pt.x,
        y: getY(Math.min(yMax - 2, val)),
      };
    });

    let trendPath = '';
    if (trendPoints.length > 0) {
      trendPath = `M ${trendPoints[0].x},${trendPoints[0].y}`;
      for (let i = 0; i < trendPoints.length - 1; i++) {
        const p0 = trendPoints[i];
        const p1 = trendPoints[i + 1];
        const midX = (p0.x + p1.x) / 2;
        const waveY0 = p0.y - 6;
        const waveY1 = p1.y + 3;
        trendPath += ` C ${midX - 12},${waveY0} ${midX + 12},${waveY1} ${p1.x},${p1.y}`;
      }
      const lastPt = trendPoints[trendPoints.length - 1];
      trendPath += ` C ${lastPt.x + 5},${lastPt.y - 3} ${lastPt.x + 8},${lastPt.y - 4} ${lastPt.x + 10},${lastPt.y - 3}`;
    }

    const linePath =
      points.length > 0
        ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ')
        : '';

    const areaPath =
      points.length > 0
        ? `${linePath} L ${points[points.length - 1].x},${padTop + plotH} L ${points[0].x},${padTop + plotH} Z`
        : '';

    const trendAreaPath =
      points.length > 0 && trendPoints.length > 0
        ? `${trendPath} L ${points[points.length - 1].x},${points[points.length - 1].y} ` +
          points
            .slice()
            .reverse()
            .map((p) => `L ${p.x},${p.y}`)
            .join(' ') +
          ' Z'
        : '';

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      plotW,
      plotH,
      ticks,
      getY,
      points,
      linePath,
      areaPath,
      trendPath,
      trendAreaPath,
    };
  }, [chartRecords]);

  // Ring chart calculation for Last Sunday Attendance
  const ringMetrics = useMemo(() => {
    const m = latestAttendance.members;
    const v = latestAttendance.visitors;
    const total = Math.max(1, m + v);
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const visitorsFraction = v / total;
    const membersFraction = m / total;
    const visitorsLength = visitorsFraction * circumference;
    const membersLength = membersFraction * circumference;

    return {
      radius,
      circumference,
      visitorsLength,
      membersLength,
    };
  }, [latestAttendance]);

  const summaryCardsConfig: [
    { label: string; value: string | number; onClick: () => void },
    { label: string; value: string | number; onClick: () => void },
    { label: string; value: string | number; onClick: () => void },
    { label: string; value: string | number; onClick: () => void }
  ] = [
    {
      label: 'Total Members',
      value: members.length,
      onClick: () => onNavigate('members'),
    },
    {
      label: 'Sunday Attendance',
      value: latestAttendance.total,
      onClick: () => onNavigate('attendance'),
    },
    {
      label: 'Monthly Giving',
      value: formatCurrencyUSD(monthlyGivingTotal),
      onClick: () => onNavigate('giving'),
    },
    {
      label: 'Upcoming Events',
      value: upcomingEventsList.length,
      onClick: () => onNavigate('events'),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Mobile-Only Top Heading ("Dashboard / Welcome to ECR Church Management System") */}
      <div className="lg:hidden px-0.5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Dashboard
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Welcome to ECR Church Management System
        </p>
      </div>

      {/* Four Colored Summary Cards:
          - On mobile (< lg): order-1 (appears right below mobile heading, matching phone screenshot)
          - On desktop (lg:): order-2 (appears in middle row below the two top chart cards) */}
      <div className="order-1 lg:order-2">
        <SummaryCardsRow cards={summaryCardsConfig} />
      </div>

      {/* Top Charts Section:
          - On mobile (< lg): order-2 (appears after the 2x2 summary cards)
          - On desktop (lg:): order-1 (appears at the very top) */}
      <div className="order-2 lg:order-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Panel: Dashboard Overview + Attendance Overview Chart */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          {/* Top Header inside Panel */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
            {/* On mobile, titled "Attendance Overview"; on desktop, titled "Dashboard" */}
            <h2 className="text-[15px] font-bold text-slate-800 tracking-tight">
              <span className="lg:hidden">Attendance Overview</span>
              <span className="hidden lg:inline">Dashboard</span>
            </h2>

            {/* Time Controls: DAILY | WEEKLY | MONTHLY | YEARLY */}
            <div className="hidden sm:flex items-center gap-4 text-[11px] font-semibold tracking-wider">
              {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as TimeframeOption[]).map((tf) => {
                const isActive = timeframe === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`pb-1 transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'text-slate-900 border-b-2 border-[#D93025]'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>

            {/* Chart Legend */}
            <div className="flex items-center gap-3 sm:gap-4 text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-[#0B63CE] inline-block" />
                Attendance
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-[#E53935] inline-block" />
                Trend
              </span>
            </div>
          </div>

          {/* Mobile Timeframe Selector & Overview Link */}
          <div className="flex sm:hidden items-center justify-between gap-2 pb-2 border-b border-slate-100 mb-2">
            <div className="flex items-center gap-2.5 text-[10px] font-semibold tracking-wider">
              {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as TimeframeOption[]).map((tf) => {
                const isActive = timeframe === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`pb-0.5 transition-colors cursor-pointer ${
                      isActive
                        ? 'text-slate-900 border-b-2 border-[#D93025]'
                        : 'text-slate-400'
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-[11px] font-semibold text-[#D32F2F] hover:underline cursor-pointer"
            >
              Attendance Overview →
            </button>
          </div>

          {/* Main Body: Left KPIs + Button (Desktop) | Right Line Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-1">
            {/* Left Stats Column (Visible on Desktop lg:, while on mobile these stats are in the top 2x2 cards) */}
            <div className="hidden lg:flex lg:col-span-4 flex-col justify-between h-full py-1 space-y-4">
              <div className="space-y-3.5">
                <div>
                  <div className="text-[26px] font-bold text-slate-900 tabular-nums leading-tight">
                    {members.length}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Total Members
                  </div>
                </div>

                <div>
                  <div className="text-[26px] font-bold text-slate-900 tabular-nums leading-tight">
                    {latestAttendance.total}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Sunday Attendance
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-xs font-semibold px-4 py-2.5 rounded-md shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  Attendance Overview
                </button>
              </div>
            </div>

            {/* Right Attendance Overview Chart */}
            <div className="lg:col-span-8 relative">
              <svg
                viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
                className="w-full h-[175px] sm:h-[190px] overflow-visible"
                role="img"
                aria-label="Attendance Overview Chart"
              >
                <defs>
                  <linearGradient id="attendanceBlueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1E6FD9" stopOpacity="0.34" />
                    <stop offset="100%" stopColor="#1E6FD9" stopOpacity="0.03" />
                  </linearGradient>
                  <linearGradient id="trendPinkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Lines & Y-Axis Labels */}
                {chartGeometry.ticks.map((tick) => {
                  const y = chartGeometry.getY(tick);
                  return (
                    <g key={tick}>
                      <line
                        x1={chartGeometry.padLeft}
                        y1={y}
                        x2={chartGeometry.width - chartGeometry.padRight}
                        y2={y}
                        stroke="#F1F5F9"
                        strokeWidth="1"
                      />
                      <text
                        x={chartGeometry.padLeft - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        className="fill-slate-500 text-[10.5px] font-medium tabular-nums"
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}

                {/* Left Vertical Axis Line */}
                <line
                  x1={chartGeometry.padLeft}
                  y1={chartGeometry.padTop}
                  x2={chartGeometry.padLeft}
                  y2={chartGeometry.padTop + chartGeometry.plotH}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />

                {/* Bottom Horizontal Axis Line */}
                <line
                  x1={chartGeometry.padLeft}
                  y1={chartGeometry.padTop + chartGeometry.plotH}
                  x2={chartGeometry.width - chartGeometry.padRight}
                  y2={chartGeometry.padTop + chartGeometry.plotH}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />

                {/* Subtle pink area between trend and attendance */}
                {chartGeometry.trendAreaPath && (
                  <path d={chartGeometry.trendAreaPath} fill="url(#trendPinkGrad)" />
                )}

                {/* Blue area under attendance line */}
                {chartGeometry.areaPath && (
                  <path d={chartGeometry.areaPath} fill="url(#attendanceBlueGrad)" />
                )}

                {/* Red Trend Curve */}
                {chartGeometry.trendPath && (
                  <path
                    d={chartGeometry.trendPath}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                )}

                {/* Blue Attendance Line */}
                {chartGeometry.linePath && (
                  <path
                    d={chartGeometry.linePath}
                    fill="none"
                    stroke="#0B63CE"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data Points & X-Axis Date Labels */}
                {chartGeometry.points.map((pt, idx) => (
                  <g
                    key={pt.record.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                    onMouseLeave={() => setHoveredPointIndex(null)}
                    onClick={() =>
                      setHoveredPointIndex(hoveredPointIndex === idx ? null : idx)
                    }
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredPointIndex === idx ? 5.5 : 4.2}
                      fill="#0B63CE"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <text
                      x={pt.x}
                      y={chartGeometry.height - 6}
                      textAnchor="middle"
                      className="fill-slate-600 text-[11px] font-medium"
                    >
                      {formatMonthDay(pt.record.date)}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Interactive Tooltip on Hover/Tap */}
              {hoveredPointIndex !== null && chartGeometry.points[hoveredPointIndex] && (
                <div className="absolute top-2 right-2 sm:right-4 bg-slate-900 text-white text-[11px] rounded-md px-3 py-1.5 shadow-md pointer-events-none z-20">
                  <div className="font-semibold">
                    {formatDayMonthYear(chartGeometry.points[hoveredPointIndex].record.date)}
                  </div>
                  <div className="text-slate-300 tabular-nums">
                    Total:{' '}
                    <span className="text-white font-bold">
                      {chartGeometry.points[hoveredPointIndex].record.total}
                    </span>{' '}
                    ({chartGeometry.points[hoveredPointIndex].record.members} members,{' '}
                    {chartGeometry.points[hoveredPointIndex].record.visitors} visitors)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Last Sunday Attendance Ring Chart */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-slate-800 tracking-tight">
              Last Sunday Attendance
            </h2>
            <span className="text-xs font-semibold text-slate-400 tabular-nums hidden lg:inline">
              {latestAttendance.total} Total
            </span>
          </div>

          {/* Mobile Layout (< lg): Ring Chart Left + Vertical Divider + Stacked Stats Right */}
          <div className="flex lg:hidden items-center justify-around gap-4 py-3">
            <div className="relative w-[132px] h-[132px] flex items-center justify-center shrink-0">
              <svg
                viewBox="0 0 148 148"
                className="w-full h-full"
                role="img"
                aria-label={`Last Sunday Attendance: ${latestAttendance.members} Members, ${latestAttendance.visitors} Visitors, ${latestAttendance.total} Total`}
              >
                <circle
                  cx="74"
                  cy="74"
                  r={ringMetrics.radius}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="20"
                />
                <circle
                  cx="74"
                  cy="74"
                  r={ringMetrics.radius}
                  fill="none"
                  stroke="#0056B3"
                  strokeWidth="20"
                  strokeDasharray={`${ringMetrics.membersLength} ${ringMetrics.circumference}`}
                  strokeDashoffset={-ringMetrics.visitorsLength}
                  transform="rotate(-150 74 74)"
                />
                <circle
                  cx="74"
                  cy="74"
                  r={ringMetrics.radius}
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="20"
                  strokeDasharray={`${ringMetrics.visitorsLength} ${ringMetrics.circumference}`}
                  strokeDashoffset={0}
                  transform="rotate(-150 74 74)"
                />
              </svg>
            </div>

            <div className="w-px h-24 bg-slate-200 shrink-0" aria-hidden="true" />

            <div className="space-y-4 pr-2">
              <div>
                <div className="text-2xl font-bold text-slate-900 tabular-nums leading-tight">
                  {latestAttendance.members}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0056B3] inline-block shrink-0" />
                  <span>Members</span>
                </div>
              </div>

              <div>
                <div className="text-2xl font-bold text-slate-900 tabular-nums leading-tight">
                  {latestAttendance.visitors}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] inline-block shrink-0" />
                  <span>Visitors</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout (lg:): Centered Ring Chart + 2-Column Legend Underneath */}
          <div className="hidden lg:flex flex-col items-center justify-center my-2">
            <div className="relative w-[148px] h-[148px] flex items-center justify-center">
              <svg
                viewBox="0 0 148 148"
                className="w-full h-full"
                role="img"
                aria-label={`Last Sunday Attendance: ${latestAttendance.members} Members, ${latestAttendance.visitors} Visitors, ${latestAttendance.total} Total`}
              >
                <circle
                  cx="74"
                  cy="74"
                  r={ringMetrics.radius}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="20"
                />
                <circle
                  cx="74"
                  cy="74"
                  r={ringMetrics.radius}
                  fill="none"
                  stroke="#0056B3"
                  strokeWidth="20"
                  strokeDasharray={`${ringMetrics.membersLength} ${ringMetrics.circumference}`}
                  strokeDashoffset={-ringMetrics.visitorsLength}
                  transform="rotate(-150 74 74)"
                />
                <circle
                  cx="74"
                  cy="74"
                  r={ringMetrics.radius}
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="20"
                  strokeDasharray={`${ringMetrics.visitorsLength} ${ringMetrics.circumference}`}
                  strokeDashoffset={0}
                  transform="rotate(-150 74 74)"
                />
              </svg>
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-around pt-1">
            <div className="text-center">
              <div className="text-xl font-bold text-slate-900 tabular-nums leading-tight">
                {latestAttendance.members}
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-[#0056B3] inline-block" />
                <span>Members</span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-xl font-bold text-slate-900 tabular-nums leading-tight">
                {latestAttendance.visitors}
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-[#DC2626] inline-block" />
                <span>Visitors</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row:
          - On mobile (< lg): Upcoming Events comes FIRST (order-1), Recent Activities SECOND (order-2)
          - On desktop (lg:): Recent Activities is on LEFT (lg:order-1, 5 cols), Upcoming Events on RIGHT (lg:order-2, 7 cols) */}
      <div className="order-3 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Recent Activities Panel */}
        <div className="order-2 lg:order-1 lg:col-span-5 bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <h2 className="text-[15px] font-bold text-slate-800 tracking-tight mb-4 sm:mb-5">
            Recent Activities
          </h2>

          <div className="space-y-6 relative">
            {activities.slice(0, 4).map((act, idx, arr) => {
              const isLast = idx === arr.length - 1;
              return (
                <div key={act.id} className="flex items-start gap-3.5 relative">
                  {/* Time Ago */}
                  <div className="w-[68px] text-right text-xs text-slate-500 pt-1.5 shrink-0 tabular-nums">
                    {act.timeAgo}
                  </div>

                  {/* Icon Node + Vertical Connector */}
                  <div className="relative flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-2xs relative z-10 ${
                        act.type === 'attendance'
                          ? 'bg-[#E53935]'
                          : act.type === 'giving'
                          ? 'bg-[#1976D2]'
                          : act.type === 'member'
                          ? 'bg-[#1976D2]'
                          : 'bg-[#0D62C6]'
                      }`}
                    >
                      {act.type === 'attendance' && <Users className="w-4 h-4" />}
                      {act.type === 'giving' && <Coins className="w-4 h-4" />}
                      {act.type === 'member' && <UserPlus className="w-4 h-4" />}
                      {act.type === 'event' && <Calendar className="w-4 h-4" />}
                    </div>
                    {!isLast && (
                      <div
                        className="w-px h-7 bg-slate-200 absolute top-8"
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  {/* Activity Text */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="text-xs font-semibold text-slate-800 leading-snug">
                      {act.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {act.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events Panel */}
        <div className="order-1 lg:order-2 lg:col-span-7 bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            {/* Panel Header */}
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-bold text-slate-800 tracking-tight whitespace-nowrap">
                  Upcoming Events
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('events')}
                  className="hidden sm:inline text-xs font-semibold text-[#0D62C6] hover:text-[#0A4694] hover:underline cursor-pointer whitespace-nowrap"
                >
                  View All
                </button>
              </div>

              {/* Compact Search Input */}
              <div className="relative w-36 sm:w-44">
                <input
                  type="text"
                  value={eventSearch}
                  onChange={(e) => {
                    setEventSearch(e.target.value);
                    setEventPage(1);
                  }}
                  placeholder="Search"
                  aria-label="Search upcoming events"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-md pl-3 pr-7 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Compact Upcoming Events Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#2C3542] text-white text-[11px] font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3 sm:px-4 rounded-l-md">Event</th>
                    <th className="py-2.5 px-3 sm:px-4">Date</th>
                    <th className="py-2.5 px-3 sm:px-4 rounded-r-md">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px] text-slate-800">
                  {displayedEvents.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-xs text-slate-400">
                        No upcoming events matching your search.
                      </td>
                    </tr>
                  ) : (
                    displayedEvents.map((ev) => (
                      <tr
                        key={ev.id}
                        onClick={() => onNavigate('events')}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-3 sm:px-4 font-medium text-slate-800">
                          {ev.name}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-slate-700 tabular-nums whitespace-nowrap">
                          {formatDayMonth(ev.date)}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-slate-700 tabular-nums whitespace-nowrap">
                          {formatTime12h(ev.startTime)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="hidden lg:block">
            <PaginationFooter
              currentPage={currentEventPage}
              totalPages={totalEventPages}
              totalItems={filteredUpcomingEvents.length}
              pageSize={EVENT_PAGE_SIZE}
              onPageChange={setEventPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
