const url = 'https://bavxclrpfhxmjebdimkk.supabase.co/rest/v1/posts?select=id,title,status,category,created_at&order=created_at.desc&limit=5';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdnhjbHJwZmh4bWplYmRpbWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzA3NTMsImV4cCI6MjA4ODQ0Njc1M30.RbxdKdWNUAEhcmxgL06iQOIET1imCTaSI6WukVJiAUU';

fetch(url, {
    headers: {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey
    }
}).then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error(err));
