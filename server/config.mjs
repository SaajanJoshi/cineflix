import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 8787),
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:5173',
  tmdbToken: process.env.TMDB_READ_ACCESS_TOKEN || '',
  tmdbApiKey: process.env.TMDB_API_KEY || '',
  omdbApiKey: process.env.OMDB_API_KEY || '',
  elasticNode: process.env.ELASTICSEARCH_NODE || '',
  elasticApiKey: process.env.ELASTICSEARCH_API_KEY || '',
  elasticUsername: process.env.ELASTICSEARCH_USERNAME || '',
  elasticPassword: process.env.ELASTICSEARCH_PASSWORD || '',
  elasticIndex: process.env.ELASTICSEARCH_INDEX || 'cineflix-media-v2',
  vidkingBaseUrl: process.env.VIDKING_BASE_URL || 'https://www.vidking.net',
  vidkingColor: process.env.VIDKING_COLOR || 'e50914',
};
