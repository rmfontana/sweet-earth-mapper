# Brix Monitoring Database Schema Review

## Current Schema Analysis

### ✅ Strengths

1. **Normalized Design**: Proper separation of concerns with reference tables (crops, locations, stores, brands)
2. **UUID Primary Keys**: Good for distributed systems and security
3. **Proper Foreign Key Relationships**: Maintains data integrity
4. **Audit Columns**: Timestamps for tracking data creation
5. **Data Validation**: Check constraints on brix_value (0-100 range)
6. **Row Level Security**: Implemented for data access control

### ⚠️ Issues Fixed

1. **Recursive RLS Policies**: Fixed infinite recursion in admin role checks
2. **JWT-based Admin Checks**: Now uses `auth.jwt()` instead of querying users table

### 🔄 Current Schema Structure

```sql
-- Core Tables
├── auth.users (Supabase managed)
├── users (profile extension)
├── crops (reference data)
├── locations (reference data)  
├── stores (reference data)
├── brands (reference data)
└── submissions (main data)

-- Key Relationships
submissions.user_id → users.id
submissions.crop_id → crops.id
submissions.location_id → locations.id
submissions.store_id → stores.id (optional)
submissions.brand_id → brands.id (optional)
```

## Future Extensibility Recommendations

### 1. Gamification & Trust System

**Current State**: Basic points system in users table
**Recommended Enhancements**:

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN trust_level int default 1 check (trust_level between 1 and 5);
ALTER TABLE users ADD COLUMN badges jsonb default '[]';
ALTER TABLE users ADD COLUMN streak_days int default 0;

-- New achievements table
CREATE TABLE achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text,
  points_required int,
  badge_color text,
  created_at timestamptz default now()
);

-- User achievements junction table
CREATE TABLE user_achievements (
  user_id uuid references users(id) on delete cascade,
  achievement_id uuid references achievements(id) on delete cascade,
  earned_at timestamptz default now(),
  primary key (user_id, achievement_id)
);
```

### 2. Enhanced Verification System

**Current State**: Simple boolean verified flag
**Recommended Enhancements**:

```sql
-- Add verification tracking
ALTER TABLE submissions ADD COLUMN verified_by uuid references users(id);
ALTER TABLE submissions ADD COLUMN verified_at timestamptz;
ALTER TABLE submissions ADD COLUMN verification_notes text;
ALTER TABLE submissions ADD COLUMN confidence_score numeric(3,2) check (confidence_score between 0 and 1);

-- Verification history table
CREATE TABLE verification_history (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  verifier_id uuid references users(id),
  action text check (action in ('verify', 'reject', 'flag')),
  notes text,
  created_at timestamptz default now()
);
```

### 3. Enhanced Location System

**Current State**: Basic location with lat/lng
**Recommended Enhancements**:

```sql
-- Add location hierarchy and metadata
ALTER TABLE locations ADD COLUMN location_type text check (location_type in ('market', 'store', 'farm', 'home'));
ALTER TABLE locations ADD COLUMN parent_location_id uuid references locations(id);
ALTER TABLE locations ADD COLUMN address text;
ALTER TABLE locations ADD COLUMN postal_code text;
ALTER TABLE locations ADD COLUMN timezone text;
ALTER TABLE locations ADD COLUMN is_verified boolean default false;

-- Location ratings/reviews
CREATE TABLE location_reviews (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  rating int check (rating between 1 and 5),
  review_text text,
  created_at timestamptz default now()
);
```

### 4. Submission Enhancements

**Current State**: Basic brix measurement
**Recommended Enhancements**:

```sql
-- Add measurement metadata
ALTER TABLE submissions ADD COLUMN measurement_method text check (measurement_method in ('refractometer', 'hydrometer', 'digital', 'other'));
ALTER TABLE submissions ADD COLUMN temperature_celsius numeric(4,1);
ALTER TABLE submissions ADD COLUMN humidity_percent numeric(3,1);
ALTER TABLE submissions ADD COLUMN sample_size text;
ALTER TABLE submissions ADD COLUMN notes text;
ALTER TABLE submissions ADD COLUMN photo_urls text[];
ALTER TABLE submissions ADD COLUMN weather_conditions jsonb;

-- Measurement device tracking
CREATE TABLE measurement_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  device_name text not null,
  device_type text not null,
  calibration_date timestamptz,
  accuracy_rating numeric(3,2),
  created_at timestamptz default now()
);

ALTER TABLE submissions ADD COLUMN device_id uuid references measurement_devices(id);
```

### 5. Data Quality & Outlier Detection

**Current State**: Basic outliers view
**Recommended Enhancements**:

```sql
-- Quality flags
CREATE TABLE data_quality_flags (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  flag_type text check (flag_type in ('outlier', 'suspicious', 'needs_review', 'duplicate')),
  flag_reason text,
  flagged_by uuid references users(id),
  resolved boolean default false,
  resolved_by uuid references users(id),
  created_at timestamptz default now()
);

