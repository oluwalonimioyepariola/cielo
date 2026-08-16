import type { ChatMessage, ParsedChat, Participant } from './types';

// WhatsApp exports differ by platform and locale:
//   iOS:     [12/03/2024, 21:15:03] Tolu: message
//   Android: 12/03/2024, 21:15 - Tolu: message
// Times may be 12h ("9:15 PM") and dates may be D/M/Y, M/D/Y or Y-M-D.
const DATE = String.raw`(\d{1,4}[./-]\d{1,2}[./-]\d{1,4})`;
const TIME = String.raw`(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?(?:\s?[AaPp]\.?\s?[Mm]\.?)?)`;

const IOS_HEADER = new RegExp(String.raw`^\[${DATE},?\s+${TIME}\]\s*(.*)$`);
const ANDROID_HEADER = new RegExp(String.raw`^${DATE},?\s+${TIME}\s+[-–]\s+(.*)$`);
const SENDER_AND_TEXT = /^([^:]{1,60}?):\s?(.*)$/s;

const INVISIBLE = /[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
const ODD_SPACES = /[\u00a0\u202f\u2007]/g;

// iOS puts an invisible left-to-right mark before system text and media placeholders,
// even when the line carries a person's name: "[…] Alex: \u200eMessages and calls are end-to-end encrypted".
const IOS_SYSTEM_MARK = /^\[[^\]]+\][^:]+:\s?\u200e/;

const PLACEHOLDERS: RegExp[] = [
  /^messages and calls are end-to-end encrypted/i,
  /^your security code with .* changed/i,
  /^disappearing messages/i,
  /^<media omitted>$/i,
  /^(image|video|audio|sticker|gif|document|contact card|photo) omitted$/i,
  /^<attached: .*>$/i,
  /\(file attached\)$/i,
  /^this message was deleted\.?$/i,
  /^you deleted this message\.?$/i,
  /^waiting for this message/i,
  /^missed (voice|video) call/i,
  /^(voice|video) call/i,
  /^location: https?:/i,
  /^live location shared$/i,
  /^null$/i,
  /^view once (photo|video|message)/i,
];

const EDITED_SUFFIX = /\s*<this message was edited>\s*$/i;

type RawMessage = { date: string; time: string; sender: string; text: string };
type DateOrder = 'DMY' | 'MDY' | 'YMD';

export function parseWhatsApp(raw: string): ParsedChat {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const rawMessages: RawMessage[] = [];
  let skippedLines = 0;
  // Continuation lines belong to the previous message — unless that "message" was a system notice.
  let current: RawMessage | null = null;

  for (const original of lines) {
    const line = original.replace(INVISIBLE, '').replace(ODD_SPACES, ' ');
    const header = IOS_HEADER.exec(line) ?? ANDROID_HEADER.exec(line);

    if (header) {
      const [, date, time, rest] = header;
      const body = SENDER_AND_TEXT.exec(rest);
      if (!body || IOS_SYSTEM_MARK.test(original)) {
        // System notice or media placeholder: "Messages and calls are end-to-end encrypted", "X added Y", ...
        current = null;
        skippedLines++;
        continue;
      }
      current = { date, time, sender: body[1].replace(/^~\s*/, '').trim(), text: body[2] };
      rawMessages.push(current);
    } else if (current) {
      current.text += '\n' + line;
    } else if (line.trim()) {
      skippedLines++;
    }
  }

  const order = detectDateOrder(rawMessages);
  const messages: ChatMessage[] = [];
  const counts = new Map<string, number>();

  for (const m of rawMessages) {
    const text = m.text.replace(EDITED_SUFFIX, '').trim();
    if (!text || PLACEHOLDERS.some((p) => p.test(text))) continue;
    messages.push({ timestamp: toDate(m.date, m.time, order), sender: m.sender, text });
    counts.set(m.sender, (counts.get(m.sender) ?? 0) + 1);
  }

  const participants: Participant[] = [...counts]
    .map(([name, messageCount]) => ({ name, messageCount }))
    .sort((a, b) => b.messageCount - a.messageCount);

  return { messages, participants, skippedLines };
}

function detectDateOrder(messages: RawMessage[]): DateOrder {
  let firstOver12 = false;
  let secondOver12 = false;
  for (const { date } of messages) {
    const [a, b] = date.split(/[./-]/);
    if (a.length === 4) return 'YMD';
    if (Number(a) > 12) firstOver12 = true;
    if (Number(b) > 12) secondOver12 = true;
  }
  if (secondOver12 && !firstOver12) return 'MDY';
  return 'DMY';
}

function toDate(date: string, time: string, order: DateOrder): Date | null {
  const parts = date.split(/[./-]/).map(Number);
  let [day, month, year] =
    order === 'YMD' ? [parts[2], parts[1], parts[0]] :
    order === 'MDY' ? [parts[1], parts[0], parts[2]] :
    [parts[0], parts[1], parts[2]];
  if (year < 100) year += 2000;

  const t = /^(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s?([AaPp])?/.exec(time);
  if (!t) return null;
  let hours = Number(t[1]);
  const meridiem = t[4]?.toLowerCase();
  if (meridiem === 'p' && hours < 12) hours += 12;
  if (meridiem === 'a' && hours === 12) hours = 0;

  const result = new Date(year, month - 1, day, hours, Number(t[2]), Number(t[3] ?? 0));
  return Number.isNaN(result.getTime()) ? null : result;
}
