import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  userId: number;
  rol: "admin" | "taquilla";
  sedeId: number | null;
};

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET!);

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT({ ...p })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      userId: payload.userId as number,
      rol: payload.rol as "admin" | "taquilla",
      sedeId: (payload.sedeId as number | null) ?? null,
    };
  } catch {
    return null;
  }
}
