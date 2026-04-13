import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
    const phone = '918178491283';
    console.log(`Checking logs for phone: ${phone}`);

    const { data: logs, error } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .eq('phone', phone);

    if (error) {
        console.error('Error fetching logs:', error);
        return;
    }

    console.log(`Found ${logs.length} logs for phone ${phone}:`);
    console.table(logs);

    // Also check by name
    const { data: nameLogs, error: nameError } = await supabase
        .from('whatsapp_logs')
        .select('*, guests(name)')
        .ilike('guests.name', '%Dheeraj%');
        
    if (nameError) {
         console.warn('Could not check by guest name joining.');
    } else if (nameLogs && nameLogs.length > 0) {
        console.log(`Found ${nameLogs.length} logs by guest name 'Dheeraj':`);
        console.table(nameLogs);
    }
}

checkLogs();
