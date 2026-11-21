import { compare, hash } from "bcryptjs";

const BCRYPT_COST = 12;

export const passwordHasher = {
  hash(password: string) {
    return hash(password, BCRYPT_COST);
  },
  verify(password: string, passwordHash: string) {
    return compare(password, passwordHash);
  },
};
