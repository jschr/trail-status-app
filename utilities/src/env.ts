import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import path from 'path';

const env = dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenvExpand(env)

export default (name: string, required = true): string => {
  const value = process.env[name];

  if (!value && required) {
    console.error(`Missing environment variable '${name}'.`);
    process.exit(1);
  }

  return value || '';
};
