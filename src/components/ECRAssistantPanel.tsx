import React, { useEffect, useRef, useState } from 'react';
import { X, SendHorizontal, Check, AlertTriangle, Sparkles } from 'lucide-react';
import {
  AttendanceRecord,
  DemoState,
  EventRecord,
  GivingRecord,
  MemberRecord,
} from '../data/demoData';
import {
  AssistantChatMessage,
  buildRelevantContextSlice,
  buildValidatedProposalFromAI,
  ProposedChangePayload,
} from '../utils/assistantTools';
import { formatDayMonthYear } from '../utils/dateUtils';

interface ECRAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  state: DemoState;
  onSaveMember: (member: MemberRecord, isNew: boolean) => void;
  onSaveAttendance: (record: AttendanceRecord, isNew: boolean) => void;
  onSaveGiving: (record: GivingRecord, isNew: boolean) => void;
  onSaveEvent: (event: EventRecord, isNew: boolean) => void;
}

const INITIAL_WELCOME_MESSAGE =
  'Hello! I’m ECR Assistant. I can help you find information and use the church management system. Ask me about members, attendance, giving, events, or how to use a feature. What would you like to know?';

const INITIAL_SUGGESTIONS = [
  'Today’s Attendance',
  'Today’s Giving',
  'Upcoming Events',
  'System Help',
];

