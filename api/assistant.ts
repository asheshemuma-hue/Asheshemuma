import { GoogleGenAI } from '@google/genai';

// Simple in-memory sliding-window rate limiter per client IP to protect the server-side AI endpoint
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 25;
const ipRequestTimestamps = new Map<string, number[]>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recent = (ipRequestTimestamps.get(ip) || []).filter((ts) => ts > windowStart);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldestInWindow = recent[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldestInWindow + RATE_LIMIT_WINDOW_MS - now) / 1000)
    );
    ipRequestTimestamps.set(ip, recent);
    return { allowed: false, retryAfterSeconds };
  }

  recent.push(now);
  ipRequestTimestamps.set(ip, recent);
  return { allowed: true };
}

export function isGeminiApiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(
    key &&
      key !== 'MY_GEMINI_API_KEY' &&
      key !== 'YOUR_API_KEY' &&
      !key.startsWith('TODO') &&
      key.length > 10
  );
}

export interface AssistantApiRequestBody {
  message?: string;
  history?: { role: 'user' | 'assistant'; text: string }[];
  contextSlice?: Record<string, unknown>;
}

function extractTextFromInteraction(interaction: any): string {
  let fullOutput = '';
  if (Array.isArray(interaction?.steps)) {
    for (const step of interaction.steps) {
      if (step.type === 'model_output') {
        const textContent = step.content?.find((c: any) => c.type === 'text');
        if (textContent && typeof textContent.text === 'string') {
          fullOutput += textContent.text;
        }
      }
    }
  }
  if (!fullOutput && typeof interaction?.output_text === 'string') {
    fullOutput = interaction.output_text;
  }
  return fullOutput.trim();
}

export async function processAssistantRequest(
  body: AssistantApiRequestBody,
  clientIp: string
): Promise<{
  status: number;
  data: {
    configured: boolean;
    replyText?: string;
    sourceLine?: string;
    intentCategory?: string;
    proposedAction?: Record<string, unknown> | null;
    error?: string;
  };
}> {
  if (!isGeminiApiKeyConfigured()) {
    return {
      status: 200,
      data: {
        configured: false,
        error:
          'Server-side AI connection is not configured. Set the GEMINI_API_KEY environment variable on the server (or in your Vercel project settings) to enable ECR Assistant.',
      },
    };
  }

  const rateStatus = checkRateLimit(clientIp);
  if (!rateStatus.allowed) {
    return {
      status: 429,
      data: {
        configured: true,
        error: `Rate limit reached. Please wait ${rateStatus.retryAfterSeconds} seconds before sending another question.`,
      },
    };
  }

  const userMessage = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!userMessage) {
    return {
      status: 400,
      data: {
        configured: true,
        error: 'Please enter a question or message for ECR Assistant.',
      },
    };
  }

  if (userMessage.length > 1500) {
    return {
      status: 400,
      data: {
        configured: true,
        error: 'Your message is too long. Please keep questions under 1,500 characters.',
      },
    };
  }

  const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];
  const contextSlice = body?.contextSlice || {};

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const systemInstruction = `You are ECR Assistant, the official assistant for the Église Cité de Restauration — Kolwezi (ECR) Church Management System.

CRITICAL RULES:
1. USE ONLY PROVIDED RECORDS:
   - Answer using ONLY the church records and pre-calculated summaries provided in CURRENT_CHURCH_CONTEXT_JSON.
   - Never invent members, attendance numbers, giving amounts, or events.
   - If a record is not present in the provided context, state clearly that no matching record was found.

2. TODAY'S DATE (REFERENCE DEMO DATE):
   - Always treat "referenceDemoDate.formatted" (and "referenceDemoDate.iso") in CURRENT_CHURCH_CONTEXT_JSON as "today".
   - When the user asks about "today", "this week", or "this month", state the reference date you used.
   - If the user asks for "Today's Attendance" or "How many people attended today?" and there is no attendance record on referenceDemoDate itself (e.g., 10 Nov 2026 is a Tuesday), state that no service attendance is recorded for today's date (10 Nov 2026) and immediately share the Last Sunday attendance ("180 people: 150 members and 30 visitors on 8 Nov 2026.").
   - If the user asks for "Today's Giving" or "How much giving was recorded today?" and there is $0 recorded on referenceDemoDate (10 Nov 2026), state that no giving is recorded on 10 Nov 2026 itself, and share the most recent service giving (8 Nov 2026: $600 from 2 contributions) and the monthly total ($1,500 in November 2026).

3. CONCISE, PROFESSIONAL ANSWERS & SOURCE LINE:
   - Keep answers clear, direct, and concise to match a compact management panel.
   - Examples:
     - Question: "How many people attended on 8 Nov?" or "How many people attended last Sunday?"
       replyText: "180 people: 150 members and 30 visitors."
       sourceLine: "Source: Attendance · 8 Nov 2026"
     - Question: "How much giving was recorded on 8 Nov?"
       replyText: "$600 from 2 contributions."
       sourceLine: "Source: Giving · 8 Nov 2026"
   - Always provide a helpful "sourceLine" formatted like:
     - "Source: Attendance · 8 Nov 2026"
     - "Source: Giving · 8 Nov 2026"
     - "Source: Members · 10 Nov 2026"
     - "Source: Events · 10 Nov 2026"
     - "Source: System Guide · ECR Kolwezi"

4. INDIVIDUAL ATTENDANCE LIMITATION:
   - Attendance records in this system store only aggregate member counts and visitor counts per service, NOT individual member names.
   - If the user asks which specific members attended a service (or whether a named person attended), explain politely that the system records total member and visitor counts per service rather than individual attendee names.

5. UNRELATED QUESTIONS:
   - If the user asks a question unrelated to the church management system (e.g., general trivia, world news, sports, weather, coding, recipes), respond with this exact message in replyText:
     "I’m here to help with the ECR Church Management System. You can ask me about members, attendance, giving, events, or how to use the system."

6. MISSING DETAILS & ASSISTED RECORD CHANGES (CONFIRM BEFORE SAVING):
   - Users can ask you to prepare adding or editing a member, attendance record, giving contribution, or event.
   - NEVER claim that you have already saved a change. Changes are only saved after the user clicks the "Confirm" button in the UI.
   - Before setting hasProposedAction = true, verify that all required details were provided:
     * add_member: requires fullName and ministry (available ministries: Worship Team, Youth Ministry, Women's Ministry, Men's Fellowship, Children's Ministry, Ushering & Hospitality, Prayer & Intercession, Evangelism & Outreach). Optional: phone, email, dateJoined (defaults to referenceDemoDate.iso), status ('Active' or 'Inactive').
     * edit_member: requires identifying the existing member (fullName or id) and what field to change.
     * record_attendance / edit_attendance: requires service name (e.g. "Sunday Worship Service"), date (YYYY-MM-DD), members count (integer >= 0), and visitors count (integer >= 0). If the user gives only a total without breaking down members vs. visitors, ask them how many were members and how many were visitors before proposing.
     * record_giving / edit_giving: requires contributor name, amount in USD (> 0), and type ("Tithe", "Offering", "Building Fund", or "Other"). Optional: date (defaults to referenceDemoDate.iso), paymentMethod ("Cash", "Bank Transfer", "Mobile Money", or "Other").
     * create_event / edit_event: requires event name, date (YYYY-MM-DD), startTime (HH:MM 24h), endTime (HH:MM 24h, after startTime), and location.
   - If ANY required detail is missing or ambiguous, set hasProposedAction = false and politely ask the user for the missing detail(s) in replyText.

7. OUTPUT FORMAT (RAW JSON ONLY):
   Respond ONLY with a valid JSON object (no markdown fences) matching this exact structure:
   {
     "replyText": "string",
     "sourceLine": "string",
     "intentCategory": "attendance",
     "hasProposedAction": false,
     "proposedAction": null
   }
   When hasProposedAction is true, set "proposedAction" to an object with "actionType" ("add_member" | "edit_member" | "record_attendance" | "edit_attendance" | "record_giving" | "edit_giving" | "create_event" | "edit_event") and the matching record object ("member", "attendance", "giving", or "event").`;

    const conversationTranscript = history
      .map((item) => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.text}`)
      .join('\n');

    const prompt = `CURRENT_CHURCH_CONTEXT_JSON:
