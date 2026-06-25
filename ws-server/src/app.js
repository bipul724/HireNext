import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { supabase } from "./config/supabase.js";
import { logger } from "./utils/logger.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CLIENT_ORIGINS, credentials: true }));
  app.use(express.json());

  app.get("/health", async (_req, res) => {
    try {
      // Import here to avoid circular dep issues if any, or just import at top
      const { redisClient } = await import("./config/redis.js");
      await redisClient.ping();
      const memUsage = process.memoryUsage();
      res.status(200).json({ 
        status: "ok", 
        uptime: process.uptime(),
        redis: "connected",
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        },
        version: "1.0.0"
      });
    } catch (error) {
      logger.error("Health check failed:", error.message);
      res.status(503).json({ status: "degraded", error: error.message });
    }
  });

  // Middleware to authenticate REST requests via Bearer token
  const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Missing Bearer token" });
    }
    const token = authHeader.split(' ')[1];
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = authData.user;
    next();
  };

  // Timeline API
  app.get("/api/interviews/:id/timeline", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const userEmail = req.user.email;

    // Phase 6 Security: check if interviewer or candidate (though candidate can view their own timeline, or maybe just interviewer? The prompt says: "only authorized interviewer can access analytics. candidate cannot access another interview's analytics.")
    // Let's verify interview membership.
    const { data: interview, error: dbError } = await supabase
      .from("Interviews")
      .select("userEmail, candidateEmail")
      .eq("interview_id", id)
      .single();

    if (dbError || !interview) {
      return res.status(404).json({ error: "Interview not found" });
    }

    // Strict check: Only allow interviewer or this specific candidate
    if (userEmail !== interview.userEmail && userEmail !== interview.candidateEmail) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { data: events, error } = await supabase
      .from("InterviewEvents")
      .select("createdAt, eventType, userEmail, userRole, metadata")
      .eq("interviewId", id)
      .order("createdAt", { ascending: true });

    if (error) {
      logger.error(`Error fetching timeline for ${id}:`, error.message);
      // Fallback if table doesn't exist yet so it doesn't crash the frontend completely
      if (error.code === '42P01') {
         return res.status(200).json([]);
      }
      return res.status(500).json({ error: "Failed to fetch timeline" });
    }

    // Map to expected format
    const timeline = events.map(e => ({
      timestamp: e.createdAt,
      eventType: e.eventType,
      userEmail: e.userEmail,
      userRole: e.userRole,
      metadata: e.metadata
    }));

    res.status(200).json(timeline);
  });

    // Code Retrieval API (for persistent saving at end of interview)
    app.get("/api/interviews/:id/code", authenticateUser, async (req, res) => {
      const { id } = req.params;
      const userEmail = req.user.email;

      const { data: interview, error: dbError } = await supabase
        .from("Interviews")
        .select("userEmail, candidateEmail")
        .eq("interview_id", id)
        .single();

      if (dbError || !interview) {
        return res.status(404).json({ error: "Interview not found" });
      }

      if (userEmail !== interview.userEmail && userEmail !== interview.candidateEmail) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      try {
        const { getRoomDoc } = await import("./rooms/roomState.js");
        const doc = await getRoomDoc(id);
        res.status(200).json(doc);
      } catch (error) {
        logger.error(`Error fetching code for ${id}:`, error.message);
        res.status(500).json({ error: "Failed to fetch code from Redis" });
      }
    });

  // Analytics API
  app.get("/api/interviews/:id/analytics", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const userEmail = req.user.email;

    const { data: interview, error: dbError } = await supabase
      .from("Interviews")
      .select("userEmail")
      .eq("interview_id", id)
      .single();

    if (dbError || !interview) {
      return res.status(404).json({ error: "Interview not found" });
    }

    // Security check: ONLY interviewer can access analytics
    if (userEmail !== interview.userEmail) {
      return res.status(403).json({ error: "Only the interviewer can access analytics" });
    }

    const { data: events, error } = await supabase
      .from("InterviewEvents")
      .select("*")
      .eq("interviewId", id)
      .order("createdAt", { ascending: true });

    if (error) {
      logger.error(`Error fetching analytics for ${id}:`, error.message);
      if (error.code === '42P01') {
         return res.status(200).json({
           duration: 0, executionCount: 0, successfulRuns: 0, failedRuns: 0,
           languageChanges: 0, lockCount: 0, participants: []
         });
      }
      return res.status(500).json({ error: "Failed to fetch analytics" });
    }

    let duration = 0;
    let executionCount = 0;
    let successfulRuns = 0;
    let failedRuns = 0;
    let languageChanges = 0;
    let lockCount = 0;
    const participants = new Set();
    
    let startedAt = null;

    events.forEach(e => {
      participants.add(e.userEmail);
      
      if (e.eventType === 'Interview Started' || e.eventType === 'Interview Resumed') {
        if (!startedAt) startedAt = new Date(e.createdAt).getTime();
      } else if (e.eventType === 'Interview Paused' || e.eventType === 'Interview Ended') {
        if (startedAt) {
          duration += (new Date(e.createdAt).getTime() - startedAt);
          startedAt = null;
        }
      } else if (e.eventType === 'Code Execution Started') {
        executionCount++;
      } else if (e.eventType === 'Code Execution Succeeded') {
        successfulRuns++;
      } else if (e.eventType === 'Code Execution Failed') {
        failedRuns++;
      } else if (e.eventType === 'Language Changed') {
        languageChanges++;
      } else if (e.eventType === 'Editor Locked') {
        lockCount++;
      }
    });

    if (startedAt && events.length > 0) {
      const lastEventTimestamp = new Date(events[events.length - 1].createdAt).getTime();
      if (lastEventTimestamp > startedAt) {
        duration += (lastEventTimestamp - startedAt);
      }
    }

    res.status(200).json({
      duration: Math.floor(duration / 1000), // in seconds
      executionCount,
      successfulRuns,
      failedRuns,
      languageChanges,
      lockCount,
      participants: Array.from(participants)
    });
  });

  return app;
}
