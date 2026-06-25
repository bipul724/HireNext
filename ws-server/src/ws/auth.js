import { supabase } from "../config/supabase.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

// Raw ws has no handshake.auth like Socket.IO. The client passes credentials
// as query params on the ws URL:
//   wss://host/?token=<jwt>&interviewId=<id>&role=<candidate|interviewer>
//
// Returns { ok: true, user, interviewId, role } or { ok: false, code, reason }.
export async function authenticateUpgrade(request) {
  try {
    // Origin check (defense in depth; browsers send Origin on ws upgrades).
    const origin = request.headers.origin;
    if (origin) {
      // Normalize allowed origins by removing trailing slashes
      const allowedOrigins = env.CLIENT_ORIGINS.map(o => o.replace(/\/$/, ""));
      if (!allowedOrigins.includes(origin)) {
        return { ok: false, code: 4403, reason: "Forbidden origin" };
      }
    }

    const url = new URL(request.url, "http://localhost");
    const token = url.searchParams.get("token");
    const interviewId = url.searchParams.get("interviewId");
    const roleParam = url.searchParams.get("role");

    if (!token) return { ok: false, code: 4401, reason: "Missing token" };
    if (!interviewId) return { ok: false, code: 4400, reason: "Missing interviewId" };
    if (!roleParam) return { ok: false, code: 4400, reason: "Missing role" };

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return { ok: false, code: 4401, reason: "Invalid token" };
    }

    const userEmail = authData.user.email;

    // Phase 3B: Strict Interview Membership Validation
    const { data: interview, error: dbError } = await supabase
      .from("Interviews")
      .select("userEmail, candidateEmail")
      .eq("interview_id", interviewId)
      .single();

    if (dbError || !interview) {
      logger.warn(`[AUTH] INTERVIEW_NOT_FOUND: User ${userEmail} attempted to join non-existent interview ${interviewId}`);
      return { ok: false, code: 4404, reason: "Interview not found" };
    }

    // Role spoofing & membership validation
    let isAuthorized = false;

    if (roleParam === "interviewer") {
      isAuthorized = (userEmail === interview.userEmail);
    } else if (roleParam === "candidate") {
      // Strict 1-to-1 matching as enforced by the frontend UI
      isAuthorized = (userEmail === interview.candidateEmail);
    }

    if (!isAuthorized) {
      logger.warn(`[AUTH] UNAUTHORIZED: User ${userEmail} denied access to interview ${interviewId} as ${roleParam}`);
      return { ok: false, code: 4403, reason: "Unauthorized for this role/interview" };
    }

    logger.info(`[AUTH] AUTHORIZED: User ${userEmail} joining interview ${interviewId} as ${roleParam}`);

    return {
      ok: true,
      user: { id: authData.user.id, email: userEmail },
      interviewId,
      role: roleParam,
    };
  } catch (err) {
    logger.error(`[AUTH] Auth error: ${err.message}`);
    return { ok: false, code: 4401, reason: "Auth error" };
  }
}
