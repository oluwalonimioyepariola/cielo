export type ChatMessage = {
  timestamp: Date | null;
  sender: string;
  text: string;
};

export type Participant = {
  name: string;
  messageCount: number;
};

export type ParsedChat = {
  messages: ChatMessage[];
  participants: Participant[];
  /** Lines that looked like neither a message nor a continuation (system notices etc). */
  skippedLines: number;
};

export type VocabKind = 'word' | 'phrase';

export type VocabItem = {
  /** Normalized English text, e.g. "on my way". */
  text: string;
  kind: VocabKind;
  words: number;
  /** Total occurrences across the messages that were analyzed. */
  count: number;
  selfCount: number;
  partnerCount: number;
  /** Ranking score: frequency weighted by speaker and phrase length. */
  score: number;
  /** Up to 3 anonymized messages where the item appears — used later for lessons. */
  examples: string[];
};

export type AnalyzeOptions = {
  /** Participant name of the app user, as it appears in the export. */
  self: string;
  /** Also learn from the other person's messages. Off by default for privacy. */
  includePartner?: boolean;
  /** How much a partner occurrence counts relative to the user's own. */
  partnerWeight?: number;
  minWordCount?: number;
  minPhraseCount?: number;
  maxPhraseWords?: number;
  limit?: number;
};

export type ChatAnalysis = {
  vocab: VocabItem[];
  stats: {
    totalMessages: number;
    selfMessages: number;
    partnerMessages: number;
    firstMessageAt: Date | null;
    lastMessageAt: Date | null;
    uniqueWords: number;
  };
};
