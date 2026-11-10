import {
  AttendanceRecord,
  DemoState,
  EventRecord,
  EventStatus,
  GivingRecord,
  GivingType,
  MemberRecord,
  MINISTRIES,
  PaymentMethod,
} from '../data/demoData';
import {
  formatCurrencyUSD,
  formatDayMonthYear,
  formatTimeRange,
  getEffectiveEventStatus,
  getMondayToSundayWeekRange,
  isJoinedInReferenceMonth,
  isSameMonthAndYear,
} from './dateUtils';

export type ProposedActionType =
  | 'add_member'
  | 'edit_member'
  | 'record_attendance'
  | 'edit_attendance'
  | 'record_giving'
  | 'edit_giving'
  | 'create_event'
  | 'edit_event';

export interface ProposedChangePayload {
  actionType: ProposedActionType;
  summaryTitle: string;
  summaryLines: string[];
  isDuplicateWarning?: boolean;
  duplicateWarningText?: string;
  memberData?: MemberRecord;
  attendanceData?: AttendanceRecord;
  givingData?: GivingRecord;
  eventData?: EventRecord;
}

export interface AssistantChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  source?: string;
  suggestions?: string[];
  proposedChange?: ProposedChangePayload;
  proposalStatus?: 'pending' | 'confirmed' | 'cancelled';
  isConfigWarning?: boolean;
}

/**
 * Approved application function: Builds a compact, relevant data context slice
 * from the browser's current saved DemoState based on the user's question and recent chat context.
 * Only sends relevant summaries and matching records rather than dumping all 250 raw member objects.
 */
