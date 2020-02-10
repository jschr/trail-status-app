import Twitter from 'twitter';
import { env } from '@hydrocut-trail-status/utilities';

const client = new Twitter({
  consumer_key: env('TWITTER_CONSUMER_KEY'),
  consumer_secret: env('TWITTER_CONSUMER_SECRET'),
  access_token_key: env('TWITTER_ACCESS_TOKEN_KEY'),
  access_token_secret: env('TWITTER_ACCESS_TOKEN_SECRET')
});

export const postStatus = async (status: string) => {
  try {
    const tweet = await client.post('statuses/update', { status });
    return tweet;
  } catch (err) {
    throw new Error(`Error positing status to Twitter: ${err.message}`);
  }
};
