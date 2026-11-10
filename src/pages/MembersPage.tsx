import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, ChevronDown, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { MemberRecord, MINISTRIES } from '../data/demoData';
import { formatDayMonthYear, isJoinedInReferenceMonth } from '../utils/dateUtils';
import { SummaryCardsRow } from '../components/SummaryCardsRow';
import { PaginationFooter } from '../components/PaginationFooter';

interface MembersPageProps {
  referenceDate: string;
  members: MemberRecord[];
  onSaveMember: (member: MemberRecord, isNew: boolean) => void;
  openAddModalTrigger?: number;
}

export const MembersPage: React.FC<MembersPageProps> = ({
  referenceDate,
  members,
  onSaveMember,
  openAddModalTrigger,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');
  const [ministryFilter, setMinistryFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingNew, setIsEditingNew] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const [formData, setFormData] = useState<MemberRecord>({
    id: '',
    fullName: '',
    phone: '',
    email: '',
    dateOfBirth: '1994-06-15',
    dateJoined: referenceDate,
    ministry: "Women's Ministry",
    address: '',
    status: 'Active',
    notes: '',
  });

  const generateNextMemberId = () => {
    const maxNum = members.reduce((max, m) => {
      const match = m.id.match(/MEM-(\d+)/);
      const n = match ? parseInt(match[1], 10) : 0;
      return Math.max(max, n);
    }, 0);
    return `MEM-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleOpenAdd = () => {
    setFormError(null);
    setIsEditingNew(true);
    setFormData({
      id: generateNextMemberId(),
      fullName: '',
      phone: '',
      email: '',
      dateOfBirth: '1994-06-15',
      dateJoined: referenceDate,
      ministry: "Women's Ministry",
      address: '',
      status: 'Active',
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

  const handleOpenViewEdit = (member: MemberRecord) => {
    setFormError(null);
    setIsEditingNew(false);
    setFormData({ ...member });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setFormError('Please enter the member’s Full Name.');
      return;
    }
    if (!formData.dateJoined) {
      setFormError('Please select the Date Joined.');
      return;
    }
    if (!formData.ministry.trim()) {
      setFormError('Please select a Ministry or Group.');
      return;
    }

    const cleaned: MemberRecord = {
      ...formData,
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim() || '+243 810 000 000',
      email:
        formData.email.trim() ||
        `${formData.fullName.trim().toLowerCase().replace(/\s+/g, '.')}@demo.ecr-kolwezi.org`,
      address: formData.address.trim() || 'Kolwezi (Fictional Demo)',
      notes: formData.notes.trim(),
    };

    onSaveMember(cleaned, isEditingNew);
    setIsModalOpen(false);
    if (isEditingNew) {
      setCurrentPage(1);
    }
    setFeedbackBanner(
      isEditingNew
        ? `Member ${cleaned.fullName} (${cleaned.id}) added to demo records.`
        : `Member ${cleaned.fullName} (${cleaned.id}) updated.`
    );
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  // Summary card counts calculated from member records
  const summaryStats = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.status === 'Active').length;
    const inactive = members.filter((m) => m.status === 'Inactive').length;
    const newThisMonth = members.filter((m) =>
      isJoinedInReferenceMonth(m.dateJoined, referenceDate)
    ).length;
    return { total, active, inactive, newThisMonth };
  }, [members, referenceDate]);

  // Available ministries from records + preset list
  const ministryOptions = useMemo(() => {
    const set = new Set<string>(MINISTRIES);
    members.forEach((m) => {
      if (m.ministry) set.add(m.ministry);
    });
    return Array.from(set);
  }, [members]);

  // Filtered member records
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
      if (ministryFilter !== 'ALL' && m.ministry !== ministryFilter) return false;
      if (q) {
        const matchName = m.fullName.toLowerCase().includes(q);
        const matchId = m.id.toLowerCase().includes(q);
        if (!matchName && !matchId) return false;
      }
      return true;
    });
  }, [members, searchQuery, statusFilter, ministryFilter]);

  const PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMembers = filteredMembers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  // Unified mobile filter value (supports both Status and Ministry in the single mobile dropdown)
  const mobileFilterValue =
    statusFilter !== 'ALL'
      ? `STATUS:${statusFilter}`
      : ministryFilter !== 'ALL'
      ? `MINISTRY:${ministryFilter}`
      : 'ALL';

  const handleMobileFilterChange = (val: string) => {
    setCurrentPage(1);
    if (val === 'ALL') {
      setStatusFilter('ALL');
      setMinistryFilter('ALL');
    } else if (val.startsWith('STATUS:')) {
      const st = val.replace('STATUS:', '') as 'Active' | 'Inactive';
      setStatusFilter(st);
      setMinistryFilter('ALL');
    } else if (val.startsWith('MINISTRY:')) {
      const min = val.replace('MINISTRY:', '');
      setMinistryFilter(min);
      setStatusFilter('ALL');
    }
  };

  return (
    <div className="space-y-4">
      {/* Mobile Page Header (< lg): Unboxed heading + subtitle + button below */}
      <div className="lg:hidden px-0.5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Members</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your church members and their information.
        </p>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="mt-3 inline-flex items-center gap-2 bg-[#D93025] hover:bg-[#B71C1C] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Desktop Page Header Card (lg:) */}
      <div className="hidden lg:flex bg-white border border-slate-200/80 rounded-xl px-6 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Members</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your church members and their information.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 bg-[#D93025] hover:bg-[#B71C1C] text-white text-xs font-semibold px-4 py-2.5 rounded-md shadow-xs transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Member</span>
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
            label: 'Total Members',
            value: summaryStats.total,
            onClick: () => {
              setStatusFilter('ALL');
              setMinistryFilter('ALL');
              setCurrentPage(1);
            },
          },
          {
            label: 'Active Members',
            value: summaryStats.active,
            onClick: () => {
              setStatusFilter('Active');
              setCurrentPage(1);
            },
          },
          {
            label: 'Inactive Members',
            value: summaryStats.inactive,
            onClick: () => {
              setStatusFilter('Inactive');
              setCurrentPage(1);
            },
          },
          {
            label: 'New This Month',
            value: summaryStats.newThisMonth,
          },
        ]}
      />

      {/* Members List Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {/* Toolbar: Title + Search + Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 sm:mb-5">
          <h2 className="text-lg md:text-base font-bold text-slate-900 tracking-tight">
            Members List
          </h2>

          {/* Mobile Search & Filter Controls (< md) matching phone design */}
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
                placeholder="Search by name or member ID"
                aria-label="Search by name or member ID"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="relative w-full">
              <select
                value={mobileFilterValue}
                onChange={(e) => handleMobileFilterChange(e.target.value)}
                aria-label="Filter members by status or ministry"
                className="w-full appearance-none bg-[#F8FAFC] border border-slate-200 rounded-lg pl-3.5 pr-9 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Members</option>
                <optgroup label="Membership Status">
                  <option value="STATUS:Active">Active Members</option>
                  <option value="STATUS:Inactive">Inactive Members</option>
                </optgroup>
                <optgroup label="Ministry / Group">
                  {ministryOptions.map((min) => (
                    <option key={min} value={`MINISTRY:${min}`}>
                      Ministry: {min}
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Desktop Search & Filter Controls (md:) */}
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
                placeholder="Search by name or member ID"
                aria-label="Search by name or member ID"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-md pl-8 pr-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as 'ALL' | 'Active' | 'Inactive');
                  setCurrentPage(1);
                }}
                aria-label="Filter by member status"
                className="appearance-none bg-[#F8FAFC] border border-slate-200 rounded-md pl-3 pr-8 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Members</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={ministryFilter}
                onChange={(e) => {
                  setMinistryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by ministry"
                className="appearance-none bg-[#F8FAFC] border border-slate-200 rounded-md pl-3 pr-8 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">Ministry</option>
                {ministryOptions.map((min) => (
                  <option key={min} value={min}>
                    {min}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Mobile Table (< md): 4 columns (MEMBER | MINISTRY | STATUS | ACTION) with stacked Name + ID */}
        <div className="md:hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2C3542] text-white text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-2.5 rounded-l-md">Member</th>
                <th className="py-2.5 px-2">Ministry</th>
                <th className="py-2.5 px-2 text-center">Status</th>
                <th className="py-2.5 px-2.5 text-right rounded-r-md">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                    No members match the selected search or filters.
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-2.5 align-middle">
                      <div className="font-bold text-slate-900 text-[13px] leading-snug">
                        {member.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                        {member.id}
                      </div>
                    </td>
                    <td className="py-3 px-2 align-middle text-[12.5px] font-medium text-slate-800 leading-snug">
                      {member.ministry}
                    </td>
                    <td className="py-3 px-2 align-middle text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium ${
                          member.status === 'Active'
                            ? 'bg-[#E2F5EA] text-[#188038]'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="py-3 px-2.5 align-middle text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenViewEdit(member)}
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

        {/* Desktop Table (md:): 6 columns (MEMBER ID | FULL NAME | MINISTRY | DATE JOINED | STATUS | ACTION) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2C3542] text-white text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 rounded-l-md">Member ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Ministry</th>
                <th className="py-3 px-4">Date Joined</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right rounded-r-md">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px] text-slate-800">
              {paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No members match the selected search or filters.
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-slate-800 tabular-nums whitespace-nowrap">
                      {member.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {member.fullName}
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {member.ministry}
                    </td>
                    <td className="py-3 px-4 text-slate-700 tabular-nums whitespace-nowrap">
                      {formatDayMonthYear(member.dateJoined)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-0.5 rounded-md text-xs font-medium ${
                          member.status === 'Active'
                            ? 'bg-[#E2F5EA] text-[#188038]'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenViewEdit(member)}
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
          totalItems={filteredMembers.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Add / View / Edit Member Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#2C3542] text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 id="member-modal-title" className="text-sm sm:text-base font-bold">
                  {isEditingNew ? 'Add New Member' : `Member Profile — ${formData.id}`}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                  {isEditingNew
                    ? 'Register a new fictional member in the church directory.'
                    : 'View or update member details and membership status.'}
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
                    Member ID
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-md px-3 py-2 text-xs font-semibold text-slate-600 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Membership Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as 'Active' | 'Inactive',
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g., Esther Mutombo"
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+243 810 000 000"
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="member@demo.ecr-kolwezi.org"
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date Joined *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dateJoined}
                    onChange={(e) =>
                      setFormData({ ...formData, dateJoined: e.target.value })
                    }
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ministry or Group *
                  </label>
                  <select
                    value={formData.ministry}
                    onChange={(e) => setFormData({ ...formData, ministry: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    {ministryOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Quartier Biashara, Kolwezi"
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
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
                  placeholder="Optional pastoral or ministry notes (fictional demo record)..."
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
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
