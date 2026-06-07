const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bzobwzodgcfzaitgebya.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sg24lQQkvMWmGvJKenCqtg_DcpiYw3P';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log('Testing connection...');
  const { data, error } = await supabase.from('lessons').select('*');
  if (error) {
    console.error('Error selecting from lessons:', error);
  } else {
    console.log('Lessons data:', data);
  }

  const { data: sData, error: sError } = await supabase.from('students').select('*');
  if (sError) {
    console.error('Error selecting from students:', sError);
  } else {
    console.log('Students data:', sData);
  }
}

test();
