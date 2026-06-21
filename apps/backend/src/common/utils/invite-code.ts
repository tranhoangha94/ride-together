import { randomBytes } from "crypto";

export function makeInviteCode(prefix: string) {
  return `${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;
}
