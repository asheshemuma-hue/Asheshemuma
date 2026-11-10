/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Home,
  Users,
  CalendarCheck,
  Coins,
  Calendar,
  Menu,
  Bell,
  Mail,
  User,
  Settings,
  RotateCcw,
  PlusCircle,
  Check,
  X,
  LogOut,
  KeyRound,
  MessageSquareText,
} from 'lucide-react';
import {
  ActivityItem,
  AttendanceRecord,
  createInitialDemoState,
  DemoState,
  EventRecord,
  GivingRecord,
  INITIAL_REFERENCE_DATE,
  MemberRecord,
  PageId,
} from './data/demoData';
import { formatCurrencyUSD, formatDayMonthYear } from './utils/dateUtils';
import {
  clearActiveSession,
  DemoSession,
  getOrInitializeDemoAccount,
  loadActiveSession,
  saveActiveSession,
} from './utils/authUtils';
import { SignInPage } from './pages/SignInPage';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { ECRAssistantPanel } from './components/ECRAssistantPanel';
import { DashboardPage } from './pages/DashboardPage';
import { MembersPage } from './pages/MembersPage';
import { AttendancePage } from './pages/AttendancePage';
import { GivingPage } from './pages/GivingPage';
import { EventsPage } from './pages/EventsPage';

const STORAGE_KEY = 'ecr_kolwezi_cms_practice_v1';

function loadInitialState(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (
        parsed &&
        Array.isArray(parsed.members) &&
        Array.isArray(parsed.attendance) &&
        Array.isArray(parsed.giving) &&
        Array.isArray(parsed.events)
      ) {
        return parsed;
      }
    }
  } catch {
    // Fallback to initial demo state
  }
  return createInitialDemoState();
}

