import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { strFromU8, unzipSync } from 'fflate';

/** An import problem with a message that can be shown to the user as-is. */
export class ChatFileError extends Error {}

const chatDir = new Directory(Paths.document, 'chat');
const chatFile = new File(chatDir, 'chat.txt');

// Zip files start with "PK\x03\x04".
const isZip = (bytes: Uint8Array) =>
  bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

/**
 * Lets the user pick a WhatsApp export and returns its text, or null if they cancelled.
 * iPhone exports arrive as a .zip with `_chat.txt` inside; Android exports are a plain .txt.
 */
export async function pickChatText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/plain', 'application/zip', 'application/x-zip-compressed', 'public.zip-archive'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;

  const picked = new File(result.assets[0].uri);
  const bytes = await picked.bytes();
  // The picker's cache copy isn't needed once read.
  try {
    picked.delete();
  } catch {}

  if (!isZip(bytes)) return strFromU8(bytes);

  const entries = unzipSync(bytes, { filter: (f) => f.name.toLowerCase().endsWith('.txt') });
  const names = Object.keys(entries);
  const name = names.find((n) => n.toLowerCase().endsWith('_chat.txt')) ?? names[0];
  if (!name) throw new ChatFileError("That zip doesn't contain a WhatsApp chat. Try exporting it again.");
  return strFromU8(entries[name]);
}

/** Keeps the chat in the app's private storage on this phone. It is never uploaded. */
export function saveChatLocally(text: string) {
  if (!chatDir.exists) chatDir.create();
  chatFile.write(text);
}

export function hasLocalChat(): boolean {
  return chatFile.exists;
}

export function deleteLocalChat() {
  if (chatFile.exists) chatFile.delete();
}
