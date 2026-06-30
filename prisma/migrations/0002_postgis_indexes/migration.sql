-- GIST indexes for PostGIS radius search (INFR-05: 10만 명 규모 2초 이내)
CREATE INDEX IF NOT EXISTS worker_profiles_location_gist
  ON worker_profiles USING GIST (location);
CREATE INDEX IF NOT EXISTS sos_requests_location_gist
  ON sos_requests USING GIST (location);

-- Composite indexes for filtered searches
CREATE INDEX IF NOT EXISTS worker_profiles_availability_idx
  ON worker_profiles (availability);
CREATE INDEX IF NOT EXISTS credentials_status_type_idx
  ON credentials (status, type);

-- Soft-delete query optimization (PIPA)
CREATE INDEX IF NOT EXISTS users_deleted_at_idx
  ON users ("deletedAt") WHERE "deletedAt" IS NULL;
