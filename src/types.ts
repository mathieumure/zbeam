import { Credential } from './service/cred.service.js';

export type InvoiceMetaData = {
  year: string;
  month: string;
  price: string;
};

export type ProviderLoginMethod = (credentials: Credential) => Promise<boolean>;
export type ProviderDownloadMethod = () => Promise<DownloadInfo>;
export type DownloadInfo = InvoiceMetaData & {
  filePath: string;
};

export type Provider = {
  name: string;
  credential: {
    namespace: string;
    loginMessage?: string;
  };
  login: ProviderLoginMethod;
  download: ProviderDownloadMethod;
};
