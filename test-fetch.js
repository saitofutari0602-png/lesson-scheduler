const url = 'https://bzobwzodgcfzaitgebya.supabase.co/rest/v1/lessons';
const key = 'sb_publishable_sg24lQQkvMWmGvJKenCqtg_DcpiYw3P';

fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key
  }
}).then(res => res.json()).then(data => {
  console.log('Lessons:', data);
}).catch(err => {
  console.error(err);
});
