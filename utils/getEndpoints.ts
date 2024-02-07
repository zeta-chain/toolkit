export const getEndpoints = (chains: any, type: any, network: string): any => {
  if (!(chains as any)[network]) {
    throw new Error(`Network ${network} does not exist.`);
  }

  return (chains as any)[network].api.filter((api: any) => api.type === type);
};
