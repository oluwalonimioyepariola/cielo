import { extractVocab } from './extract';
import { parseWhatsApp } from './parse-whatsapp';
import type { AnalyzeOptions, ChatAnalysis, ParsedChat } from './types';

export { parseWhatsApp } from './parse-whatsapp';
export type * from './types';

/**
 * Step two of import: once the user has said which participant they are,
 * rank the words and phrases they use. Runs entirely on the device.
 */
export function analyzeChat(chat: ParsedChat, options: AnalyzeOptions): ChatAnalysis {
  if (!chat.participants.some((p) => p.name === options.self)) {
    throw new Error(`"${options.self}" isn't one of the people in this chat.`);
  }

  const { vocab, uniqueWords } = extractVocab(
    chat.messages,
    chat.participants.map((p) => p.name),
    options,
  );

  // A reduce, not Math.min(...all): a long chat has more messages than a function call can take as arguments.
  let first = Infinity;
  let last = -Infinity;
  for (const { timestamp } of chat.messages) {
    if (!timestamp) continue;
    first = Math.min(first, timestamp.getTime());
    last = Math.max(last, timestamp.getTime());
  }
  const selfMessages = chat.messages.filter((m) => m.sender === options.self).length;

  return {
    vocab,
    stats: {
      totalMessages: chat.messages.length,
      selfMessages,
      partnerMessages: chat.messages.length - selfMessages,
      firstMessageAt: Number.isFinite(first) ? new Date(first) : null,
      lastMessageAt: Number.isFinite(last) ? new Date(last) : null,
      uniqueWords,
    },
  };
}

/** Convenience for tests and scripts: parse and analyze in one go. */
export function analyzeWhatsAppExport(raw: string, options: AnalyzeOptions): ChatAnalysis {
  return analyzeChat(parseWhatsApp(raw), options);
}
