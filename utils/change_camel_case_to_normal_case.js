const changeCamelCaseToNormalCase = (camelCaseWord) => {
  if (!camelCaseWord) return '';

  return camelCaseWord
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
};

export default changeCamelCaseToNormalCase;
