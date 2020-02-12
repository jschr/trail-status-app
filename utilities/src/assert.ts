export default <E extends Error>(condition: boolean, error: Error) => {
  if (condition) throw error;
};
