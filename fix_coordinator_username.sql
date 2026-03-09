-- Migration to ensure coordinators table uses 'username' instead of 'email'

DO $$ 
BEGIN
    -- Check if 'email' exists and 'username' does not
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'coordinators' AND COLUMN_NAME = 'email') AND
       NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'coordinators' AND COLUMN_NAME = 'username') THEN
        
        -- Rename 'email' to 'username'
        ALTER TABLE public.coordinators RENAME COLUMN email TO username;
        
    -- If neither exists (unlikely, but safe), add 'username'
    ELSIF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'coordinators' AND COLUMN_NAME = 'username') THEN
        
        ALTER TABLE public.coordinators ADD COLUMN username TEXT UNIQUE;
        
    END IF;

    -- Ensure 'username' is UNIQUE and NOT NULL if it exists now
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'coordinators' AND COLUMN_NAME = 'username') THEN
       -- We can't easily add NOT NULL if table has rows without a default, but we can assume uniqueness is desired
       -- Postgres allows constraint definitions using ALTER TABLE ... ADD CONSTRAINT unique_username UNIQUE (username)
       -- Skipping strict NOT NULL here to avoid migration errors on existing dirty data, but adding UNIQUE if missing
       IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c 
            JOIN pg_class t ON c.conrelid = t.oid 
            WHERE t.relname = 'coordinators' AND c.contype = 'u' 
            AND pg_get_constraintdef(c.oid) LIKE '%(username)%'
       ) THEN
            ALTER TABLE public.coordinators ADD CONSTRAINT coordinators_username_key UNIQUE (username);
       END IF;
    END IF;

END $$;