export function buildRelevantContextSlice(
  userMessage: string,
  recentHistory: { role: 'user' | 'assistant'; text: string }[],
  state: DemoState
) {
  const combinedQuery = [
    ...recentHistory.slice(-4).map((m) => m.text),
    userMessage,
  ]
    .join(' ')
    .toLowerCase();

  const refDate = state.referenceDate;
  const refDateFormatted = formatDayMonthYear(refDate);

  // 1. Member Calculations (using application's own logic)
  const totalMembers = state.members.length;
  const activeMembers = state.members.filter((m) => m.status === 'Active').length;
  const inactiveMembers = state.members.filter((m) => m.status === 'Inactive').length;
  const newMembersThisMonth = state.members.filter((m) =>
    isJoinedInReferenceMonth(m.dateJoined, refDate)
  );

  const ministryCounts: Record<string, number> = {};
  state.members.forEach((m) => {
    ministryCounts[m.ministry] = (ministryCounts[m.ministry] || 0) + 1;
  });

  // Find specific members matching words in the query, plus the primary named sample members
  const queryWords = combinedQuery
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const matchedMembers = state.members
    .filter((m) => {
      const idNum = parseInt(m.id.replace('MEM-', ''), 10);
      if (idNum <= 9) return true; // Always include the key named members & Nov joiners
      return queryWords.some(
        (w) =>
          m.fullName.toLowerCase().includes(w) ||
          m.id.toLowerCase().includes(w) ||
          m.ministry.toLowerCase().includes(w)
      );
    })
    .slice(0, 15)
    .map((m) => ({
      id: m.id,
      fullName: m.fullName,
      ministry: m.ministry,
      dateJoined: m.dateJoined,
      dateJoinedFormatted: formatDayMonthYear(m.dateJoined),
      status: m.status,
      phone: m.phone,
      email: m.email,
    }));

  // 2. Attendance Calculations (using application's own logic)
  const sortedAttendance = [...state.attendance].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const upToRefAttendance = sortedAttendance.filter((a) => a.date <= refDate);
  const effectiveAttendanceList =
    upToRefAttendance.length > 0 ? upToRefAttendance : sortedAttendance;
  const lastSundayAttendance = effectiveAttendanceList[0] || null;
  const previousSundayAttendance = effectiveAttendanceList[1] || null;
  const todayAttendanceRecords = state.attendance.filter(
    (a) => a.date === refDate
  );

  const attendanceRecordsFormatted = sortedAttendance.map((a) => ({
    id: a.id,
    date: a.date,
    dateFormatted: formatDayMonthYear(a.date),
    service: a.service,
    members: a.members,
    visitors: a.visitors,
    total: a.total,
    notes: a.notes,
  }));

  // 3. Giving Calculations (using application's own logic)
  const sortedGiving = [...state.giving].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const upToRefGiving = sortedGiving.filter((g) => g.date <= refDate);
  const activeGivingSet = upToRefGiving.length > 0 ? upToRefGiving : sortedGiving;

  const totalGivingAll = activeGivingSet.reduce((s, g) => s + g.amount, 0);
  const monthlyGivingList = state.giving.filter(
    (g) => isSameMonthAndYear(g.date, refDate) && g.date <= refDate
  );
  const monthlyGivingTotal = (
    monthlyGivingList.length > 0 ? monthlyGivingList : state.giving
  ).reduce((s, g) => s + g.amount, 0);

  const givingByCategory: Record<string, number> = {
    Tithe: 0,
    Offering: 0,
    'Building Fund': 0,
    Other: 0,
  };
  activeGivingSet.forEach((g) => {
    givingByCategory[g.type] = (givingByCategory[g.type] || 0) + g.amount;
  });

  // Group giving by date for quick date-specific totals (e.g., 8 Nov 2026 = $600 from 2 contributions)
  const givingByDate: Record<
    string,
    { dateFormatted: string; totalAmount: number; count: number; items: string[] }
  > = {};
  sortedGiving.forEach((g) => {
    if (!givingByDate[g.date]) {
      givingByDate[g.date] = {
        dateFormatted: formatDayMonthYear(g.date),
        totalAmount: 0,
        count: 0,
        items: [],
      };
    }
    givingByDate[g.date].totalAmount += g.amount;
    givingByDate[g.date].count += 1;
    givingByDate[g.date].items.push(
      `${g.contributor}: ${formatCurrencyUSD(g.amount)} (${g.type}, ${g.paymentMethod})`
    );
  });

  const todayGivingRecords = state.giving.filter((g) => g.date === refDate);
  const todayGivingTotal = todayGivingRecords.reduce((s, g) => s + g.amount, 0);

  // 4. Events Calculations (using application's own logic)
  const weekRange = getMondayToSundayWeekRange(refDate);
  const enrichedEvents = state.events
    .map((ev) => ({
      ...ev,
      dateFormatted: formatDayMonthYear(ev.date),
      timeRangeFormatted: formatTimeRange(ev.startTime, ev.endTime),
      effectiveStatus: getEffectiveEventStatus(ev, refDate),
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const upcomingEvents = enrichedEvents.filter(
    (e) => e.effectiveStatus === 'Upcoming'
  );
  const completedEvents = enrichedEvents.filter(
    (e) => e.effectiveStatus === 'Completed'
  );
  const eventsToday = enrichedEvents.filter(
    (e) => e.effectiveStatus !== 'Cancelled' && e.date === refDate
  );
  const eventsThisWeek = enrichedEvents.filter(
    (e) =>
      e.effectiveStatus !== 'Cancelled' &&
      e.date >= weekRange.start &&
      e.date <= weekRange.end
  );

  return {
    churchName: 'Église Cité de Restauration — Kolwezi (ECR)',
    referenceDemoDate: {
      iso: refDate,
      formatted: refDateFormatted,
      note: 'Treat this referenceDemoDate as "today" whenever the user asks about "today", "this week", or "this month". Always mention this date when answering questions about "today".',
    },
    membersSummary: {
      totalMembers,
      activeMembers,
      inactiveMembers,
      newThisMonthCount: newMembersThisMonth.length,
      newThisMonthMembers: newMembersThisMonth.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        dateJoined: formatDayMonthYear(m.dateJoined),
        ministry: m.ministry,
      })),
      ministryBreakdown: ministryCounts,
      availableMinistries: MINISTRIES,
      relevantMemberRecords: matchedMembers,
    },
    attendanceSummary: {
      note: 'Attendance records store aggregate counts (members present, visitors present, total) per service, NOT the names of individual attendees.',
      todayDateFormatted: refDateFormatted,
      todayRecordsCount: todayAttendanceRecords.length,
      todayRecords: todayAttendanceRecords.map((a) => ({
        id: a.id,
        dateFormatted: formatDayMonthYear(a.date),
        service: a.service,
        members: a.members,
        visitors: a.visitors,
        total: a.total,
      })),
      lastSundayRecord: lastSundayAttendance
        ? {
            id: lastSundayAttendance.id,
            date: lastSundayAttendance.date,
            dateFormatted: formatDayMonthYear(lastSundayAttendance.date),
            service: lastSundayAttendance.service,
            members: lastSundayAttendance.members,
            visitors: lastSundayAttendance.visitors,
            total: lastSundayAttendance.total,
          }
        : null,
      previousSundayRecord: previousSundayAttendance
        ? {
            id: previousSundayAttendance.id,
            date: previousSundayAttendance.date,
            dateFormatted: formatDayMonthYear(previousSundayAttendance.date),
            service: previousSundayAttendance.service,
            members: previousSundayAttendance.members,
            visitors: previousSundayAttendance.visitors,
            total: previousSundayAttendance.total,
          }
        : null,
      allAttendanceRecords: attendanceRecordsFormatted,
    },
    givingSummary: {
      todayDateFormatted: refDateFormatted,
      todayGivingTotalUSD: todayGivingTotal,
      todayGivingRecordsCount: todayGivingRecords.length,
      todayGivingRecords: todayGivingRecords.map((g) => ({
        id: g.id,
        contributor: g.contributor,
        type: g.type,
        amountUSD: g.amount,
        paymentMethod: g.paymentMethod,
      })),
      totalGivingUSD: totalGivingAll,
      monthlyGivingTotalUSD: monthlyGivingTotal,
      categoryTotalsUSD: givingByCategory,
      totalsByDate: givingByDate,
      allGivingRecords: sortedGiving.map((g) => ({
        id: g.id,
        date: g.date,
        dateFormatted: formatDayMonthYear(g.date),
        contributor: g.contributor,
        type: g.type,
        amountUSD: g.amount,
        paymentMethod: g.paymentMethod,
        notes: g.notes,
      })),
    },
    eventsSummary: {
      todayDateFormatted: refDateFormatted,
      weekRangeMondayToSunday: {
        start: formatDayMonthYear(weekRange.start),
        end: formatDayMonthYear(weekRange.end),
      },
      upcomingCount: upcomingEvents.length,
      completedCount: completedEvents.length,
      eventsTodayCount: eventsToday.length,
      eventsThisWeekCount: eventsThisWeek.length,
      nextUpcomingEvent: upcomingEvents[0] || null,
      allEvents: enrichedEvents,
    },
    systemHelpGuide: {
      addMember:
        'Go to the Members page and click "+ Add Member" (or ask ECR Assistant to prepare a new member record). Enter Full Name, Date Joined, Ministry, and Status, then click "Save Member".',
      editMember:
        'On the Members page, find the member using the search bar or filters, click "View" in their row, update their details or status (Active/Inactive), and click "Save Member".',
      recordAttendance:
        'Go to the Attendance page and click "+ Record Attendance". Enter Service Name, Service Date, Members Present, and Visitors Present (Total is calculated automatically), then click "Save Attendance".',
      recordGiving:
        'Go to the Giving page and click "+ Record Giving". Enter Contributor Name, Giving Type (Tithe, Offering, Building Fund, Other), Amount in USD, Date Received, and Payment Method, then click "Save Contribution".',
      createEvent:
        'Go to the Events page and click "+ Create Event". Enter Event Name, Date, Start Time, End Time (after Start Time), Location, and Status, then click "Save Event".',
      changeDemoDateOrReset:
        'Click the Settings gear icon in the top-right toolbar to change the Reference Demo Date or click "Reset Demo Data" (with confirmation) to restore initial records.',
      changePasswordOrSignOut:
        'Click the Administrator profile icon in the top-right toolbar to open the account menu, where you can select "Change Password" or "Sign Out".',
    },
  };
}

