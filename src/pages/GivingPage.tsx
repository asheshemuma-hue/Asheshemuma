import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, ChevronDown, Calendar, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { GivingRecord, GivingType, MemberRecord, PaymentMethod } from '../data/demoData';
import { formatCurrencyUSD, formatDayMonth, formatDayMonthYear } from '../utils/dateUtils';
import { SummaryCardsRow } from '../components/SummaryCardsRow';
import { PaginationFooter } from '../components/PaginationFooter';

interface GivingPageProps {
  referenceDate: string;
  giving: GivingRecord[];
  members: MemberRecord[];
  onSaveGiving: (record: GivingRecord, isNew: boolean) => void;
  openAddModalTrigger?: number;
}

const GIVING_TYPES: GivingType[] = ['Tithe', 'Offering', 'Building Fund', 'Other'];
const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Bank Transfer', 'Mobile Money', 'Other'];

export const GivingPage: React.FC<GivingPageProps> = ({
  referenceDate,
  giving,
  members,
  onSaveGiving,
  openAddModalTrigger,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | GivingType>('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingNew, setIsEditingNew] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    id: string;
    contributor: string;
    type: GivingType;
    amountStr: string;
    date: string;
    paymentMethod: PaymentMethod;
    notes: string;
  }>({
    id: '',
    contributor: '',
    type: 'Tithe',
    amountStr: '',
    date: referenceDate,
    paymentMethod: 'Cash',
    notes: '',
  });

  const generateNextGivingId = () => {
    const maxNum = giving.reduce((max, g) => {
      const match = g.id.match(/GIV-(\d+)/);
      const n = match ? parseInt(match[1], 10) : 0;
      return Math.max(max, n);
    }, 0);
    return `GIV-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleOpenAdd = () => {
    setFormError(null);
    setIsEditingNew(true);
    setFormData({
      id: generateNextGivingId(),
      contributor: '',
      type: 'Tithe',
      amountStr: '',
      date: referenceDate,
      paymentMethod: 'Cash',
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

  const handleOpenViewEdit = (record: GivingRecord) => {
    setFormError(null);
    setIsEditingNew(false);
    setFormData({
      id: record.id,
      contributor: record.contributor,
      type: record.type,
      amountStr: String(record.amount),
      date: record.date,
      paymentMethod: record.paymentMethod,
      notes: record.notes,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contributor.trim()) {
      setFormError('Please enter the Contributor Name.');
      return;
    }
    const amt = Number(formData.amountStr);
    if (formData.amountStr.trim() === '' || Number.isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid Amount greater than $0.');
      return;
    }
    if (!formData.date) {
      setFormError('Please select the Date Received.');
      return;
    }

    const saved: GivingRecord = {
      id: formData.id,
      contributor: formData.contributor.trim(),
      type: formData.type,
      amount: Math.round(amt * 100) / 100,
      date: formData.date,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes.trim(),
    };

    onSaveGiving(saved, isEditingNew);
    setIsModalOpen(false);
    if (isEditingNew) {
      setCurrentPage(1);
    }
    setFeedbackBanner(
      isEditingNew
        ? `Demo contribution of ${formatCurrencyUSD(saved.amount)} (${saved.type}) recorded for ${saved.contributor}.`
        : `Demo contribution record ${saved.id} updated.`
    );
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  // Sort giving records descending by date
  const sortedGivingDesc = useMemo(() => {
    return [...giving].sort((a, b) => b.date.localeCompare(a.date));
  }, [giving]);

  // Summary card totals calculated from contribution records
  const summaryStats = useMemo(() => {
    const upToRef = giving.filter((g) => g.date <= referenceDate);
    const activeSet = upToRef.length > 0 ? upToRef : giving;

    const total = activeSet.reduce((sum, g) => sum + g.amount, 0);
    const tithes = activeSet
      .filter((g) => g.type === 'Tithe')
      .reduce((sum, g) => sum + g.amount, 0);
    const offerings = activeSet
      .filter((g) => g.type === 'Offering')
      .reduce((sum, g) => sum + g.amount, 0);
    const buildingFund = activeSet
      .filter((g) => g.type === 'Building Fund')
      .reduce((sum, g) => sum + g.amount, 0);

    return { total, tithes, offerings, buildingFund };
  }, [giving, referenceDate]);

  const uniqueDates = useMemo(() => {
    const set = new Set<string>();
    sortedGivingDesc.forEach((g) => set.add(g.date));
    return Array.from(set);
  }, [sortedGivingDesc]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedGivingDesc.filter((rec) => {
      if (typeFilter !== 'ALL' && rec.type !== typeFilter) return false;
      if (dateFilter !== 'ALL' && rec.date !== dateFilter) return false;
      if (q) {
        const matchContributor = rec.contributor.toLowerCase().includes(q);
        const matchType = rec.type.toLowerCase().includes(q);
        const matchDate = formatDayMonthYear(rec.date).toLowerCase().includes(q);
        if (!matchContributor && !matchType && !matchDate) return false;
      }
      return true;
    });
  }, [sortedGivingDesc, searchQuery, typeFilter, dateFilter]);

  const PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRecords = filteredRecords.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  return (
    <div className="space-y-4">
      {/* Mobile Page Header (< lg): Unboxed heading + subtitle + full-width button below */}
      <div className="lg:hidden px-0.5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Giving</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Record and review church contributions.
        </p>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-[#D93025] hover:bg-[#B71C1C] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Record Giving</span>
        </button>
      </div>

      {/* Desktop Page Header Card (lg:) */}
      <div className="hidden lg:flex bg-white border border-slate-200/80 rounded-xl px-6 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Giving</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record and review church contributions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 bg-[#D93025] hover:bg-[#B71C1C] text-white text-xs font-semibold px-4 py-2.5 rounded-md shadow-xs transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Record Giving</span>
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
            label: 'Total Giving',
            value: formatCurrencyUSD(summaryStats.total),
            onClick: () => {
              setTypeFilter('ALL');
              setCurrentPage(1);
            },
          },
          {
            label: 'Tithes',
            value: formatCurrencyUSD(summaryStats.tithes),
            onClick: () => {
              setTypeFilter('Tithe');
              setCurrentPage(1);
            },
          },
          {
            label: 'Offerings',
            value: formatCurrencyUSD(summaryStats.offerings),
            onClick: () => {
              setTypeFilter('Offering');
              setCurrentPage(1);
            },
          },
          {
            label: 'Building Fund',
            value: formatCurrencyUSD(summaryStats.buildingFund),
            onClick: () => {
              setTypeFilter('Building Fund');
              setCurrentPage(1);
            },
          },
        ]}
      />

      {/* Giving Records Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-base font-bold text-slate-900 tracking-tight">
              Giving Records
            </h2>
            {typeFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setTypeFilter('ALL')}
                className="md:hidden text-xs font-semibold text-[#0D62C6] hover:underline cursor-pointer"
              >
                Show All ({typeFilter}) ×
              </button>
            )}
          </div>

          {/* Mobile Search Input (< md) matching image_fe8ecf38.png */}
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
                placeholder="Search by contributor"
                aria-label="Search by contributor"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Desktop Search & Filters (md:) */}
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
                placeholder="Search by contributor"
                aria-label="Search by contributor"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-md pl-8 pr-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as 'ALL' | GivingType);
                  setCurrentPage(1);
                }}
                aria-label="Filter by giving type"
                className="appearance-none bg-[#F8FAFC] border border-slate-200 rounded-md pl-3 pr-8 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Giving Types</option>
                {GIVING_TYPES.map((gt) => (
                  <option key={gt} value={gt}>
                    {gt}
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

        {/* Mobile Table (< md): matches image_fe8ecf38.png (DATE | CONTRIBUTOR | GIVING TYPE | AMOUNT) */}
        <div className="md:hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2C3542] text-white text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-2.5 rounded-l-md">Date</th>
                <th className="py-2.5 px-2">Contributor</th>
                <th className="py-2.5 px-2">Giving Type</th>
                <th className="py-2.5 px-2.5 text-right rounded-r-md">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px] text-slate-800">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                    No giving records match the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    onClick={() => handleOpenViewEdit(rec)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenViewEdit(rec);
                      }
                    }}
                    title="Tap to view or edit contribution"
                    className="hover:bg-slate-50 active:bg-blue-50/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-2.5 font-medium text-slate-900 tabular-nums whitespace-nowrap text-[13px]">
                      {formatDayMonth(rec.date)}
                    </td>
                    <td className="py-3.5 px-2 font-medium text-slate-900 text-[13px]">
                      {rec.contributor}
                    </td>
                    <td className="py-3.5 px-2 font-medium text-slate-800 text-[13px]">
                      {rec.type}
                    </td>
                    <td className="py-3.5 px-2.5 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap text-[13px]">
                      {formatCurrencyUSD(rec.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Desktop Table (md:): 5 columns (DATE | CONTRIBUTOR | GIVING TYPE | AMOUNT | ACTION) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2C3542] text-white text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 rounded-l-md">Date</th>
                <th className="py-3 px-4">Contributor</th>
                <th className="py-3 px-4">Giving Type</th>
                <th className="py-3 px-4 text-center">Amount</th>
                <th className="py-3 px-4 text-right rounded-r-md">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px] text-slate-800">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                    No giving records match the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800 tabular-nums whitespace-nowrap">
                      {formatDayMonthYear(rec.date)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {rec.contributor}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {rec.type}
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-slate-900 tabular-nums whitespace-nowrap">
                      {formatCurrencyUSD(rec.amount)}
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

        <div className="hidden md:block">
          <PaginationFooter
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredRecords.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
        {filteredRecords.length > PAGE_SIZE && (
          <div className="md:hidden">
            <PaginationFooter
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filteredRecords.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Record / View / Edit Giving Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="giving-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-[#2C3542] text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 id="giving-modal-title" className="text-sm sm:text-base font-bold">
                  {isEditingNew ? 'Record Church Contribution' : `Contribution Record — ${formData.id}`}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                  Practice demo record only — no real payment is processed.
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
                  Contributor Name *
                </label>
                <input
                  type="text"
                  list="member-contributors-list"
                  required
                  value={formData.contributor}
                  onChange={(e) =>
                    setFormData({ ...formData, contributor: e.target.value })
                  }
                  placeholder="e.g., Marie Kabeya"
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                />
                <datalist id="member-contributors-list">
                  {members.slice(0, 25).map((m) => (
                    <option key={m.id} value={m.fullName} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giving Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as GivingType })
                    }
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    {GIVING_TYPES.map((gt) => (
                      <option key={gt} value={gt}>
                        {gt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      value={formData.amountStr}
                      onChange={(e) =>
                        setFormData({ ...formData, amountStr: e.target.value })
                      }
                      placeholder="100"
                      className="w-full bg-white border border-slate-300 rounded-md pl-7 pr-3 py-2 text-xs text-slate-800 tabular-nums focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date Received *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentMethod: e.target.value as PaymentMethod,
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
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
                  placeholder="Optional reference note (Fictional demo record)..."
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
                  Save Contribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
