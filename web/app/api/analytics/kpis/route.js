import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth/verify-user";

export async function GET(req) {
    try {
        const { user, email, supabase, error: authError } = await verifyUser(req);

        if (authError?.type === "missing_token") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (authError?.type === "invalid_token") {
            return NextResponse.json({ error: "Unauthorized or invalid session" }, { status: 401 });
        }

        // ── Fetch interviews with joined feedback ──
        const { data: interviews, error: intError } = await supabase
            .from("Interviews")
            .select("interview_id,jobPosition,type,created_at,interview-feedback(*)")
            .eq("userEmail", email);

        if (intError) {
            console.error("Supabase interviews query error:", intError);
            return NextResponse.json({ error: intError.message }, { status: 500 });
        }

        // ── Flatten feedback rows ──
        const allFeedback = [];
        (interviews || []).forEach((iv) =>
            (iv["interview-feedback"] || []).forEach((f) =>
                allFeedback.push({ ...f, interview: { jobPosition: iv.jobPosition, type: iv.type } })
            )
        );

        // ── Aggregate KPIs ──
        let totalRating = 0, ratingCount = 0, recommendedCount = 0, maxScore = 0;
        const skillTotals = { technicalSkills: 0, communication: 0, problemSolving: 0, experience: 0 };
        const roleMap = {};

        allFeedback.forEach((fb) => {
            const nested = fb.feedback?.feedback ?? fb.feedback;
            const rating = nested?.rating;

            let score = 0;
            if (rating) {
                const tech = rating.technicalSkills ?? rating.techicalSkills ?? 0;
                const exp = rating.experience ?? rating.experince ?? 0;
                const comm = rating.communication ?? 0;
                const ps = rating.problemSolving ?? 0;
                score = (tech + comm + ps + exp) / 4;
                totalRating += score;
                ratingCount++;
                if (score > maxScore) maxScore = score;

                skillTotals.technicalSkills += tech;
                skillTotals.communication += comm;
                skillTotals.problemSolving += ps;
                skillTotals.experience += exp;
            }

            const recRaw = (nested?.recommendation || nested?.Recommendation || "").toLowerCase();
            const isRec =
                (recRaw.includes("yes") || recRaw.includes("hire") || recRaw.includes("recommend") || recRaw.includes("maybe")) &&
                !recRaw.includes("not") &&
                !recRaw.includes("no hire");
            if (isRec) recommendedCount++;

            const role = fb.interview?.jobPosition || "General Role";
            if (!roleMap[role]) roleMap[role] = { role, count: 0, totalScore: 0, recs: 0 };
            roleMap[role].count++;
            roleMap[role].totalScore += score;
            if (isRec) roleMap[role].recs++;
        });

        const totalCandidates = allFeedback.length;
        const totalPositions = new Set((interviews || []).map((i) => i.jobPosition)).size;

        // ── Skills averages ──
        const skillsPerformance = ratingCount > 0
            ? {
                technicalSkills: +(skillTotals.technicalSkills / ratingCount).toFixed(2),
                communication: +(skillTotals.communication / ratingCount).toFixed(2),
                problemSolving: +(skillTotals.problemSolving / ratingCount).toFixed(2),
                experience: +(skillTotals.experience / ratingCount).toFixed(2),
            }
            : { technicalSkills: 0, communication: 0, problemSolving: 0, experience: 0 };

        // ── Role performance array ──
        const rolePerformance = Object.values(roleMap).map((r) => ({
            role: r.role,
            count: r.count,
            avgScore: r.count > 0 ? +((r.totalScore / r.count).toFixed(2)) : 0,
            hireRate: r.count > 0 ? Math.round((r.recs / r.count) * 100) : 0,
        }));

        // ── Most recent interview ──
        const sorted = (interviews || []).slice().sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        const recentInterview = sorted[0]
            ? { jobPosition: sorted[0].jobPosition, type: sorted[0].type, created_at: sorted[0].created_at }
            : null;

        return NextResponse.json({
            totalInterviews: (interviews || []).length,
            totalCandidates,
            totalPositions,
            avgRating: ratingCount > 0 ? +(totalRating / ratingCount).toFixed(2) : 0,
            topScore: maxScore > 0 ? +maxScore.toFixed(2) : 0,
            hireRate: totalCandidates > 0 ? Math.round((recommendedCount / totalCandidates) * 100) : 0,
            recommendedCount,
            skillsPerformance,
            rolePerformance,
            recentInterview,
        });
    } catch (err) {
        console.error("Unexpected error in KPI route:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
