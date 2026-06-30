-- Add CHECK constraint to enforce valid rating scores (1-5, FR30)
-- Prisma does not support CHECK constraints natively; this is applied
-- as a raw migration to prevent invalid scores corrupting averageRating
-- aggregations and the FR31 display.
ALTER TABLE "ratings"
  ADD CONSTRAINT "ratings_score_check" CHECK (score >= 1 AND score <= 5);
