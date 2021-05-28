import type { Provider } from './types';
import { BouyguesProvider } from './bouygues-provider.js';
import path from 'path';

const providerMap: { [Key: string]: Provider } = {
  bouygues: BouyguesProvider,
};

export const download = async (providerName: string): Promise<void> => {
  const provider = providerMap[providerName];
  if (!provider) {
    console.log(providerName, 'is not a known provider.\nAvailable providers: ', Object.keys(providerMap));
    return;
  }

  await provider.login();
  await provider.download({ downloadDirectory: path.join(path.dirname(''), 'invoices') });
};
