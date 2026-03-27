export const getRandomBigInt = (): bigint => {
  const array = new BigUint64Array(1);
  crypto.getRandomValues(array);
  return array[0];
};
