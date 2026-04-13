import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSchema() {
    console.log("Fetching sample log from whatsapp_logs...");
    const { data, error } = await supabase.from('whatsapp_logs').select('*').limit(1);
    
    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }
    
    if (data && data.length > 0) {
        console.log("Sample log found. Columns:", Object.keys(data[0]));
        console.log("Data:", data[0]);
    } else {
        console.log("No logs found in whatsapp_logs table.");
    }
}

checkSchema();
