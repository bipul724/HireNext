-- Draft RPC for Analytics KPI aggregation.
-- Moves the aggregation currently done in JS (app/api/analytics/kpis/route.js)
-- into Postgres, so the DB does the GROUP BY / AVG work instead of shipping
-- every interview-feedback row to Node on every page load.
--
-- NOT YET APPLIED. Run this in the Supabase SQL editor, verify the output
-- against a real user's data (compare against the current /api/analytics/kpis
-- response for the same user), then swap the route handler to call it
-- (see kpis-route.rpc-example.js for the wiring).
--
-- Mirrors the exact aggregation logic currently in kpis/route.js, including
-- the same typo-tolerant field fallbacks (technicalSkills/techicalSkills,
-- experience/experince) and the same recommendation string matching.

create or replace function get_analytics_kpis(p_user_email text)
returns jsonb
language plpgsql
stable
as $$
declare
  result jsonb;
begin
  with feedback_rows as (
    select
      f.id,
      coalesce(i."jobPosition", 'General Role') as role,
      coalesce(f.feedback->'feedback'->'rating', f.feedback->'rating') as rating,
      lower(coalesce(
        f.feedback->'feedback'->>'recommendation',
        f.feedback->'feedback'->>'Recommendation',
        f.feedback->>'recommendation',
        f.feedback->>'Recommendation',
        ''
      )) as rec_raw
    from "interview-feedback" f
    join "Interviews" i on i.interview_id = f.interview_id
    where i."userEmail" = p_user_email
  ),
  scored as (
    select
      role,
      rating,
      coalesce((rating->>'technicalSkills')::numeric, (rating->>'techicalSkills')::numeric, 0) as tech,
      coalesce((rating->>'communication')::numeric, 0) as comm,
      coalesce((rating->>'problemSolving')::numeric, 0) as ps,
      coalesce((rating->>'experience')::numeric, (rating->>'experince')::numeric, 0) as exp,
      (
        (rec_raw like '%yes%' or rec_raw like '%hire%' or rec_raw like '%recommend%' or rec_raw like '%maybe%')
        and rec_raw not like '%not%' and rec_raw not like '%no hire%'
      ) as is_rec
    from feedback_rows
  ),
  scored2 as (
    select
      role,
      rating,
      tech, comm, ps, exp, is_rec,
      case when rating is not null then (tech + comm + ps + exp) / 4.0 else 0 end as score
    from scored
  ),
  role_agg as (
    select
      role,
      count(*) as cnt,
      round(avg(score), 2) as avg_score,
      round((count(*) filter (where is_rec))::numeric / greatest(count(*), 1) * 100) as hire_rate
    from scored2
    group by role
  )
  select jsonb_build_object(
    'totalInterviews', (select count(*) from "Interviews" where "userEmail" = p_user_email),
    'totalCandidates', (select count(*) from scored2),
    'totalPositions', (select count(distinct role) from scored2),
    'avgRating', coalesce((select round(avg(score), 2) from scored2 where rating is not null), 0),
    'topScore', coalesce((select round(max(score), 2) from scored2 where rating is not null), 0),
    'hireRate', case when (select count(*) from scored2) > 0
                 then round((select count(*) from scored2 where is_rec)::numeric / (select count(*) from scored2) * 100)
                 else 0 end,
    'recommendedCount', (select count(*) from scored2 where is_rec),
    'skillsPerformance', jsonb_build_object(
      'technicalSkills', coalesce((select round(avg(tech), 2) from scored2 where rating is not null), 0),
      'communication', coalesce((select round(avg(comm), 2) from scored2 where rating is not null), 0),
      'problemSolving', coalesce((select round(avg(ps), 2) from scored2 where rating is not null), 0),
      'experience', coalesce((select round(avg(exp), 2) from scored2 where rating is not null), 0)
    ),
    'rolePerformance', coalesce((
      select jsonb_agg(jsonb_build_object(
        'role', role, 'count', cnt, 'avgScore', avg_score, 'hireRate', hire_rate
      ))
      from role_agg
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- Recommended supporting indexes (see report section 3 "Indexes" — presence
-- unconfirmed from the repo, verify with EXPLAIN ANALYZE before/after):
-- create index if not exists idx_interviews_useremail on "Interviews" ("userEmail");
-- create index if not exists idx_feedback_interview_id on "interview-feedback" (interview_id);
-- create index if not exists idx_feedback_created_id on "interview-feedback" (created_at desc, id desc);
