export default (value: string) => {
  if (value.charAt(0) === '#') return value;
  return `#${value}`;
};
