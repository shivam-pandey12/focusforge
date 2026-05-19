import { getAdminAuth, ServerSetupError } from "@/lib/firebase/admin";

export interface VerifiedRequestUser {
  uid: string;
  email?: string;
}

export class RequestAuthError extends Error {
  status: number;

  constructor(message = "Login is required.", status = 401) {
    super(message);
    this.name = "RequestAuthError";
    this.status = status;
  }
}

function getBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";

  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

export async function verifyOptionalRequestUser(request: Request): Promise<VerifiedRequestUser | null> {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);

    return {
      uid: decoded.uid,
      email: typeof decoded.email === "string" ? decoded.email : undefined
    };
  } catch (error) {
    if (error instanceof ServerSetupError) {
      throw error;
    }

    return null;
  }
}

export async function verifyRequiredRequestUser(request: Request): Promise<VerifiedRequestUser> {
  const user = await verifyOptionalRequestUser(request);

  if (!user) {
    throw new RequestAuthError("Your session expired. Please login again.");
  }

  return user;
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function verifyAdminRequestUser(request: Request): Promise<VerifiedRequestUser> {
  const user = await verifyRequiredRequestUser(request);
  const adminEmails = getAdminEmails();

  if (!adminEmails.length) {
    throw new RequestAuthError("Admin access is not configured. Add ADMIN_EMAILS on the server.", 403);
  }

  if (!user.email || !adminEmails.includes(user.email.toLowerCase())) {
    throw new RequestAuthError("Admin access is restricted.", 403);
  }

  return user;
}
