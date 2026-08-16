// Function words: never taught on their own, but allowed inside phrases ("on my way").
export const STOPWORDS = new Set(
  `a about above after again against all am an and any are as at be because been before being below
  between both but by can could did do does doing down during each few for from further had has have
  having he her here hers herself him himself his how i if in into is it its itself just me more most
  my myself no nor not now of off on once only or other our ours ourselves out over own same she should
  so some such than that the their theirs them themselves then there these they this those through to
  too under until up very was we were what when where which while who whom why will with would you your
  yours yourself yourselves also still even ever yet let us
  i'm i've i'll i'd you're you've you'll you'd he's she's it's we're we've we'll they're they've they'll
  that's there's what's where's who's how's let's isn't aren't wasn't weren't don't doesn't didn't
  haven't hasn't hadn't won't wouldn't can't couldn't shouldn't`.split(/\s+/),
);

// Chat noise that carries no vocabulary.
export const FILLER = new Set(
  `ok okay k kk okk okayy yeah yea yes yh ya yep yup nah nope oh ohh ah ahh uh um hmm mm lol lmao lmfao
  rofl omg wow haha hehe hihi xd xo xx xoxo eh ehn sha o na`.split(/\s+/),
);

const FILLER_PATTERNS = [/^(ha)+h?$/, /^(he)+h?$/, /^(lo)+l$/, /^h+m+$/, /^a+h+$/, /^o+h+$/, /^l+o+l+$/];

export function isFiller(word: string): boolean {
  return FILLER.has(word) || FILLER_PATTERNS.some((p) => p.test(word));
}

// Phrases that end on these are fragments ("i want to", "going to the").
// Object pronouns are fine endings ("i miss you", "call me", "i got it"), so they're not here.
export const BAD_PHRASE_END = new Set(
  `a an the and or but of to for with my your his her our their in at on is are was were am be that
  this by from as if so i i'm we they he she`.split(/\s+/),
);
export const BAD_PHRASE_START = new Set(['and', 'or', 'but', 'of']);

// Texting shorthand → standard English, so "omw" and "on my way" count as the same thing.
export const SLANG: Record<string, string> = {
  u: 'you', ur: 'your', urs: 'yours', r: 'are', y: 'why', n: 'and',
  im: "i'm", ive: "i've", dont: "don't", doesnt: "doesn't", didnt: "didn't", cant: "can't",
  wont: "won't", isnt: "isn't", wasnt: "wasn't", havent: "haven't", couldnt: "couldn't",
  shouldnt: "shouldn't", wouldnt: "wouldn't", thats: "that's", whats: "what's", youre: "you're",
  theyre: "they're", lets: "let's",
  wanna: 'want to', gonna: 'going to', gotta: 'got to', gimme: 'give me', lemme: 'let me',
  kinda: 'kind of', sorta: 'sort of', dunno: "don't know",
  pls: 'please', plz: 'please', pleasee: 'please', thx: 'thanks', thnx: 'thanks', tnx: 'thanks',
  ty: 'thank you', tysm: 'thank you so much', np: 'no problem',
  idk: "i don't know", idc: "i don't care", ikr: 'i know right', imo: 'in my opinion',
  tmr: 'tomorrow', tmrw: 'tomorrow', tmrow: 'tomorrow', '2moro': 'tomorrow', '2day': 'today',
  tdy: 'today', '2nite': 'tonight', tonite: 'tonight', b4: 'before', l8r: 'later', ltr: 'later',
  gn: 'good night', gm: 'good morning', nyt: 'night', mrng: 'morning', morn: 'morning',
  ily: 'i love you', ilysm: 'i love you so much', luv: 'love', ilu: 'i love you',
  bc: 'because', bcos: 'because', cos: 'because', coz: 'because', cuz: 'because', bcuz: 'because',
  msg: 'message', ppl: 'people', abt: 'about', rn: 'right now', atm: 'at the moment',
  wyd: 'what are you doing', hbu: 'how about you', wbu: 'what about you', hru: 'how are you',
  omw: 'on my way', ttyl: 'talk to you later', brb: 'be right back', gtg: 'got to go', g2g: 'got to go',
  nvm: 'never mind', jk: 'just kidding', tbh: 'to be honest', btw: 'by the way', asap: 'as soon as possible',
  wat: 'what', wht: 'what', hw: 'how', wen: 'when', wer: 'where', d: 'the', da: 'the', dat: 'that',
  dis: 'this', tho: 'though', thru: 'through', cud: 'could', shud: 'should',
  wud: 'would', gud: 'good', gd: 'good', nite: 'night', ok: 'okay',
};

// Capitalized mid-sentence like names, but worth learning.
export const NOT_NAMES = new Set(
  `monday tuesday wednesday thursday friday saturday sunday january february march april may june july
  august september october november december god english spanish christmas easter`.split(/\s+/),
);
