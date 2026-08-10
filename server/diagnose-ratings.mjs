import { config } from './config.mjs';
import { ratingsByImdb } from './omdb.mjs';

if (!config.omdbApiKey) {
  console.error('IMDb ratings are disabled: OMDB_API_KEY is missing from .env.');
  console.error('Add OMDB_API_KEY=your_key, save the file, and restart npm run dev.');
  process.exit(1);
}

const result = await ratingsByImdb('tt0111161');
if (result.status !== 'ok') {
  console.error(`OMDb check failed (${result.status}): ${result.message || 'Unknown error'}`);
  process.exit(1);
}

console.log('OMDb is working.');
console.log(`Sample IMDb rating: ${result.imdb || 'not returned'}`);
console.log(`Sample Rotten Tomatoes rating: ${result.rottenTomatoes || 'not returned for this title/key'}`);
