export const getSupportedChains = async (api: string) => {
  const endpoint = `${api}/zeta-chain/observer/supportedChains`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data.chains;
};
