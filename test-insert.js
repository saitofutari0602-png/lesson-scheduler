const url = 'https://bzobwzodgcfzaitgebya.supabase.co/rest/v1/lessons';
const key = 'sb_publishable_sg24lQQkvMWmGvJKenCqtg_DcpiYw3P';

const payload = {
  id: 'test-id-123',
  studentId: 'st-1',
  studentName: 'Test Student',
  date: '2026-06-08',
  startTime: '14:00',
  duration: 60,
  endTime: '15:00',
  color: 'blue',
  memo: 'test memo'
};

fetch(url, {
  method: 'POST',
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify(payload)
}).then(res => res.json().then(data => ({ status: res.status, data }))).then(({status, data}) => {
  console.log('Status:', status);
  console.log('Response:', data);
}).catch(err => {
  console.error(err);
});
