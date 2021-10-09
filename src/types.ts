import { Credential } from './service/cred.service.js';

export type InvoiceMetaData = {
  year: string;
  month: string;
  price: string;
};

export type ProviderGetAccountNameMethod = (credentials: Credential) => string;
export type ProviderLoginMethod = (credentials: Credential) => Promise<boolean>;
export type ProviderDownloadMethod = () => Promise<DownloadInfo>;
export type DownloadInfo = InvoiceMetaData & {
  filePath: string;
};

export type Input = {
  type: string;
  message: string;
  name: string;
};

export type Provider = {
  name: string;
  inputs: Input[];
  credential: {
    namespace: string;
  };
  login: ProviderLoginMethod;
  download: ProviderDownloadMethod;
  getAccountName: ProviderGetAccountNameMethod;
};