export default function App() {
  // Ensure the initial demo administrator account exists in localStorage (without overwriting if already present)
  useEffect(() => {
    getOrInitializeDemoAccount();
  }, []);

  const [session, setSession] = useState<DemoSession | null>(() => loadActiveSession());
  const [state, setState] = useState<DemoState>(loadInitialState);
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  // Topbar dropdown states
  const [openDropdown, setOpenDropdown] = useState<
    'notifications' | 'quickActions' | 'profile' | 'settings' | null
  >(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick action triggers to open modals on target pages
  const [modalTriggers, setModalTriggers] = useState({
    member: 0,
    attendance: 0,
    giving: 0,
    event: 0,
  });

  const toolbarRef = useRef<HTMLDivElement>(null);

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state]);

  // Close topbar dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setConfirmReset(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const handleSignInSuccess = (username: string) => {
    const newSession = saveActiveSession(username);
    setSession(newSession);
    setActivePage('dashboard');
    setOpenDropdown(null);
    setMobileSidebarOpen(false);
  };

  const handleSignOut = () => {
    clearActiveSession();
    setSession(null);
    setOpenDropdown(null);
    setMobileSidebarOpen(false);
  };

  // Handlers for updating records + recording activity
  const handleSaveMember = (member: MemberRecord, isNew: boolean) => {
    setState((prev) => {
      const nextMembers = isNew
        ? [member, ...prev.members]
        : prev.members.map((m) => (m.id === member.id ? member : m));

      const newActivity: ActivityItem = {
        id: `ACT-${Date.now()}`,
        type: 'member',
        title: isNew ? 'New member added —' : 'Member updated —',
        detail: member.fullName,
        timeAgo: 'Just now',
        read: false,
      };

      return {
        ...prev,
        members: nextMembers,
        activities: [newActivity, ...prev.activities],
      };
    });
  };

  const handleSaveAttendance = (record: AttendanceRecord, isNew: boolean) => {
    setState((prev) => {
      const nextAttendance = isNew
        ? [record, ...prev.attendance]
        : prev.attendance.map((a) => (a.id === record.id ? record : a));

      const newActivity: ActivityItem = {
        id: `ACT-${Date.now()}`,
        type: 'attendance',
        title: isNew ? 'Attendance recorded —' : 'Attendance updated —',
        detail: `${record.total} people`,
        timeAgo: 'Just now',
        read: false,
      };

      return {
        ...prev,
        attendance: nextAttendance,
        activities: [newActivity, ...prev.activities],
      };
    });
  };

  const handleSaveGiving = (record: GivingRecord, isNew: boolean) => {
    setState((prev) => {
      const nextGiving = isNew
        ? [record, ...prev.giving]
        : prev.giving.map((g) => (g.id === record.id ? record : g));

      const newActivity: ActivityItem = {
        id: `ACT-${Date.now()}`,
        type: 'giving',
        title: isNew ? 'Giving recorded —' : 'Giving updated —',
        detail: formatCurrencyUSD(record.amount),
        timeAgo: 'Just now',
        read: false,
      };

      return {
        ...prev,
        giving: nextGiving,
        activities: [newActivity, ...prev.activities],
      };
    });
  };

  const handleSaveEvent = (event: EventRecord, isNew: boolean) => {
    setState((prev) => {
      const nextEvents = isNew
        ? [event, ...prev.events]
        : prev.events.map((ev) => (ev.id === event.id ? event : ev));

      const newActivity: ActivityItem = {
        id: `ACT-${Date.now()}`,
        type: 'event',
        title: isNew ? 'Event created —' : 'Event updated —',
        detail: `${event.name} (${formatDayMonthYear(event.date)})`,
        timeAgo: 'Just now',
        read: false,
      };

      return {
        ...prev,
        events: nextEvents,
        activities: [newActivity, ...prev.activities],
      };
    });
  };

  const handleReferenceDateChange = (newDate: string) => {
    if (!newDate) return;
    setState((prev) => ({
      ...prev,
      referenceDate: newDate,
    }));
    showToast(`Demo reference date set to ${formatDayMonthYear(newDate)}.`);
  };

  const handleResetDemoData = () => {
    const fresh = createInitialDemoState();
    setState(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    setConfirmReset(false);
    setOpenDropdown(null);
    showToast('Demo data reset to initial 10 November 2026 state.');
  };

  const handleMarkNotificationsRead = () => {
    setState((prev) => ({
      ...prev,
      activities: prev.activities.map((a) => ({ ...a, read: true })),
    }));
  };

  const handleQuickActionLaunch = (target: 'member' | 'attendance' | 'giving' | 'event') => {
    setOpenDropdown(null);
    const pageMap: Record<typeof target, PageId> = {
      member: 'members',
      attendance: 'attendance',
      giving: 'giving',
      event: 'events',
    };
    setActivePage(pageMap[target]);
    setModalTriggers((prev) => ({
      ...prev,
      [target]: prev[target] + 1,
    }));
  };

  const unreadNotificationsCount = state.activities.filter((a) => !a.read).length;

  const navItems: { id: PageId; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" /> },
    { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'giving', label: 'Giving', icon: <Coins className="w-4 h-4" /> },
    { id: 'events', label: 'Events', icon: <Calendar className="w-4 h-4" /> },
  ];

  if (!session) {
    return <SignInPage onSignInSuccess={handleSignInSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#EEF2F6] text-slate-800 flex flex-col">
      {/* Main Desktop Shell Container */}
      <div className="flex-1 flex flex-col max-w-[1440px] w-full mx-auto bg-[#F8FAFC] shadow-xs border-x border-slate-200/70">
        {/* Top Toolbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30">
          {/* Left Zone:
              - On mobile (< lg): [Hamburger Menu] [ECR Church Logo]
              - On desktop (lg:): [ECR Church Logo] | [Hamburger Menu] */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileSidebarOpen((v) => !v);
                } else {
                  setSidebarOpen((v) => !v);
                }
              }}
              aria-label="Toggle navigation menu"
              className="order-1 lg:order-3 p-2 -ml-1 lg:ml-0 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <Menu className="w-6 h-6 lg:w-5 lg:h-5" />
            </button>

            <div
              className="order-2 hidden lg:block h-6 w-px bg-slate-200"
              aria-hidden="true"
            />

            <button
              type="button"
              onClick={() => {
                setActivePage('dashboard');
                setMobileSidebarOpen(false);
              }}
              className="order-2 lg:order-1 flex items-center w-36 xs:w-40 sm:w-44 lg:w-48 h-12 overflow-hidden focus:outline-none cursor-pointer shrink-0"
              title="Église Cité de Restauration — Kolwezi"
            >
              <img
                src="/assets/aistudio/image_e7d4d54d.png"
                alt="ECR — Église Cité de Restauration Kolwezi-RDC"
                referrerPolicy="no-referrer"
                className="w-full h-28 object-contain scale-125 -ml-1 sm:-ml-2 select-none"
              />
            </button>
          </div>

          {/* Right Zone: Interactive Toolbar Icons */}
          <div ref={toolbarRef} className="flex items-center gap-2 sm:gap-3.5 relative shrink-0">
            {/* Reference Date Indicator Chip (subtle, clickable to open Settings on desktop) */}
            <button
              type="button"
              onClick={() =>
                setOpenDropdown(openDropdown === 'settings' ? null : 'settings')
              }
              title="Change Demo Reference Date"
              className="hidden xl:inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-md px-2.5 py-1 transition-colors cursor-pointer tabular-nums"
            >
              <Calendar className="w-3.5 h-3.5 text-[#0D62C6]" />
              <span>Demo Date: {formatDayMonthYear(state.referenceDate)}</span>
            </button>

            {/* 1. Notifications Bell Icon */}
            <button
              type="button"
              onClick={() => {
                setOpenDropdown(
                  openDropdown === 'notifications' ? null : 'notifications'
                );
                setConfirmReset(false);
              }}
              aria-label="Notifications and recent activity"
              className="relative p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Bell className="w-[19px] h-[19px] fill-slate-400/80 text-slate-500" />
              <span className="absolute top-0 right-0 min-w-[15px] h-[15px] px-1 rounded-full bg-[#1976D2] text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                {unreadNotificationsCount}
              </span>
            </button>

            {/* 2. Messages / Quick Actions Icon */}
            <button
              type="button"
              onClick={() => {
                setOpenDropdown(
                  openDropdown === 'quickActions' ? null : 'quickActions'
                );
                setConfirmReset(false);
              }}
              aria-label="Quick actions and announcements"
              className="relative p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Mail className="w-[19px] h-[19px] text-slate-500" />
              <span className="absolute top-0 right-0 min-w-[15px] h-[15px] px-1 rounded-full bg-[#D93025] text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                0
              </span>
            </button>

            {/* 3. Administrator Profile Icon */}
            <button
              type="button"
              onClick={() => {
                setOpenDropdown(openDropdown === 'profile' ? null : 'profile');
                setConfirmReset(false);
              }}
              aria-label="Administrator profile menu"
              className="w-7 h-7 rounded-full bg-[#1E293B] text-white flex items-center justify-center hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              <User className="w-4 h-4" />
            </button>

            {/* 4. Settings Icon */}
            <button
              type="button"
              onClick={() => {
                setOpenDropdown(openDropdown === 'settings' ? null : 'settings');
                setConfirmReset(false);
              }}
              aria-label="Demo settings and data reset"
              className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Settings className="w-[19px] h-[19px]" />
            </button>

            {/* Dropdown 1: Notifications Panel */}
            {openDropdown === 'notifications' && (
              <div className="fixed left-3 right-3 top-[68px] sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900">
                    Recent Activity ({state.activities.length})
                  </span>
                  <div className="flex items-center gap-2">
                    {unreadNotificationsCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkNotificationsRead}
                        className="text-[11px] font-semibold text-[#0D62C6] hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      aria-label="Close notifications"
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto my-1">
                  {state.activities.slice(0, 6).map((act) => (
                    <div
                      key={act.id}
                      onClick={() => {
                        const pageMap: Record<ActivityItem['type'], PageId> = {
                          attendance: 'attendance',
                          giving: 'giving',
                          member: 'members',
                          event: 'events',
                        };
                        setActivePage(pageMap[act.type]);
                        setOpenDropdown(null);
                      }}
                      className="py-2.5 flex items-start justify-between gap-2 hover:bg-slate-50 px-1.5 rounded-md cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-800">
                          {act.title} <span className="font-normal">{act.detail}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {act.timeAgo}
                        </div>
                      </div>
                      {!act.read && (
                        <span className="w-2 h-2 rounded-full bg-[#1976D2] mt-1 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dropdown 2: Quick Actions & Bulletins Panel */}
            {openDropdown === 'quickActions' && (
              <div className="fixed left-3 right-3 top-[68px] sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Quick Actions & Notices
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Shortcuts to record church operations
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(null)}
                    aria-label="Close quick actions"
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="py-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => handleQuickActionLaunch('member')}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-[#D93025]" />
                    <span>+ Add New Member</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickActionLaunch('attendance')}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-[#0D62C6]" />
                    <span>+ Record Service Attendance</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickActionLaunch('giving')}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-[#1E75C7]" />
                    <span>+ Record Giving Contribution</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickActionLaunch('event')}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-[#D93025]" />
                    <span>+ Create Church Event</span>
                  </button>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                  <div className="font-semibold text-slate-700">Upcoming Service Notice:</div>
                  <div>Sunday Worship Service — 15 Nov 2026 at 9:00 AM (Main Church Hall)</div>
                </div>
              </div>
            )}

            {/* Dropdown 3: Administrator Profile Menu */}
            {openDropdown === 'profile' && (
              <div className="fixed left-3 right-3 top-[68px] sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      ECR
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        Church Administrator
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        Église Cité de Restauration — Kolwezi
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(null)}
                    aria-label="Close profile menu"
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="py-2.5 text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Account:</span>
                    <span className="font-semibold text-slate-800">{session.username}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Mode:</span>
                    <span className="font-semibold text-slate-800">Practice Sign-In (Local)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Demo Date:</span>
                    <span className="font-semibold text-slate-800 tabular-nums">
                      {formatDayMonthYear(state.referenceDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Scripture:</span>
                    <span className="font-semibold text-[#D93025]">Ésaïe 58:12</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      setIsChangePasswordModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 text-left px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#0D62C6]" />
                    <span>Change Password</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown('settings')}
                    className="w-full flex items-center gap-2 text-left px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-500" />
                    <span>Demo Date & Data Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 text-left px-2.5 py-2 text-xs font-semibold text-[#CE1B22] hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}

            {/* Dropdown 4: Settings Panel (Demo Date + Reset Demo Data) */}
            {openDropdown === 'settings' && (
              <div className="fixed left-3 right-3 top-[68px] sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50 space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      System & Demo Settings
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Configure reference date or reset practice data
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(null)}
                    aria-label="Close settings"
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Demo Reference Date Control */}
                <div className="space-y-2">
                  <label
                    htmlFor="demo-ref-date-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Reference Demo Date
                  </label>
                  <input
                    id="demo-ref-date-input"
                    type="date"
                    value={state.referenceDate}
                    onChange={(e) => handleReferenceDateChange(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 tabular-nums focus:outline-none focus:border-blue-600"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleReferenceDateChange(INITIAL_REFERENCE_DATE)}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-medium cursor-pointer"
                    >
                      10 Nov 2026 (Default)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReferenceDateChange('2026-11-16')}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-medium cursor-pointer"
                    >
                      16 Nov 2026
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReferenceDateChange('2026-10-28')}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-medium cursor-pointer"
                    >
                      28 Oct 2026
                    </button>
                  </div>
                </div>

                {/* Reset Demo Data Section */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="text-xs font-semibold text-slate-700">
                    Reset Practice Database
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Restores all initial fictional members (250), attendance records, giving contributions, and events.
                  </p>

                  {!confirmReset ? (
                    <button
                      type="button"
                      onClick={() => setConfirmReset(true)}
                      className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-[#D93025] border border-red-200 rounded-md py-2 px-3 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Demo Data</span>
                    </button>
                  ) : (
                    <div className="bg-red-50/80 border border-red-200 rounded-md p-2.5 space-y-2">
                      <div className="text-[11px] font-semibold text-red-800">
                        Are you sure you want to reset all changes?
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleResetDemoData}
                          className="flex-1 bg-[#D93025] hover:bg-[#B71C1C] text-white text-xs font-semibold py-1.5 rounded cursor-pointer"
                        >
                          Confirm Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmReset(false)}
                          className="flex-1 bg-white border border-slate-300 text-slate-700 text-xs font-semibold py-1.5 rounded hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Body Layout: Left Sidebar + Main Content Viewport */}
        <div className="flex-1 flex relative">
          {/* Mobile Backdrop */}
          {mobileSidebarOpen && (
            <div
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] z-40 lg:hidden"
            />
          )}

          {/* Left Navigation Sidebar / Mobile Hamburger Drawer */}
          <aside
            className={`${
              sidebarOpen ? 'lg:w-[205px]' : 'lg:w-16'
            } ${
              mobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
            } fixed lg:static inset-y-0 left-0 top-0 lg:top-16 z-50 lg:z-20 bg-white lg:bg-[#FAFBFD] border-r border-slate-200/80 pt-3 lg:pt-5 pb-6 flex flex-col justify-between transition-transform duration-200 shrink-0 shadow-xl lg:shadow-none`}
          >
            <div>
              {/* Mobile Drawer Top Header with Logo & Close Button */}
              <div className="flex lg:hidden items-center justify-between px-4 pb-3 mb-2 border-b border-slate-100">
                <div className="w-36 h-10 overflow-hidden flex items-center">
                  <img
                    src="/assets/aistudio/image_e7d4d54d.png"
                    alt="ECR Logo"
                    referrerPolicy="no-referrer"
                    className="w-full h-24 object-contain scale-125 -ml-1 select-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav aria-label="Main church navigation" className="space-y-1">
                {navItems.map((item) => {
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActivePage(item.id);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-5 py-3 lg:py-2.5 text-[13.5px] lg:text-[13px] transition-colors relative cursor-pointer ${
                        isActive
                          ? 'text-[#D93025] font-semibold bg-red-50/50'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      {/* Red Active Left Indicator Bar */}
                      {isActive && (
                        <span
                          className="absolute left-0 top-1 bottom-1 w-[3.5px] bg-[#D93025] rounded-r"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={`shrink-0 ${
                          isActive ? 'text-[#D93025]' : 'text-slate-400'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span
                        className={`${
                          !sidebarOpen ? 'lg:hidden' : ''
                        } whitespace-nowrap`}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}

                {/* ECR Assistant Button inside Sidebar & Mobile Drawer (available across all 5 pages) */}
                <div className="pt-2 mt-2 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => {
                      setAssistantOpen((v) => !v);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3.5 px-5 py-3 lg:py-2.5 text-[13.5px] lg:text-[13px] transition-colors relative cursor-pointer ${
                      assistantOpen
                        ? 'text-[#0D62C6] font-semibold bg-blue-50/70'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                    }`}
                  >
                    {assistantOpen && (
                      <span
                        className="absolute left-0 top-1 bottom-1 w-[3.5px] bg-[#0D62C6] rounded-r"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`shrink-0 ${
                        assistantOpen ? 'text-[#0D62C6]' : 'text-[#D93025]'
                      }`}
                    >
                      <MessageSquareText className="w-4 h-4" />
                    </span>
                    <span
                      className={`${
                        !sidebarOpen ? 'lg:hidden' : ''
                      } whitespace-nowrap`}
                    >
                      ECR Assistant
                    </span>
                  </button>
                </div>
              </nav>
            </div>

            {/* Quiet Demo Footer inside Sidebar when expanded */}
            <div className={`${!sidebarOpen ? 'lg:hidden' : ''} px-5 pt-6 border-t border-slate-200/60`}>
              <div className="text-[11px] font-semibold text-slate-600 truncate">
                ECR — Kolwezi
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Demo Date: {formatDayMonthYear(state.referenceDate)}
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 p-3.5 sm:p-5 overflow-x-hidden">
            {toastMessage && (
              <div
                role="status"
                className="mb-3 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-md flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{toastMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {activePage === 'dashboard' && (
              <DashboardPage
                referenceDate={state.referenceDate}
                members={state.members}
                attendance={state.attendance}
                giving={state.giving}
                events={state.events}
                activities={state.activities}
                onNavigate={setActivePage}
                onQuickAction={handleQuickActionLaunch}
              />
            )}

            {activePage === 'members' && (
              <MembersPage
                referenceDate={state.referenceDate}
                members={state.members}
                onSaveMember={handleSaveMember}
                openAddModalTrigger={modalTriggers.member}
              />
            )}

            {activePage === 'attendance' && (
              <AttendancePage
                referenceDate={state.referenceDate}
                attendance={state.attendance}
                onSaveAttendance={handleSaveAttendance}
                openAddModalTrigger={modalTriggers.attendance}
              />
            )}

            {activePage === 'giving' && (
              <GivingPage
                referenceDate={state.referenceDate}
                giving={state.giving}
                members={state.members}
                onSaveGiving={handleSaveGiving}
                openAddModalTrigger={modalTriggers.giving}
              />
            )}

            {activePage === 'events' && (
              <EventsPage
                referenceDate={state.referenceDate}
                events={state.events}
                onSaveEvent={handleSaveEvent}
                openAddModalTrigger={modalTriggers.event}
              />
            )}
          </main>

          {/* Right-hand Desktop Panel & Full-Screen Mobile Chat for ECR Assistant */}
          <ECRAssistantPanel
            isOpen={assistantOpen}
            onClose={() => setAssistantOpen(false)}
            state={state}
            onSaveMember={handleSaveMember}
            onSaveAttendance={handleSaveAttendance}
            onSaveGiving={handleSaveGiving}
            onSaveEvent={handleSaveEvent}
          />
        </div>
      </div>

      {/* Floating ECR Assistant Button when panel is closed (accessible from all 5 pages on desktop & phone) */}
      {!assistantOpen && (
        <button
          type="button"
          onClick={() => setAssistantOpen(true)}
          aria-label="Open ECR Assistant"
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 bg-[#D93025] hover:bg-[#B71C1C] text-white font-semibold text-xs sm:text-[13px] px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer border border-white/20"
        >
          <MessageSquareText className="w-4 h-4 shrink-0" />
          <span>ECR Assistant</span>
        </button>
      )}

      {/* Change Password Modal accessible from Administrator Profile Menu */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        signedInUsername={session.username}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onPasswordChanged={() => {
          showToast('Administrator password updated in local storage.');
        }}
      />
    </div>
  );
}
