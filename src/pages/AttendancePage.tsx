import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, ChevronDown, Calendar, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { AttendanceRecord, SERVICE_TYPES } from '../data/demoData';
import { formatDayMonthYear } from '../utils/dateUtils';
import { SummaryCardsRow } from '../components/SummaryCardsRow';
import { PaginationFooter } from '../components/PaginationFooter';

interface AttendancePageProps {
  referenceDate: string;
  attendance: AttendanceRecord[];
  onSaveAttendance: (record: AttendanceRecord, isNew: boolean) => void;
  openAddModalTrigger?: number;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({
  referenceDate,
  attendance,
  onSaveAttendance,
  openAddModalTrigger,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingNew, setIsEditingNew] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    id: string;
    service: string;
    date: string;
    membersStr: string;
    visitorsStr: string;
    notes: string;
  }>({
    id: '',
    service: 'Sunday Worship Service',
    date: referenceDate,
    membersStr: '150',
    visitorsStr: '30',
    notes: '',
  });

  const generateNextAttendanceId = () => {
    const maxNum = attendance.reduce((max, a) => {
      const match = a.id.match(/ATT-(\d+)/);
      const n = match ? parseInt(match[1], 10) : 0;
      return Math.max(max, n);
    }, 0);
    return `ATT-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleOpenAdd = () => {
    setFormError(null);
    setIsEditingNew(true);
    setFormData({
      id: generateNextAttendanceId(),
      service: 'Sunday Worship Service',
      date: referenceDate,
      membersStr: '152',
      visitorsStr: '28',
      notes: '',
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (openAddModalTrigger && openAddModalTrigger > 0) {
      handleOpenAdd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAddModalTrigger]);

  const handleOpenViewEdit = (record: AttendanceRecord) => {
    setFormError(null);
    setIsEditingNew(false);
    setFormData({
      id: record.id,
      service: record.service,
      date: record.date,
      membersStr: String(record.members),
      visitorsStr: String(record.visitors),
      notes: record.notes,
    });
    setIsModalOpen(true);
  };

  const parsedMembers = Number(formData.membersStr);
  const parsedVisitors = Number(formData.visitorsStr);
  const computedTotal =
    (!Number.isNaN(parsedMembers) && parsedMembers >= 0 ? Math.floor(parsedMembers) : 0) +
    (!Number.isNaN(parsedVisitors) && parsedVisitors >= 0 ? Math.floor(parsedVisitors) : 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.service.trim()) {
      setFormError('Please enter a Service Name.');
      return;
    }
    if (!formData.date) {
      setFormError('Please select a Service Date.');
      return;
    }

    const mNum = Number(formData.membersStr);
    const vNum = Number(formData.visitorsStr);

    if (
      formData.membersStr.trim() === '' ||
      Number.isNaN(mNum) ||
      mNum < 0 ||
      !Number.isInteger(mNum)
    ) {
      setFormError('Number of Members Present must be a non-negative whole number.');
      return;
    }

    if (
      formData.visitorsStr.trim() === '' ||
      Number.isNaN(vNum) ||
      vNum < 0 ||
      !Number.isInteger(vNum)
    ) {
      setFormError('Number of Visitors Present must be a non-negative whole number.');
      return;
    }

    const saved: AttendanceRecord = {
      id: formData.id,
      service: formData.service.trim(),
      date: formData.date,
      members: mNum,
      visitors: vNum,
      total: mNum + vNum,
      notes: formData.notes.trim(),
    };

    onSaveAttendance(saved, isEditingNew);
    setIsModalOpen(false);
    if (isEditingNew) {
      setCurrentPage(1);
    }
    setFeedbackBanner(
      isEditingNew
        ? `Attendance recorded for ${formatDayMonthYear(saved.date)} (${saved.total} people).`
        : `Attendance record for ${formatDayMonthYear(saved.date)} updated (${saved.total} people).`
    );
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  // Sort records descending by date for history & summary cards
  const sortedAttendanceDesc = useMemo(() => {
    return [...attendance].sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance]);

  const summaryStats = useMemo(() => {
    const upToRef = sortedAttendanceDesc.filter((a) => a.date <= referenceDate);
    const list = upToRef.length > 0 ? upToRef : sortedAttendanceDesc;
    const latest = list[0] || { total: 0, members: 0, visitors: 0 };
    const previous = list[1] || { total: 0, members: 0, visitors: 0 };
    return {
      lastSunday: latest.total,
      membersPresent: latest.members,
      visitorsPresent: latest.visitors,
      previousSunday: previous.total,
    };
  }, [sortedAttendanceDesc, referenceDate]);

  const serviceOptions = useMemo(() => {
    const set = new Set<string>(SERVICE_TYPES);
    attendance.forEach((a) => {
      if (a.service) set.add(a.service);
    });
    return Array.from(set);
  }, [attendance]);

  const uniqueDates = useMemo(() => {
    const set = new Set<string>();
    sortedAttendanceDesc.forEach((a) => set.add(a.date));
    return Array.from(set);
  }, [sortedAttendanceDesc]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedAttendanceDesc.filter((rec) => {
      if (serviceFilter !== 'ALL' && rec.service !== serviceFilter) return false;
      if (dateFilter !== 'ALL' && rec.date !== dateFilter) return false;
      if (q) {
        const matchService = rec.service.toLowerCase().includes(q);
        const matchDate = formatDayMonthYear(rec.date).toLowerCase().includes(q);
        if (!matchService && !matchDate) return false;
      }
      return true;
    });
  }, [sortedAttendanceDesc, searchQuery, serviceFilter, dateFilter]);

  const PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRecords = filteredRecords.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  return (
    <div className="space-y-4">
      {/* Mobile Page Header (< lg): Unboxed heading + subtitle + button below */}
      <div className="lg:hidden px-0.5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Record and review attendance for your church services.
        </p>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="mt-3 inline-flex items-center gap-2 bg-[#D93025] hover:bg-[#B71C1C] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Record Attendance</span>
        </button>
      </div>

      {/* Desktop Page Header Card (lg:) */}
      <div className="hidden lg:flex bg-white border border-slate-200/80 rounded-xl px-6 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Attendance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record and review attendance for your church services.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 bg-[#D93025] hover:bg-[#B71C1C] text-white text-xs font-semibold px-4 py-2.5 rounded-md shadow-xs transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Record Attendance</span>
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
            label: 'Last Sunday',
            value: summaryStats.lastSunday,
          },
          {
            label: 'Members Present',
            value: summaryStats.membersPresent,
          },
          {
            label: 'Visitors Present',
            value: summaryStats.visitorsPresent,
          },
          {
            label: 'Previous Sunday',
            value: summaryStats.previousSunday,
          },
        ]}
      />

      {/* Attendance History Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 sm:mb-5">
          <h2 className="text-lg md:text-base font-bold text-slate-900 tracking-tight">
            Attendance History
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
                placeholder="Search by service"
                aria-label="Search by service"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="relative">
                <select
                  value={serviceFilter}
                  onChange={(e) => {
                    setServiceFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by service"
                  className="w-full appearance-none bg-[#F8FAFC] border border-slate-200 rounded-lg pl-3 pr-7 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer truncate"
                >
                  <option value="ALL">All Services</option>
                  {serviceOptions.map((srv) => (
                    <option key={srv} value={srv}>
                      {srv}
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
                placeholder="Search by service"
                aria-label="Search by service"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-md pl-8 pr-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="relative">
              <select
                value={serviceFilter}
                onChange={(e) => {
                  setServiceFilter(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by service"
                className="appearance-none bg-[#F8FAFC] border border-slate-200 rounded-md pl-3 pr-8 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Services</option>
                {serviceOptions.map((srv) => (
                  <option key={srv} value={srv}>
                    {srv}
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

        {/* Mobile Table (< md): matches image_81bc607f.png (DATE | SERVICE + members/visitors subtext | TOTAL | View button) */}
        <div className="md:hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2C3542] text-white text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-2.5 rounded-l-md">Date</th>
                <th className="py-2.5 px-2">Service</th>
                <th className="py-2.5 px-2 text-center">Total</th>
                <th className="py-2.5 px-2.5 text-right rounded-r-md">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                    No attendance records match the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-2.5 align-middle font-bold text-slate-900 tabular-nums whitespace-nowrap text-[12.5px]">
                      {formatDayMonthYear(rec.date)}
                    </td>
                    <td className="py-3.5 px-2 align-middle">
                      <div className="font-semibold text-slate-900 text-[12.5px] leading-snug">
                        {rec.service}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                        {rec.members} members + {rec.visitors} visitors
                      </div>
                    </td>
                    <td className="py-3.5 px-2 align-middle text-center font-bold text-slate-900 text-[15px] tabular-nums">
                      {rec.total}
                    </td>
                    <td className="py-3.5 px-2.5 align-middle text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenViewEdit(rec)}
                        className="border border-blue-400/80 text-[#0D62C6] hover:bg-blue-50 px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer"
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

        {/* Desktop Table (md:): 6 columns (DATE | SERVICE | MEMBERS | VISITORS | TOTAL | ACTION) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2C3542] text-white text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 rounded-l-md">Date</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4 text-center">Members</th>
                <th className="py-3 px-4 text-center">Visitors</th>
                <th className="py-3 px-4 text-center">Total</th>
                <th className="py-3 px-4 text-right rounded-r-md">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px] text-slate-800">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No attendance records match the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800 tabular-nums whitespace-nowrap">
                      {formatDayMonthYear(rec.date)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {rec.service}
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-slate-800 tabular-nums">
                      {rec.members}
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-slate-800 tabular-nums">
                      {rec.visitors}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-900 tabular-nums">
                      {rec.total}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenViewEdit(rec)}
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
          totalItems={filteredRecords.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Record / View / Edit Attendance Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="attendance-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-[#2C3542] text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 id="attendance-modal-title" className="text-sm sm:text-base font-bold">
                  {isEditingNew ? 'Record Service Attendance' : `Attendance Record — ${formData.id}`}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                  Total attendance is automatically calculated from members and visitors present.
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    list="service-options-list"
                    required
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    placeholder="Sunday Worship Service"
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                  <datalist id="service-options-list">
                    {serviceOptions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Service Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Number of Members Present *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={formData.membersStr}
                    onChange={(e) =>
                      setFormData({ ...formData, membersStr: e.target.value })
                    }
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 tabular-nums focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Number of Visitors Present *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={formData.visitorsStr}
                    onChange={(e) =>
                      setFormData({ ...formData, visitorsStr: e.target.value })
                    }
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 tabular-nums focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Attendance
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={computedTotal}
                    className="w-full bg-slate-100 border border-slate-200 rounded-md px-3 py-2 text-xs font-bold text-slate-900 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional service summary or ushers' notes..."
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
                  Save Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
