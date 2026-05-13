const key = process.env.VITE_GOOGLE_PLACES_API_KEY || '';
console.log('VITE_GOOGLE_PLACES_API_KEY exists:', key.length > 0);
console.log('Key length:', key.length);
console.log('Key prefix:', key.substring(0, 10) + '...');