${JSON.stringify(contextSlice)}

RECENT_CONVERSATION:
${conversationTranscript || '(No prior messages)'}

CURRENT_USER_MESSAGE:
${userMessage}`;

    let rawText = '';
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let lastError: unknown = null;

    for (const modelName of candidateModels) {
      try {
        const interaction = await ai.interactions.create(
          {
            model: modelName,
            input: prompt,
            system_instruction: systemInstruction,
            store: false,
          },
          { timeout: 12000 }
        );
        rawText = extractTextFromInteraction(interaction);
        if (rawText) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!rawText && lastError) {
      throw lastError;
    }

    const jsonMatch =
      rawText.match(/```json\s*([\s\S]*?)\s*```/) ||
      rawText.match(/(\{[\s\S]*\})/);
    const jsonString = jsonMatch ? jsonMatch[1] : rawText;
    const parsed = JSON.parse(jsonString || '{}');

    return {
      status: 200,
      data: {
        configured: true,
        replyText:
          typeof parsed.replyText === 'string' && parsed.replyText.trim()
            ? parsed.replyText.trim()
            : rawText ||
              'I’m here to help with the ECR Church Management System. You can ask me about members, attendance, giving, events, or how to use the system.',
        sourceLine:
          typeof parsed.sourceLine === 'string' ? parsed.sourceLine.trim() : '',
        intentCategory:
          typeof parsed.intentCategory === 'string'
            ? parsed.intentCategory
            : 'help',
        proposedAction:
          parsed.hasProposedAction && parsed.proposedAction
            ? parsed.proposedAction
            : null,
      },
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('ECR Assistant API Error:', errMsg);

    const isInvalidKey =
      errMsg.includes('API_KEY_INVALID') ||
      errMsg.includes('API key not valid') ||
      errMsg.includes('PERMISSION_DENIED') ||
      errMsg.includes('unauthenticated');

    if (isInvalidKey) {
      return {
        status: 200,
        data: {
          configured: false,
          error:
            'The server-side GEMINI_API_KEY environment variable is missing or invalid. Please configure a valid GEMINI_API_KEY in your server or Vercel project settings to enable ECR Assistant.',
        },
      };
    }

    return {
      status: 500,
      data: {
        configured: isGeminiApiKeyConfigured(),
        error: `Unable to reach the ECR Assistant AI service. Please verify that GEMINI_API_KEY is valid and try again.`,
      },
    };
  }
}

// Default export for Vercel Serverless Function (/api/assistant)
export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return res.status(200).json({
      configured: isGeminiApiKeyConfigured(),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const forwarded = req.headers?.['x-forwarded-for'];
  const clientIp =
    (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') ||
    req.socket?.remoteAddress ||
    'unknown';

  const result = await processAssistantRequest(req.body || {}, clientIp);
  return res.status(result.status).json(result.data);
}
