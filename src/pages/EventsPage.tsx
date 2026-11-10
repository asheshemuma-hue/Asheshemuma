import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, ChevronDown, Calendar, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { EventRecord, EventStatus } from '../data/demoData';
import {
  formatDayMonth,
  formatDayMonthYear,
  formatTimeRange,
  getEffectiveEventStatus,
  getMondayToSundayWeekRange,
} from '../utils/dateUtils';
import { SummaryCardsRow } from '../components/SummaryCardsRow';
import { PaginationFooter } from '../components/PaginationFooter';

interface EventsPageProps {
  referenceDate: string;
  events: EventRecord[];
  onSaveEvent: (event: EventRecord, isNew: boolean) => void;
  openAddModalTrigger?: number;
}

const EVENT_STATUSES: EventStatus[] = ['Upcoming', 'Completed', 'Cancelled'];

export const EventsPage: React.FC<EventsPageProps> = ({
  referenceDate,
  events,
  onSaveEvent,
  openAddModalTrigger,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EventStatus>('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingNew, setIsEditingNew] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const [formData, setFormData] = useState<EventRecord>({
    id: '',
    name: '',
    date: referenceDate,
    startTime: '09:00',
    endTime: '11:00',
    location: 'Main Church Hall',
    description: '',
    status: 'Upcoming',
  });

  const generateNextEventId = () => {
    const maxNum = events.reduce((max, ev) => {
      const match = ev.id.match(/EVT-(\d+)/);
      const n = match ? parseInt(match[1], 10) : 0;
      return Math.max(max, n);
    }, 0);
    return `EVT-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleOpenAdd = () => {
    setFormError(null);
    setIsEditingNew(true);
    setFormData({
      id: generateNextEventId(),
      name: '',
      date: referenceDate,
      startTime: '09:00',
      endTime: '11:00',
      location: 'Main Church Hall',
      description: '',
      status: 'Upcoming',
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (openAddModalTrigger && openAddModalTrigger > 0) {
      handleOpenAdd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAddModalTrigger]);

  const handleOpenViewEdit = (event: EventRecord) => {
    setFormError(null);
    setIsEditingNew(false);
    setFormData({
      ...event,
      status: getEffectiveEventStatus(event, referenceDate),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Please enter an Event Name.');
      return;
    }
    if (!formData.date) {
      setFormError('Please select an Event Date.');
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      setFormError('Please specify both Start Time and End Time.');
      return;
    }
    if (formData.endTime <= formData.startTime) {
      setFormError('End Time must be after Start Time.');
      return;
    }
    if (!formData.location.trim()) {
      setFormError('Please enter a Location.');
      return;
    }

    const saved: EventRecord = {
      ...formData,
      name: formData.name.trim(),
      location: formData.location.trim(),
      description: formData.description.trim(),
    };

    onSaveEvent(saved, isEditingNew);
    setIsModalOpen(false);
    if (isEditingNew) {
      setCurrentPage(1);
    }
    setFeedbackBanner(
      isEditingNew
        ? `Event "${saved.name}" scheduled for ${formatDayMonthYear(saved.date)}.`
        : `Event "${saved.name}" updated.`
    );
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  // Decorate events with effective status relative to referenceDate
  const enrichedEvents = useMemo(() => {
    return events
      .map((ev) => ({
        ...ev,
        effectiveStatus: getEffectiveEventStatus(ev, referenceDate),
      }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [events, referenceDate]);

  // Summary card stats relative to referenceDate (week = Monday..Sunday)
  const summaryStats = useMemo(() => {
    const week = getMondayToSundayWeekRange(referenceDate);
    const upcomingList = enrichedEvents.filter((e) => e.effectiveStatus === 'Upcoming');
    const eventsThisWeek = enrichedEvents.filter(
      (e) =>
        e.effectiveStatus !== 'Cancelled' &&
        e.date >= week.start &&
        e.date <= week.end
    ).length;
    const eventsToday = enrichedEvents.filter(
      (e) => e.effectiveStatus !== 'Cancelled' && e.date === referenceDate
    ).length;

    const nextEventObj = upcomingList[0];
    const nextEventLabel = nextEventObj ? formatDayMonth(nextEventObj.date) : 'None';

    return {
      upcomingCount: upcomingList.length,
      eventsThisWeek,
      eventsToday,
      nextEventLabel,
    };
  }, [enrichedEvents, referenceDate]);

  const uniqueDates = useMemo(() => {
    const set = new Set<string>();
    enrichedEvents.forEach((ev) => set.add(ev.date));
    return Array.from(set);
  }, [enrichedEvents]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedEvents.filter((ev) => {
      if (statusFilter !== 'ALL' && ev.effectiveStatus !== statusFilter) return false;
      if (dateFilter !== 'ALL' && ev.date !== dateFilter) return false;
      if (q) {
        const matchName = ev.name.toLowerCase().includes(q);
        const matchLoc = ev.location.toLowerCase().includes(q);
        const matchDate = formatDayMonthYear(ev.date).toLowerCase().includes(q);
        if (!matchName && !matchLoc && !matchDate) return false;
      }
      return true;
    });
  }, [enrichedEvents, searchQuery, statusFilter, dateFilter]);

  const PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedEvents = filteredEvents.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  return (
    <div className="space-y-4">
      {/* Mobile Page Header (< lg): Unboxed side-by-side title/subtitle + Create Event button */}
      <div className="lg:hidden flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Events</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Plan and manage church activities.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 bg-[#D93025] hover:bg-[#B71C1C] text-white text-xs font-semibold px-3.5 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Event</span>
        </button>
      </div>

      {/* Desktop Page Header Card (lg:) */}
      <div className="hidden lg:flex bg-white border border-slate-200/80 rounded-xl px-6 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Events</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Plan and manage church activities.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 bg-[#D93025] hover:bg-[#B71C1C] text-white text-xs font-semibold px-4 py-2.5 rounded-md shadow-xs transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Event</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Four Summary Cards */}
      <SummaryCardsRow
        cards={[
          {
            label: 'Upcoming Events',
            value: summaryStats.upcomingCount,
            onClick: () => {
              setStatusFilter('Upcoming');
              setCurrentPage(1);
            },
          },
          {
            label: 'Events This Week',
            value: summaryStats.eventsThisWeek,
            onClick: () => {
              setStatusFilter('ALL');
              setCurrentPage(1);
            },
          },
          {
            label: 'Events Today',
            value: summaryStats.eventsToday,
          },
          {
            label: 'Next Event',
            value: summaryStats.nextEventLabel,
          },
        ]}
      />

      {/* Upcoming Events Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 sm:mb-5">
          <h2 className="text-lg md:text-base font-bold text-slate-900 tracking-tight">
            Upcoming Events
          </h2>

          {/* Mobile Search + 2-Column Filters (< md) */}
          <div className="flex flex-col gap-2.5 md:hidden">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search events"
                aria-label="Search events"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as 'ALL' | EventStatus);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by event status"
                  className="w-full appearance-none bg-[#F8FAFC] border border-slate-200 rounded-lg pl-3 pr-7 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer truncate"
                >
                  <option value="ALL">All Events</option>
                  {EVENT_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by date"
                  className="w-full appearance-none bg-[#F8FAFC] border border-slate-200 rounded-lg pl-8 pr-7 py-2.5 text-xs font-medium text-slate-600 focus:outline-none focus:border-blue-500 cursor-pointer truncate"
                >
                  <option value="ALL">Select Date</option>
                  {uniqueDates.map((d) => (
                    <option key={d} value={d}>
                      {formatDayMonthYear(d)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Desktop Search + Filters (md:) */}
          <div className="hidden md:flex flex-wrap items-center gap-2.5">
            <div className="relative w-64 lg:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search events"
                aria-label="Search events"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-md pl-8 pr-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as 'ALL' | EventStatus);
                  setCurrentPage(1);
                }}
                aria-label="Filter by event status"
                className="appearance-none bg-[#F8FAFC] border border-slate-200 rounded-md pl-3 pr-8 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Events</option>
                {EVENT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by date"
                className="appearance-none bg-[#F8FAFC] border border-slate-200 rounded-md pl-8 pr-8 py-2 text-xs font-medium text-slate-600 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">Select Date</option>
                {uniqueDates.map((d) => (
                  <option key={d} value={d}>
                    {formatDayMonthYear(d)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Mobile Table (< md): matches image_5bdf5b3d.png (4 columns EVENT | DATE | TIME | LOCATION + second row with Status badge & View button) */}
        <div className="md:hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2C3542] text-white text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-2.5 rounded-l-md w-[32%]">Event</th>
                <th className="py-2.5 px-2 w-[22%]">Date</th>
                <th className="py-2.5 px-2 w-[23%]">Time</th>
                <th className="py-2.5 px-2.5 rounded-r-md w-[23%]">Location</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-800">
              {paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                    No events match the selected search or filters.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((ev) => (
                  <React.Fragment key={ev.id}>
                    <tr className="align-top">
                      <td className="pt-3.5 pb-2 px-2.5 font-bold text-slate-900 text-[13px] leading-snug">
                        {ev.name}
                      </td>
                      <td className="pt-3.5 pb-2 px-2 font-medium text-slate-800 text-[12.5px] leading-snug tabular-nums">
                        <div>{formatDayMonth(ev.date)}</div>
                        <div>{ev.date.split('-')[0]}</div>
                      </td>
                      <td className="pt-3.5 pb-2 px-2 font-medium text-slate-800 text-[12.5px] leading-snug tabular-nums">
                        {formatTimeRange(ev.startTime, ev.endTime)}
                      </td>
                      <td className="pt-3.5 pb-2 px-2.5 font-medium text-slate-800 text-[12.5px] leading-snug">
                        {ev.location}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="pb-3.5 pt-0.5 px-2.5">
                        <span className="inline-block bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[11px] font-medium">
                          {ev.effectiveStatus}
                        </span>
                      </td>
                      <td className="pb-3.5 pt-0.5 px-2" colSpan={3}>
                        <button
                          type="button"
                          onClick={() => handleOpenViewEdit(ev)}
                          className="border border-blue-400/80 text-[#0D62C6] hover:bg-blue-50 px-4 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Desktop Table (md:): 6 columns (EVENT | DATE | TIME | LOCATION | STATUS | ACTION) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2C3542] text-white text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 rounded-l-md">Event</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right rounded-r-md">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px] text-slate-800">
              {paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No events match the selected search or filters.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {ev.name}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 tabular-nums whitespace-nowrap">
                      {formatDayMonthYear(ev.date)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 tabular-nums whitespace-nowrap">
                      {formatTimeRange(ev.startTime, ev.endTime)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {ev.location}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {ev.effectiveStatus}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenViewEdit(ev)}
                        className="border border-blue-400/80 text-[#0D62C6] hover:bg-blue-50 px-4 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationFooter
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={filteredEvents.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Create / View / Edit Event Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-[#2C3542] text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 id="event-modal-title" className="text-sm sm:text-base font-bold">
                  {isEditingNew ? 'Create Church Event' : `Event Details — ${formData.id}`}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                  Schedule and manage church services, rehearsals, and study sessions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
                className="text-slate-300 hover:text-white transition-colors cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Sunday Worship Service"
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const nextStatus: EventStatus =
                        formData.status === 'Cancelled'
                          ? 'Cancelled'
                          : newDate < referenceDate
                          ? 'Completed'
                          : 'Upcoming';
                      setFormData({ ...formData, date: newDate, status: nextStatus });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Main Church Hall"
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Event Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as EventStatus,
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    {EVENT_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe the service, ministry team, or schedule details..."
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-[#D93025] hover:bg-[#B71C1C] text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
