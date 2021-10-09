import keytar from 'keytar';

export type Credential = {
  account: string;
  password: string;
};

export const generateKeystoreNamespace =
  (prefix = 'ZBeam App') =>
  (localNamespace: string): string =>
    `${prefix}: ${localNamespace}`;

export const getKeyStoreNamespace = generateKeystoreNamespace();

export const getStoredCredentials = async (namespace: string): Promise<Credential[]> => {
  return await keytar.findCredentials(getKeyStoreNamespace(namespace));
};

export const storeCredentials = async (namespace: string, account: string, password: string): Promise<void> => {
  return await keytar.setPassword(getKeyStoreNamespace(namespace), account, password);
};

export const removeCredentials = async (namespace: string): Promise<boolean> => {
  const storedCredentials = await getStoredCredentials(namespace);

  const results = await Promise.all(
    storedCredentials.map((it) => keytar.deletePassword(getKeyStoreNamespace(namespace), it.account))
  );

  return results.every((result) => result);
};
