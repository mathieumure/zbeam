import keytar from 'keytar';

export type Credential = {
  account: string;
  password: string;
};

export const generateKeystoreNamespace =
  (prefix = 'AutoTelFactu App') =>
  (localNamespace: string): string =>
    `${prefix}: ${localNamespace}`;

export const getKeyStoreNamespace = generateKeystoreNamespace();

export const getStoredCredentials = async (namespace: string): Promise<Credential[]> => {
  return await keytar.findCredentials(getKeyStoreNamespace(namespace));
};

export const storeCredentials = async (namespace: string, account: string, password: string): Promise<void> => {
  return await keytar.setPassword(getKeyStoreNamespace(namespace), account, password);
};