/**
 * Validates and constructs a ProposedChangePayload from structured AI output
 * using the application's own ID generators, duplicate checks, and validation rules.
 */
export function buildValidatedProposalFromAI(
  rawProposal: {
    actionType: string;
    member?: {
      id?: string;
      fullName?: string;
      phone?: string;
      email?: string;
      dateOfBirth?: string;
      dateJoined?: string;
      ministry?: string;
      address?: string;
      status?: string;
      notes?: string;
    };
    attendance?: {
      id?: string;
      date?: string;
      service?: string;
      members?: number;
      visitors?: number;
      notes?: string;
    };
    giving?: {
      id?: string;
      date?: string;
      contributor?: string;
      type?: string;
      amount?: number;
      paymentMethod?: string;
      notes?: string;
    };
    event?: {
      id?: string;
      name?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      location?: string;
      description?: string;
      status?: string;
    };
  },
  state: DemoState
): { proposal?: ProposedChangePayload; validationError?: string } {
  const { actionType } = rawProposal;

  // 1. Add or Edit Member
  if (actionType === 'add_member' || actionType === 'edit_member') {
    const m = rawProposal.member;
    if (!m || !m.fullName?.trim()) {
      return { validationError: 'Member Full Name is required.' };
    }
    const existing =
      actionType === 'edit_member'
        ? state.members.find(
            (item) =>
              (m.id && item.id.toLowerCase() === m.id.toLowerCase()) ||
              item.fullName.toLowerCase() === m.fullName!.trim().toLowerCase()
          )
        : undefined;

    const maxNum = state.members.reduce((max, item) => {
      const match = item.id.match(/MEM-(\d+)/);
      return Math.max(max, match ? parseInt(match[1], 10) : 0);
    }, 0);

    const id = existing ? existing.id : `MEM-${String(maxNum + 1).padStart(3, '0')}`;
    const fullName = m.fullName.trim();
    const ministry = m.ministry?.trim() || existing?.ministry || "Women's Ministry";
    const dateJoined = m.dateJoined || existing?.dateJoined || state.referenceDate;
    const status: 'Active' | 'Inactive' =
      m.status === 'Inactive' ? 'Inactive' : 'Active';
    const phone = m.phone?.trim() || existing?.phone || '+243 810 000 000';
    const email =
      m.email?.trim() ||
      existing?.email ||
      `${fullName.toLowerCase().replace(/\s+/g, '.')}@demo.ecr-kolwezi.org`;
    const dateOfBirth = m.dateOfBirth || existing?.dateOfBirth || '1994-06-15';
    const address =
      m.address?.trim() || existing?.address || 'Kolwezi (Fictional Demo)';
    const notes = m.notes?.trim() ?? existing?.notes ?? 'Recorded via ECR Assistant.';

    const memberRecord: MemberRecord = {
      id,
      fullName,
      phone,
      email,
      dateOfBirth,
      dateJoined,
      ministry,
      address,
      status,
      notes,
    };

    return {
      proposal: {
        actionType: existing ? 'edit_member' : 'add_member',
        summaryTitle: existing
          ? `Proposed Update: Member ${id}`
          : `Proposed New Member: ${id}`,
        summaryLines: [
          `Full Name: ${fullName}`,
          `Ministry: ${ministry}`,
          `Date Joined: ${formatDayMonthYear(dateJoined)}`,
          `Status: ${status}`,
          `Phone: ${phone}`,
        ],
        memberData: memberRecord,
      },
    };
  }

  // 2. Record or Edit Attendance (with duplicate detection!)
  if (actionType === 'record_attendance' || actionType === 'edit_attendance') {
    const a = rawProposal.attendance as Record<string, any> | undefined;
    if (!a) {
      return { validationError: 'Attendance details are required.' };
    }
    const date = a.date || state.referenceDate;
    const service = (a.service || a.serviceName || 'Sunday Worship Service').trim();
    const membersCount = Number(a.members ?? a.membersPresent);
    const visitorsCount = Number(a.visitors ?? a.visitorsPresent);

    if (
      Number.isNaN(membersCount) ||
      membersCount < 0 ||
      !Number.isInteger(membersCount)
    ) {
      return {
        validationError:
          'Number of members present must be a non-negative whole number.',
      };
    }
    if (
      Number.isNaN(visitorsCount) ||
      visitorsCount < 0 ||
      !Number.isInteger(visitorsCount)
    ) {
      return {
        validationError:
          'Number of visitors present must be a non-negative whole number.',
      };
    }

    const total = membersCount + visitorsCount;

    // Check for duplicate attendance record on the same date & service
    const duplicate = state.attendance.find(
      (item) =>
        item.date === date &&
        item.service.toLowerCase() === service.toLowerCase()
    );

    const maxNum = state.attendance.reduce((max, item) => {
      const match = item.id.match(/ATT-(\d+)/);
      return Math.max(max, match ? parseInt(match[1], 10) : 0);
    }, 0);

    const isUpdate = Boolean(duplicate);
    const id = duplicate
      ? duplicate.id
      : `ATT-${String(maxNum + 1).padStart(3, '0')}`;

    const attendanceRecord: AttendanceRecord = {
      id,
      date,
      service,
      members: membersCount,
      visitors: visitorsCount,
      total,
      notes:
        a.notes?.trim() ||
        duplicate?.notes ||
        'Recorded via ECR Assistant.',
    };

    return {
      proposal: {
        actionType: isUpdate ? 'edit_attendance' : 'record_attendance',
        summaryTitle: isUpdate
          ? `Update Existing Attendance (${id})`
          : `Proposed New Attendance (${id})`,
        isDuplicateWarning: isUpdate && actionType === 'record_attendance',
        duplicateWarningText: isUpdate
          ? `An attendance record already exists for ${service} on ${formatDayMonthYear(
              date
            )} (${duplicate!.total} total: ${duplicate!.members} members + ${
              duplicate!.visitors
            } visitors). Confirming will update that existing record.`
          : undefined,
        summaryLines: [
          `Service: ${service}`,
          `Date: ${formatDayMonthYear(date)}`,
          `Members Present: ${membersCount}`,
          `Visitors Present: ${visitorsCount}`,
          `Total Attendance: ${total}`,
        ],
        attendanceData: attendanceRecord,
      },
    };
  }

  // 3. Record or Edit Giving
  if (actionType === 'record_giving' || actionType === 'edit_giving') {
    const g = rawProposal.giving as Record<string, any> | undefined;
    const contributorName = (g?.contributor || g?.contributorName || '').trim();
    if (!g || !contributorName) {
      return { validationError: 'Contributor Name is required.' };
    }
    const amount = Number(g.amount ?? g.amountUSD);
    if (Number.isNaN(amount) || amount <= 0) {
      return { validationError: 'Contribution amount must be greater than $0.' };
    }

    const validTypes: GivingType[] = [
      'Tithe',
      'Offering',
      'Building Fund',
      'Other',
    ];
    const type: GivingType = validTypes.includes(g.type as GivingType)
      ? (g.type as GivingType)
      : 'Offering';

    const validMethods: PaymentMethod[] = [
      'Cash',
      'Bank Transfer',
      'Mobile Money',
      'Other',
    ];
    const paymentMethod: PaymentMethod = validMethods.includes(
      g.paymentMethod as PaymentMethod
    )
      ? (g.paymentMethod as PaymentMethod)
      : 'Cash';

    const date = g.date || state.referenceDate;
    const existing =
      actionType === 'edit_giving' && g.id
        ? state.giving.find((item) => item.id.toLowerCase() === String(g.id).toLowerCase())
        : undefined;

    const maxNum = state.giving.reduce((max, item) => {
      const match = item.id.match(/GIV-(\d+)/);
      return Math.max(max, match ? parseInt(match[1], 10) : 0);
    }, 0);

    const id = existing ? existing.id : `GIV-${String(maxNum + 1).padStart(3, '0')}`;

    const givingRecord: GivingRecord = {
      id,
      date,
      contributor: contributorName,
      type,
      amount: Math.round(amount * 100) / 100,
      paymentMethod,
      notes:
        g.notes?.trim() ||
        existing?.notes ||
        'Recorded via ECR Assistant (Fictional demo record).',
    };

    return {
      proposal: {
        actionType: existing ? 'edit_giving' : 'record_giving',
        summaryTitle: existing
          ? `Proposed Update: Contribution ${id}`
          : `Proposed Contribution: ${id}`,
        summaryLines: [
          `Contributor: ${givingRecord.contributor}`,
          `Giving Type: ${givingRecord.type}`,
          `Amount: ${formatCurrencyUSD(givingRecord.amount)}`,
          `Date Received: ${formatDayMonthYear(givingRecord.date)}`,
          `Payment Method: ${givingRecord.paymentMethod}`,
        ],
        givingData: givingRecord,
      },
    };
  }

  // 4. Create or Edit Event
  if (actionType === 'create_event' || actionType === 'edit_event') {
    const ev = rawProposal.event as Record<string, any> | undefined;
    const eventName = (ev?.name || ev?.eventName || '').trim();
    if (!ev || !eventName) {
      return { validationError: 'Event Name is required.' };
    }
    const date = ev.date || state.referenceDate;
    const startTime = ev.startTime || '09:00';
    const endTime = ev.endTime || '11:00';
    if (endTime <= startTime) {
      return { validationError: 'Event End Time must be after Start Time.' };
    }
    const location = ev.location?.trim() || 'Main Church Hall';
    const existing =
      actionType === 'edit_event'
        ? state.events.find(
            (item) =>
              (ev.id && item.id.toLowerCase() === String(ev.id).toLowerCase()) ||
              item.name.toLowerCase() === eventName.toLowerCase()
          )
        : undefined;

    const maxNum = state.events.reduce((max, item) => {
      const match = item.id.match(/EVT-(\d+)/);
      return Math.max(max, match ? parseInt(match[1], 10) : 0);
    }, 0);

    const id = existing ? existing.id : `EVT-${String(maxNum + 1).padStart(3, '0')}`;
    const validStatuses: EventStatus[] = ['Upcoming', 'Completed', 'Cancelled'];
    const status: EventStatus = validStatuses.includes(ev.status as EventStatus)
      ? (ev.status as EventStatus)
      : date < state.referenceDate
      ? 'Completed'
      : 'Upcoming';

    const eventRecord: EventRecord = {
      id,
      name: eventName,
      date,
      startTime,
      endTime,
      location,
      description:
        ev.description?.trim() ||
        existing?.description ||
        'Scheduled via ECR Assistant.',
      status,
    };

    return {
      proposal: {
        actionType: existing ? 'edit_event' : 'create_event',
        summaryTitle: existing
          ? `Proposed Update: Event ${id}`
          : `Proposed New Event: ${id}`,
        summaryLines: [
          `Event: ${eventRecord.name}`,
          `Date: ${formatDayMonthYear(eventRecord.date)}`,
          `Time: ${formatTimeRange(eventRecord.startTime, eventRecord.endTime)}`,
          `Location: ${eventRecord.location}`,
          `Status: ${eventRecord.status}`,
        ],
        eventData: eventRecord,
      },
    };
  }

  return { validationError: 'Unrecognized change action.' };
}
