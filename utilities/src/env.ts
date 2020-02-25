export default (name: string, required = true): string => {
  const value = process.env[name];

  if (!value && required) {
    console.trace(`Missing environment variable '${name}'.`);
    process.exit(1);
  }

  return value || '';
};
