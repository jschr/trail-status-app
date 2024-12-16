export const stripHashtags = (value: string) =>
  value.replace(/\#[a-zA-Z0-9-]+(\s|\.|$)/g, '').trim();

export const unwrapError = (err: unknown): string => {
  if (err instanceof Error) {
    return err.message;
  }

  return JSON.stringify(err);
};
