import 'dotenv/config';
import { TwitterApi } from 'twitter-api-v2';
import { generateTweet } from '../generate.js';

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const rwClient = client.readWrite;

export async function postTweet(text) {
  try {
    const result = await rwClient.v2.tweet(text);
    console.log(`✅ Tweet publicado: ${result.data.id}`);
    return result.data;
  } catch (err) {
    console.error('❌ Error publicando tweet:', err.message);
    throw err;
  }
}

// ── CLI ──
if (process.argv[1]?.includes('twitter.js')) {
  const text = generateTweet();
  console.log('📝 Contenido:');
  console.log(text);
  console.log('');
  postTweet(text);
}
