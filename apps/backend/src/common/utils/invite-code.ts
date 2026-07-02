import { randomInt } from "crypto";

export function makeInviteCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
