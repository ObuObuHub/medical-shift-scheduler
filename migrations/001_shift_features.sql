-- Migration: Add shift swapping, reservation, and hospital-specific shift logic features
-- Date: 2025-06-26

-- 1. Update shifts table to add status and reservation fields
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'reserved', 'confirmed', 'swap_requested')),
ADD COLUMN IF NOT EXISTS reserved_by INTEGER REFERENCES staff(id),
ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS swap_request_id INTEGER;

-- 2. Create shift swap requests table
CREATE TABLE IF NOT EXISTS shift_swap_requests (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL REFERENCES staff(id),
    target_staff_id INTEGER REFERENCES staff(id), -- Optional: specific person they want to swap with
    shift_id VARCHAR(255) NOT NULL,
    shift_date DATE NOT NULL,
    shift_type JSONB NOT NULL,
    requested_shift_id VARCHAR(255),
    requested_shift_date DATE,
    requested_shift_type JSONB,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    reviewed_by INTEGER REFERENCES staff(id),
    reviewed_at TIMESTAMP,
    review_comment TEXT,
    hospital VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create hospital shift configuration table
CREATE TABLE IF NOT EXISTS hospital_shift_config (
    id SERIAL PRIMARY KEY,
    hospital_id VARCHAR(255) NOT NULL REFERENCES hospitals(hospital_id),
    shift_pattern VARCHAR(50) NOT NULL, -- 'standard_12_24', 'only_24', 'custom'
    weekday_shifts JSONB, -- Array of shift types for weekdays
    weekend_shifts JSONB, -- Array of shift types for weekends
    holiday_shifts JSONB, -- Array of shift types for holidays
    min_staff_per_shift INTEGER DEFAULT 1,
    max_consecutive_nights INTEGER DEFAULT 1,
    max_shifts_per_month INTEGER DEFAULT 10,
    shift_types JSONB, -- Hospital-specific shift types (overrides defaults)
    rules JSONB, -- Additional hospital-specific rules
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hospital_id)
);

-- 4. Create shift preferences table for staff
CREATE TABLE IF NOT EXISTS staff_shift_preferences (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL REFERENCES staff(id),
    preferred_shift_types JSONB, -- Array of preferred shift type IDs
    avoided_shift_types JSONB, -- Array of shift types to avoid
    preferred_days JSONB, -- Array of preferred days of week
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id)
);

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_reserved_by ON shifts(reserved_by);
CREATE INDEX IF NOT EXISTS idx_swap_requests_requester ON shift_swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_status ON shift_swap_requests(status);
CREATE INDEX IF NOT EXISTS idx_swap_requests_hospital ON shift_swap_requests(hospital);

-- 6. Insert default hospital configurations
INSERT INTO hospital_shift_config (hospital_id, shift_pattern, weekday_shifts, weekend_shifts, holiday_shifts, min_staff_per_shift, max_consecutive_nights, max_shifts_per_month, shift_types, rules)
VALUES 
-- Spitalul Județean de Urgență Piatra-Neamț: 12h and 24h shifts
('spital1', 'standard_12_24', 
 '["NOAPTE"]'::jsonb, -- Weekdays: night shifts only
 '["GARDA_ZI", "NOAPTE", "GARDA_24"]'::jsonb, -- Weekends: day, night, or 24h
 '["GARDA_24"]'::jsonb, -- Holidays: 24h shifts
 1, 1, 10,
 '{
   "GARDA_ZI": {"id": "GARDA_ZI", "name": "Gardă Zi", "start": "08:00", "end": "20:00", "color": "#3B82F6", "duration": 12},
   "NOAPTE": {"id": "NOAPTE", "name": "Noapte", "start": "20:00", "end": "08:00", "color": "#7C3AED", "duration": 12},
   "GARDA_24": {"id": "GARDA_24", "name": "Gardă 24h", "start": "08:00", "end": "08:00", "color": "#10B981", "duration": 24}
 }'::jsonb,
 '{"allow_consecutive_weekends": false, "min_rest_hours": 12}'::jsonb
),
-- Spitalul "Prof. Dr. Eduard Apetrei" Buhuși: 24h shifts only
('spital2', 'only_24',
 '["GARDA_24"]'::jsonb, -- Weekdays: 24h shifts
 '["GARDA_24"]'::jsonb, -- Weekends: 24h shifts
 '["GARDA_24"]'::jsonb, -- Holidays: 24h shifts
 1, 0, 8, -- Allow consecutive 24h shifts but lower monthly max
 '{
   "GARDA_24": {"id": "GARDA_24", "name": "Gardă 24 ore", "start": "08:00", "end": "08:00", "color": "#10B981", "duration": 24}
 }'::jsonb,
 '{"min_rest_hours": 24, "max_consecutive_24h": 1}'::jsonb
)
ON CONFLICT (hospital_id) DO NOTHING;

-- 7. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shift_swap_requests_updated_at 
BEFORE UPDATE ON shift_swap_requests 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hospital_shift_config_updated_at 
BEFORE UPDATE ON hospital_shift_config 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_shift_preferences_updated_at 
BEFORE UPDATE ON staff_shift_preferences 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();