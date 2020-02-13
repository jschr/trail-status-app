export default <E extends Error>(condition: boolean, error: E) => {
  if (condition) throw error;
};