export const ECRAssistantPanel: React.FC<ECRAssistantPanelProps> = ({
  isOpen,
  onClose,
  state,
  onSaveMember,
  onSaveAttendance,
  onSaveGiving,
  onSaveEvent,
}) => {
  const [messages, setMessages] = useState<AssistantChatMessage[]>(() => [
    {
      id: 'welcome-msg',
      role: 'assistant',
      text: INITIAL_WELCOME_MESSAGE,
      suggestions: INITIAL_SUGGESTIONS,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiConfigured, setApiConfigured] = useState<boolean | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check server-side AI configuration status when opened
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch('/api/assistant')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && typeof data?.configured === 'boolean') {
          setApiConfigured(data.configured);
        }
      })
      .catch(() => {
        // Ignore transient network check errors
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Auto-scroll to bottom when messages or loading state changes
  useEffect(() => {
    if (!isOpen) return;
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isLoading, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (rawQuestion: string) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed || isLoading) return;

    const userMsg: AssistantChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const recentHistory = messages
      .filter((m) => m.id !== 'welcome-msg')
      .slice(-6)
      .map((m) => ({
        role: m.role,
        text: m.text,
      }));

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build compact, accurate data context from the browser's current saved records
      const contextSlice = buildRelevantContextSlice(trimmed, recentHistory, state);

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          history: recentHistory,
          contextSlice,
        }),
      });

      const data = await response.json();

      if (data.configured === false) {
        setApiConfigured(false);
        const warningMsg: AssistantChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text:
            data.error ||
            'The server-side AI service is not configured. Please set the GEMINI_API_KEY environment variable on the server to enable ECR Assistant.',
          source: 'Source: Server Configuration',
          isConfigWarning: true,
        };
        setMessages((prev) => [...prev, warningMsg]);
        return;
      }

      if (!response.ok || data.error) {
        const errMsg: AssistantChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text:
            data.error ||
            'Sorry, I encountered a temporary issue processing your request. Please try again.',
        };
        setMessages((prev) => [...prev, errMsg]);
        return;
      }

      setApiConfigured(true);

      let validatedProposal: ProposedChangePayload | undefined;
      let replyText: string =
        data.replyText ||
        'I’m here to help with the ECR Church Management System. You can ask me about members, attendance, giving, events, or how to use the system.';
      let sourceLine: string | undefined = data.sourceLine || undefined;

      if (data.proposedAction && typeof data.proposedAction === 'object') {
        const validationResult = buildValidatedProposalFromAI(
          data.proposedAction,
          state
        );
        if (validationResult.proposal) {
          validatedProposal = validationResult.proposal;
          if (!sourceLine) {
            sourceLine = `Source: Pending Confirmation · ${formatDayMonthYear(
              state.referenceDate
            )}`;
          }
        } else if (validationResult.validationError) {
          replyText = `To prepare that record, please check the following: ${validationResult.validationError}`;
        }
      }

      const assistantMsg: AssistantChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: replyText,
        source: sourceLine,
        proposedChange: validatedProposal,
        proposalStatus: validatedProposal ? 'pending' : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallbackErr: AssistantChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: 'Unable to connect to the server-side ECR Assistant endpoint. Please check your connection and try again.',
      };
      setMessages((prev) => [...prev, fallbackErr]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmProposal = (messageId: string, proposal: ProposedChangePayload) => {
    let confirmationNote = '';

    if (
      (proposal.actionType === 'add_member' || proposal.actionType === 'edit_member') &&
      proposal.memberData
    ) {
      const isNew = proposal.actionType === 'add_member';
      onSaveMember(proposal.memberData, isNew);
      confirmationNote = isNew
        ? `Member ${proposal.memberData.fullName} (${proposal.memberData.id}) has been added to Members.`
        : `Member ${proposal.memberData.fullName} (${proposal.memberData.id}) has been updated.`;
    } else if (
      (proposal.actionType === 'record_attendance' ||
        proposal.actionType === 'edit_attendance') &&
      proposal.attendanceData
    ) {
      const isNew = proposal.actionType === 'record_attendance';
      onSaveAttendance(proposal.attendanceData, isNew);
      confirmationNote = isNew
        ? `Attendance for ${proposal.attendanceData.service} on ${formatDayMonthYear(
            proposal.attendanceData.date
          )} (${proposal.attendanceData.total} people) has been saved.`
        : `Attendance record ${proposal.attendanceData.id} (${formatDayMonthYear(
            proposal.attendanceData.date
          )}) has been updated to ${proposal.attendanceData.total} people.`;
    } else if (
      (proposal.actionType === 'record_giving' || proposal.actionType === 'edit_giving') &&
      proposal.givingData
    ) {
      const isNew = proposal.actionType === 'record_giving';
      onSaveGiving(proposal.givingData, isNew);
      confirmationNote = isNew
        ? `Contribution of $${proposal.givingData.amount.toLocaleString()} from ${
            proposal.givingData.contributor
          } (${proposal.givingData.id}) has been recorded.`
        : `Contribution ${proposal.givingData.id} has been updated.`;
    } else if (
      (proposal.actionType === 'create_event' || proposal.actionType === 'edit_event') &&
      proposal.eventData
    ) {
      const isNew = proposal.actionType === 'create_event';
      onSaveEvent(proposal.eventData, isNew);
      confirmationNote = isNew
        ? `Event "${proposal.eventData.name}" on ${formatDayMonthYear(
            proposal.eventData.date
          )} (${proposal.eventData.id}) has been created.`
        : `Event "${proposal.eventData.name}" (${proposal.eventData.id}) has been updated.`;
    }

    setMessages((prev) => [
      ...prev.map((m) =>
        m.id === messageId ? { ...m, proposalStatus: 'confirmed' as const } : m
      ),
      {
        id: `assistant-confirm-${Date.now()}`,
        role: 'assistant',
        text: confirmationNote || 'The change has been saved to your church records.',
        source: `Source: Saved to Local Records · ${formatDayMonthYear(
          state.referenceDate
        )}`,
      },
    ]);
  };

  const handleCancelProposal = (messageId: string) => {
    setMessages((prev) => [
      ...prev.map((m) =>
        m.id === messageId ? { ...m, proposalStatus: 'cancelled' as const } : m
      ),
      {
        id: `assistant-cancel-${Date.now()}`,
        role: 'assistant',
        text: 'Cancelled. No changes were made to your church records.',
      },
    ]);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  return (
    <aside
      aria-label="ECR Assistant"
      className="fixed inset-x-0 top-16 bottom-0 z-30 lg:static lg:inset-auto lg:z-20 lg:w-[325px] xl:w-[350px] lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16 bg-white lg:border-l border-slate-200/80 flex flex-col shrink-0 shadow-lg lg:shadow-none"
    >
      {/* Assistant Header */}
      <div className="px-4 py-3.5 lg:px-4 lg:py-3 border-b border-slate-100 flex items-start justify-between gap-3 bg-white shrink-0">
        <div className="flex items-stretch gap-3 min-w-0">
          {/* Red Vertical Accent Bar */}
          <span
            className="w-[4px] bg-[#D93025] rounded-full shrink-0 my-0.5"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2 className="text-[19px] lg:text-[15.5px] font-bold text-slate-900 leading-tight tracking-tight">
              ECR Assistant
            </h2>
            <p className="text-[13px] lg:text-[11.5px] text-slate-500 mt-0.5">
              Ask about church records
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close ECR Assistant"
          className="p-1.5 -mr-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-5 h-5 lg:w-4 lg:h-4" />
        </button>
      </div>

      {/* Server AI Configuration Warning Banner (shown only if GEMINI_API_KEY is missing on server) */}
      {apiConfigured === false && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11.5px] text-amber-900 space-y-1 shrink-0">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>AI Service Not Configured</span>
          </div>
          <p className="leading-relaxed text-amber-800">
            Set <code className="font-mono font-semibold">GEMINI_API_KEY</code> in your server or Vercel environment variables to enable live AI responses.
          </p>
        </div>
      )}

      {/* Scrollable Conversation Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 bg-white"
      >
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[86%] bg-[#FCE8E8] text-slate-900 rounded-xl px-4 py-2.5 lg:px-3.5 lg:py-2.5 text-[14.5px] lg:text-[12.5px] leading-snug shadow-2xs">
                  {msg.text}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="space-y-2.5">
              {/* Assistant Message Bubble with Blue Left Accent Stripe */}
              <div className="max-w-[94%] bg-[#E3EFFC] rounded-xl pl-4 pr-3.5 py-3 lg:py-2.5 relative overflow-hidden shadow-2xs">
                <span
                  className="absolute left-0 top-0 bottom-0 w-[5px] bg-[#0D62C6]"
                  aria-hidden="true"
                />
                <div className="text-[14.5px] lg:text-[12.5px] text-slate-900 leading-snug whitespace-pre-line">
                  {msg.text}
                </div>
                {msg.source && (
                  <div className="text-[12.5px] lg:text-[11px] text-slate-500 mt-1.5 font-normal">
                    {msg.source}
                  </div>
                )}
              </div>

              {/* Clickable Suggestion Pills (shown under welcome message) */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {msg.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSendMessage(suggestion)}
                      className="px-3.5 py-1.5 lg:px-3 lg:py-1 rounded-full bg-white hover:bg-blue-50/80 active:bg-blue-100/60 text-[#0D62C6] border border-slate-200/90 text-[13px] lg:text-[11.5px] font-medium transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Proposed Record Change Confirmation Card */}
              {msg.proposedChange && (
                <div className="max-w-[94%] bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                    <span className="text-[12.5px] lg:text-[11.5px] font-bold text-slate-900">
                      {msg.proposedChange.summaryTitle}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-[#0D62C6] border border-blue-200/60">
                      Confirm Change
                    </span>
                  </div>

                  {msg.proposedChange.isDuplicateWarning &&
                    msg.proposedChange.duplicateWarningText && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11.5px] text-amber-900 flex items-start gap-2 leading-snug">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>{msg.proposedChange.duplicateWarningText}</span>
                      </div>
                    )}

                  <ul className="space-y-1 text-[12.5px] lg:text-[11.5px] text-slate-700">
                    {msg.proposedChange.summaryLines.map((line, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#0D62C6] font-bold">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>

                  {msg.proposalStatus === 'pending' && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleConfirmProposal(msg.id, msg.proposedChange!)
                        }
                        className="flex-1 bg-[#D93025] hover:bg-[#B71C1C] text-white font-semibold text-[12.5px] lg:text-[11.5px] py-2 lg:py-1.5 px-3 rounded-lg transition-colors cursor-pointer shadow-2xs"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelProposal(msg.id)}
                        className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-[12.5px] lg:text-[11.5px] py-2 lg:py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {msg.proposalStatus === 'confirmed' && (
                    <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Confirmed and saved to church records</span>
                    </div>
                  )}

                  {msg.proposalStatus === 'cancelled' && (
                    <div className="text-[11.5px] font-medium text-slate-500 bg-slate-100 rounded-lg px-2.5 py-1.5">
                      Change cancelled — not saved
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div className="max-w-[85%] bg-[#E3EFFC] rounded-xl pl-4 pr-3.5 py-3 relative overflow-hidden shadow-2xs">
            <span
              className="absolute left-0 top-0 bottom-0 w-[5px] bg-[#0D62C6]"
              aria-hidden="true"
            />
            <div className="flex items-center gap-2 text-[13px] lg:text-[12px] text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-[#0D62C6] animate-spin shrink-0" />
              <span>Checking church records...</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Message Input Form */}
      <form
        onSubmit={handleFormSubmit}
        className="p-3.5 lg:p-3 border-t border-slate-100 bg-white shrink-0"
      >
        <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl pl-3.5 pr-1.5 py-1.5 shadow-2xs focus-within:border-[#0D62C6] focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about your church..."
            aria-label="Ask about your church"
            disabled={isLoading}
            className="flex-1 min-w-0 bg-transparent text-[14.5px] lg:text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            aria-label="Send message"
            className="w-9 h-8 lg:w-8 lg:h-7 rounded-lg bg-[#D93025] hover:bg-[#B71C1C] disabled:opacity-50 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            <SendHorizontal className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          </button>
        </div>
      </form>
    </aside>
  );
};
