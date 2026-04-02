import fs from 'fs';

async function run() {
  const url = 'https://firestore.googleapis.com/v1/projects/primeseva-mvp/databases/(default)/documents/bookings?pageSize=300';
  console.log('Fetching', url);
  try {
      const res = await fetch(url);
      const data = await res.json();
      const docs = data.documents || [];
      console.log('Got', docs.length, 'docs');
      
      const targets = docs.filter(doc => {
          const f = doc.fields;
          return f.service?.stringValue === 'Plumbing (Tap Fix)' && f.provider?.stringValue === 'Prime Plumbing Expert';
      });
      
      console.log('Found targets:', targets.map(t => t.name));
      
      for (const t of targets) {
          console.log('Deleting', t.name);
          const delRes = await fetch('https://firestore.googleapis.com/v1/' + t.name, { method: 'DELETE' });
          console.log('Delete status', delRes.status);
      }
      
      console.log('Done');
  } catch(e) {
      console.error(e);
  }
}

run();
