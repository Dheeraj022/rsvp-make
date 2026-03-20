import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, name');
  
  if (eventError) {
    console.error("Event fetch error:", eventError);
  } else {
    console.log("Events:", JSON.stringify(events, null, 2));
  }

  const { data: coords, error: fetchError } = await supabase
    .from('coordinators')
    .select('*, events(name)');
  
  if (fetchError) {
    console.error("Fetch error:", fetchError);
  } else {
    console.log("Coordinators:", JSON.stringify(coords, null, 2));
  }
}

test();
