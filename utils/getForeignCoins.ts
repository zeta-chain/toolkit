export const getForeignCoins = async (api: string) => {
  const endpoint = `${api}/zeta-chain/fungible/foreign_coins`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data.foreignCoins;
};
