import { ConvexError } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * Standard HMAC SHA-256 using Web Crypto API in Convex environment
 */
export async function hashSessionToken(token: string): Promise<string> {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    throw new ConvexError("UNAUTHENTICATED: Session token is required");
  }

  const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || "citycare-session-token-secret-v1";
  
  if (globalThis.crypto?.subtle) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const tokenData = encoder.encode(token.trim());

    const cryptoKey = await globalThis.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await globalThis.crypto.subtle.sign("HMAC", cryptoKey, tokenData);
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  throw new ConvexError("UNAUTHENTICATED: Cryptographic runtime unavailable");
}

/**
 * Generates an unpredictable 256-bit secure session token
 */
export function generateSessionToken(): string {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    return (
      "citycare_sec_" +
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
  }

  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let str = "citycare_sec_";
  for (let i = 0; i < 64; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
}

/**
 * Resolves the authenticated user identity and database profile from a cryptographically
 * verified session token or trusted context.
 */
export async function resolveAuthenticatedUser(ctx: any, sessionToken?: string) {
  let userId: Id<"users"> | null = null;
  let session: any = null;

  // 1. Check Convex Identity (JWT/OIDC) if present
  const identity = await ctx.auth?.getUserIdentity?.();
  if (identity) {
    const identityEmail = identity.email?.toLowerCase();
    if (identityEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", identityEmail))
        .first();
      if (user) {
        userId = user._id;
      }
    }
  }

  // 2. Check cryptographic session token
  if (!userId) {
    if (!sessionToken || typeof sessionToken !== "string" || sessionToken.trim().length === 0) {
      throw new ConvexError("UNAUTHENTICATED: Authentication required: Missing session token");
    }

    const tokenHash = await hashSessionToken(sessionToken);

    session = await ctx.db
      .query("sessions")
      .withIndex("by_token_hash", (q: any) => q.eq("tokenHash", tokenHash))
      .first();

    if (!session) {
      throw new ConvexError("INVALID_SESSION: Invalid or unrecognized session token");
    }

    if (session.revokedAt) {
      throw new ConvexError("REVOKED_SESSION: Session has been logged out or revoked");
    }

    const now = Date.now();
    if (session.expiresAt <= now) {
      throw new ConvexError("EXPIRED_SESSION: Session has expired. Please sign in again.");
    }

    userId = session.userId;
  }

  if (!userId) {
    throw new ConvexError("UNAUTHENTICATED: Authentication required");
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new ConvexError("USER_NOT_FOUND: Authenticated user record does not exist");
  }

  if (user.accountStatus === "suspended" || user.accountStatus === "disabled") {
    throw new ConvexError("ACCOUNT_SUSPENDED: User account has been suspended");
  }

  // Fetch role-specific profile from trusted server DB
  let profile: any = null;
  const role = user.role;

  switch (role) {
    case "citizen":
      profile = await ctx.db
        .query("citizens")
        .withIndex("by_user", (q: any) => q.eq("userId", user._id))
        .first();
      break;
    case "unit_officer":
      profile = await ctx.db
        .query("unitOfficers")
        .withIndex("by_user", (q: any) => q.eq("userId", user._id))
        .first();
      break;
    case "field_officer":
      profile = await ctx.db
        .query("fieldOfficers")
        .withIndex("by_user", (q: any) => q.eq("userId", user._id))
        .first();
      break;
    case "city_admin":
      profile = await ctx.db
        .query("cityAdmins")
        .withIndex("by_user", (q: any) => q.eq("userId", user._id))
        .first();
      break;
    case "admin":
      profile = null;
      break;
    default:
      throw new ConvexError("INVALID_ROLE: Unrecognized user role");
  }

  return {
    user,
    session,
    profile,
    userId: user._id,
    role: user.role,
  };
}

export async function requireAuthenticatedUser(ctx: any, sessionToken?: string) {
  return await resolveAuthenticatedUser(ctx, sessionToken);
}

export async function requireCitizen(ctx: any, sessionToken?: string) {
  const auth = await resolveAuthenticatedUser(ctx, sessionToken);
  if (auth.role !== "citizen") {
    throw new ConvexError("FORBIDDEN: Citizen role required");
  }
  return auth;
}

export async function requireApprovedUnitOfficer(ctx: any, sessionToken?: string) {
  const auth = await resolveAuthenticatedUser(ctx, sessionToken);
  if (auth.role !== "unit_officer") {
    throw new ConvexError("FORBIDDEN: Unit Officer role required");
  }
  if (!auth.profile) {
    throw new ConvexError("PROFILE_NOT_FOUND: Unit Officer profile not found");
  }
  if (auth.profile.accountApproved !== true) {
    throw new ConvexError("ACCOUNT_NOT_APPROVED: Unit officer account has not been approved");
  }
  return auth;
}

export async function requireApprovedFieldOfficer(ctx: any, sessionToken?: string) {
  const auth = await resolveAuthenticatedUser(ctx, sessionToken);
  if (auth.role !== "field_officer") {
    throw new ConvexError("FORBIDDEN: Field Officer role required");
  }
  if (!auth.profile) {
    throw new ConvexError("PROFILE_NOT_FOUND: Field Officer profile not found");
  }
  if (auth.profile.accountApproved !== true) {
    throw new ConvexError("ACCOUNT_NOT_APPROVED: Field officer account has not been approved");
  }
  return auth;
}

export async function requireCityAdmin(ctx: any, sessionToken?: string) {
  const auth = await resolveAuthenticatedUser(ctx, sessionToken);
  if (auth.role !== "city_admin") {
    throw new ConvexError("FORBIDDEN: City Administrator role required");
  }
  return auth;
}

export async function requireSystemAdmin(ctx: any, sessionToken?: string) {
  const auth = await resolveAuthenticatedUser(ctx, sessionToken);
  if (auth.role !== "admin") {
    throw new ConvexError("FORBIDDEN: System Administrator privileges required");
  }
  return auth;
}

export async function requireAdminOrCityAdmin(ctx: any, sessionToken?: string) {
  const auth = await resolveAuthenticatedUser(ctx, sessionToken);
  if (auth.role !== "admin" && auth.role !== "city_admin") {
    throw new ConvexError("FORBIDDEN: Administrator privileges required");
  }
  return auth;
}

export function assertIdentityMatch(callerUserId: any, candidateUserId: any, message?: string) {
  if (candidateUserId && String(callerUserId) !== String(candidateUserId)) {
    throw new ConvexError(
      message || "FORBIDDEN: User ID discrepancy. You cannot act on behalf of another user."
    );
  }
}

export function assertIssueOwnership(issue: any, userId: any) {
  if (!issue) {
    throw new ConvexError("ISSUE_NOT_FOUND: Target issue does not exist");
  }
  if (String(issue.reportedBy) !== String(userId)) {
    throw new ConvexError("FORBIDDEN: You are not authorized to modify an issue reported by another user");
  }
}

export function assertFieldOfficerAssignment(issue: any, officerUserId: any) {
  if (!issue) {
    throw new ConvexError("ISSUE_NOT_FOUND: Target issue does not exist");
  }
  if (String(issue.assignedFieldOfficer) !== String(officerUserId)) {
    throw new ConvexError("FORBIDDEN: You are not assigned to work on this issue");
  }
}

export function assertCityScope(callerProfile: any, targetCity?: string, isSystemAdmin = false) {
  if (isSystemAdmin) return;
  const normCallerCity = (callerProfile?.city || "").trim().toLowerCase();
  const normTargetCity = (targetCity || "").trim().toLowerCase();
  if (!normCallerCity || normCallerCity !== normTargetCity) {
    throw new ConvexError("FORBIDDEN_JURISDICTION: Access denied for city outside authorized jurisdiction");
  }
}

export function assertDepartmentScope(callerProfile: any, targetDept?: string, isSystemAdmin = false) {
  if (isSystemAdmin) return;
  if (!targetDept) return;
  const normCallerDept = (callerProfile?.department || "").trim().toLowerCase();
  const normTargetDept = (targetDept || "").trim().toLowerCase();
  if (!normCallerDept || normCallerDept !== normTargetDept) {
    throw new ConvexError("FORBIDDEN_DEPARTMENT: Access denied for department outside authorized jurisdiction");
  }
}

export async function validateStoredMedia(
  ctx: any,
  storageId: Id<"_storage">,
  options: { allowDelete?: boolean } = { allowDelete: true }
) {
  if (!storageId) {
    throw new ConvexError("INVALID_MEDIA: Storage ID is required");
  }

  const meta = await ctx.db.system.get(storageId);
  if (!meta) {
    throw new ConvexError("MEDIA_NOT_FOUND: Stored file does not exist");
  }

  const contentType = (meta.contentType || "").toLowerCase();
  const size = meta.size || 0;

  const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "image/gif",
    "application/pdf",
  ];

  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    if (options.allowDelete && ctx.storage && typeof ctx.storage.delete === "function") {
      try {
        await ctx.storage.delete(storageId);
      } catch (e) {
        // Safe catch
      }
    }
    throw new ConvexError(
      "INVALID_FILE_TYPE: Unsupported file MIME type " + contentType + ". Allowed types: JPEG, PNG, WebP, HEIC, GIF, PDF."
    );
  }

  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
  if (size > MAX_FILE_SIZE) {
    if (options.allowDelete && ctx.storage && typeof ctx.storage.delete === "function") {
      try {
        await ctx.storage.delete(storageId);
      } catch (e) {
        // Safe catch
      }
    }
    throw new ConvexError(
      "FILE_TOO_LARGE: File size exceeds the maximum limit of 15MB."
    );
  }

  return {
    storageId,
    contentType,
    size,
    sha256: meta.sha256,
  };
}