-- Statistical tracking
CREATE TABLE crop_statistics (
  id uuid primary key default gen_random_uuid(),
  crop_id uuid references crops(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  season text,
  year int,
  avg_brix numeric(5,2),
  min_brix numeric(5,2),
  max_brix numeric(5,2),
  std_dev numeric(5,2),
  sample_count int,
  last_updated timestamptz default now()
);
```

### 6. Community Features

```sql
-- User following system
CREATE TABLE user_follows (
  follower_id uuid references users(id) on delete cascade,
  following_id uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- Comments on submissions
CREATE TABLE submission_comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  comment_text text not null,
  parent_comment_id uuid references submission_comments(id),
  created_at timestamptz default now()
);

-- Submission likes/reactions
CREATE TABLE submission_reactions (
  submission_id uuid references submissions(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  reaction_type text check (reaction_type in ('like', 'helpful', 'question', 'flag')),
  created_at timestamptz default now(),
  primary key (submission_id, user_id, reaction_type)
);
```

## Performance Optimization Recommendations

### Indexes to Add

```sql
-- Performance indexes
CREATE INDEX idx_submissions_location_crop ON submissions(location_id, crop_id);
CREATE INDEX idx_submissions_verified_timestamp ON submissions(verified, timestamp DESC);
CREATE INDEX idx_submissions_user_timestamp ON submissions(user_id, timestamp DESC);
CREATE INDEX idx_submissions_brix_range ON submissions(brix_value) WHERE verified = true;
CREATE INDEX idx_locations_coordinates ON locations USING GIST(point(longitude, latitude));

-- Full-text search indexes
CREATE INDEX idx_crops_name_search ON crops USING GIN(to_tsvector('english', name));
CREATE INDEX idx_locations_name_search ON locations USING GIN(to_tsvector('english', name));
```

### Materialized Views for Analytics

```sql
-- Daily statistics
CREATE MATERIALIZED VIEW daily_submission_stats AS
SELECT 
  date_trunc('day', timestamp) as date,
  crop_id,
  location_id,
  count(*) as submission_count,
  avg(brix_value) as avg_brix,
  min(brix_value) as min_brix,
  max(brix_value) as max_brix
FROM submissions 
WHERE verified = true
GROUP BY date_trunc('day', timestamp), crop_id, location_id;

-- User leaderboard
CREATE MATERIALIZED VIEW user_leaderboard AS
SELECT 
  u.id,
  u.display_name,
  u.points,
  u.submission_count,
  count(s.id) filter (where s.verified = true) as verified_submissions,
  avg(s.brix_value) as avg_brix_submitted
FROM users u
LEFT JOIN submissions s ON u.id = s.user_id
GROUP BY u.id, u.display_name, u.points, u.submission_count
ORDER BY u.points DESC;
```

## Security Enhancements

### Additional RLS Policies

```sql
-- Location-based access control
CREATE POLICY "Users can only see public locations or their own submissions' locations"
  ON locations FOR SELECT
  USING (
    is_public = true 
    OR EXISTS (
      SELECT 1 FROM submissions s 
      WHERE s.location_id = locations.id 
      AND s.user_id = auth.uid()
    )
  );

-- Rate limiting for submissions
CREATE OR REPLACE FUNCTION check_submission_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) 
    FROM submissions 
    WHERE user_id = NEW.user_id 
    AND timestamp > now() - interval '1 hour'
  ) >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded: Maximum 10 submissions per hour';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER submission_rate_limit
  BEFORE INSERT ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION check_submission_rate_limit();
```

## Migration Strategy

### Phase 1: Core Fixes (Immediate)
- [x] Fix recursive RLS policies
- [x] Add comprehensive test suite
- [x] Add seed data

### Phase 2: Enhanced Verification (Next Sprint)
- [ ] Add verification tracking columns
- [ ] Implement confidence scoring
- [ ] Add verification history

### Phase 3: Gamification (Future Sprint)
- [ ] Add achievements system
- [ ] Implement trust levels
- [ ] Add user badges

### Phase 4: Community Features (Future)
- [ ] Add commenting system
- [ ] Implement user following
- [ ] Add reaction system

## Trade-offs Analysis

### Prototype vs Production Considerations

**Current Prototype Shortcuts**:
1. ✅ Simple boolean verification (good for MVP)
2. ✅ Basic user roles (sufficient for prototype)
3. ✅ Minimal location data (adequate for testing)

**Production Readiness Gaps**:
1. ⚠️ No audit logging for admin actions
2. ⚠️ Limited data validation rules
3. ⚠️ No backup/recovery procedures
4. ⚠️ No monitoring/alerting setup

**Recommended Approach**:
- Keep current simple structure for prototype phase
- Plan incremental migrations for production features
- Maintain backward compatibility during transitions
- Use feature flags for gradual rollouts

## Code Quality Score

### Current Schema: B+ (Good for Prototype)

**Strengths** (85/100):
- ✅ Proper normalization (20/20)
- ✅ Data integrity (18/20)
- ✅ Security implementation (15/20)
- ✅ Extensibility planning (16/20)
- ✅ Documentation (16/20)

**Areas for Improvement**:
- Performance optimization (indexes)
- Advanced validation rules
- Comprehensive audit logging
- Automated testing coverage

This schema provides a solid foundation for your Brix monitoring prototype while maintaining clear paths for production scaling.
