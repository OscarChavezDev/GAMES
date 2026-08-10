import { customAlphabet, nanoid } from "nanoid";

// No 0/O/1/I/l — avoids visually ambiguous room codes when people read them
// out loud or type them from a screenshot.
const ROOM_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const generateRoomId = customAlphabet(ROOM_ALPHABET, 8);

export function createRoomId(): string {
  return generateRoomId();
}

export function createParticipantId(): string {
  return nanoid(12);
}
