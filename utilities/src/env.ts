export default (name: string, required = true): string => {
  const value = process.env[name];

  if (!value && required) {
    console.error(`Missing environment variable '${name}'.`);
    process.exit(1);
  }

  return value || '';
};
