-- Migration: Add notifications system
-- Date: 2025-07-06

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES staff(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'swap_request', 'shift_assigned', 'shift_cancelled', 'schedule_published')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB, -- Additional data like shift_id, swap_request_id, etc.
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    hospital VARCHAR(255),
    department VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP -- Optional expiration for temporary notifications
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_hospital ON notifications(hospital);
CREATE INDEX IF NOT EXISTS idx_notifications_department ON notifications(department);

-- 3. Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES staff(id),
    swap_requests BOOLEAN DEFAULT true,
    shift_assignments BOOLEAN DEFAULT true,
    schedule_updates BOOLEAN DEFAULT true,
    system_announcements BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 4. Create function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    -- Delete read notifications older than 30 days
    DELETE FROM notifications 
    WHERE read = true AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    -- Delete expired notifications
    DELETE FROM notifications 
    WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;
    
    -- Delete unread notifications older than 90 days
    DELETE FROM notifications 
    WHERE read = false AND created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to update updated_at for notification preferences
CREATE TRIGGER update_notification_preferences_updated_at 
BEFORE UPDATE ON notification_preferences 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Create function to notify users about shift changes
CREATE OR REPLACE FUNCTION notify_shift_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify when a shift is assigned
    IF NEW.staff_ids IS DISTINCT FROM OLD.staff_ids THEN
        -- Get added staff members
        WITH added_staff AS (
            SELECT unnest(NEW.staff_ids) AS staff_id
            EXCEPT
            SELECT unnest(OLD.staff_ids)
        )
        INSERT INTO notifications (user_id, type, title, message, metadata, hospital, department)
        SELECT 
            staff_id,
            'shift_assigned',
            'Tură nouă asignată',
            'Ai fost asignat la o tură nouă pe data de ' || NEW.date,
            jsonb_build_object(
                'shift_id', NEW.shift_id,
                'date', NEW.date,
                'shift_type', NEW.shift_type
            ),
            NEW.hospital,
            NEW.department
        FROM added_staff;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for shift notifications
CREATE TRIGGER notify_on_shift_change
AFTER UPDATE ON shifts
FOR EACH ROW
WHEN (OLD.staff_ids IS DISTINCT FROM NEW.staff_ids)
EXECUTE FUNCTION notify_shift_change();

-- 8. Add sample notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM staff
ON CONFLICT (user_id) DO NOTHING;