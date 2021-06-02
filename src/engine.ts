import type { Provider } from './types';
import { BouyguesProvider } from './provider/bouyges-provider.js';
import path from 'path';
import { Credential, getStoredCredentials, storeCredentials } from './service/cred.service.js';
import inquirer from 'inquirer';
import { generateInvoiceName, getInvoiceInfo } from './service/utils.js';
import fs from 'fs/promises';
import { GoogleProvider } from './provider/google-provider.js';
import { createInvoiceReport } from './invoice-report.js';

export const providerMap: { [Key: string]: Provider } = {
  bouygues: BouyguesProvider,
};

const downloadDir = path.join(path.dirname(''), 'invoices');

export const login = async (provider: Provider) => {
  const storedCredentials = await getStoredCredentials(provider.credential.namespace);
  let credentials: Credential;

  if (storedCredentials.length === 0) {
    console.log('You never connect to your ' + provider.name + ' account before.');

    const result = await inquirer.prompt<Credential & { confirm: true }>([
      {
        type: 'input',
        message: provider.credential.loginMessage || provider.name + ' login',
        name: 'account',
      },
      { type: 'password', message: provider.name || provider.name + ' password', name: 'password' },
      { type: 'confirm', message: 'do you want to store this credentials for future use ?', name: 'confirm' },
    ]);

    credentials = { account: result.account, password: result.password };

    if (result.confirm) {
      await storeCredentials(provider.credential.namespace, result.account, result.password);
    }
  } else {
    console.log(provider.name + ' credential founded.');
    credentials = storedCredentials[0];
  }

  console.log('Trying to log in ' + provider.name + ' with your credentials');
  const loginResult = await provider.login(credentials);

  if (loginResult) {
    console.log('Successfully connected in your ' + provider.name + ' account!');
  } else {
    console.error("Can't connect to your " + provider.name + ' account!');
    throw new Error("Can't connect to your \" + provider.name + ' account!");
  }
};

export const download = async (providerName: string): Promise<void> => {
  const provider = providerMap[providerName];
  if (!provider) {
    console.log(providerName, 'is not a known provider.\nAvailable providers: ', Object.keys(providerMap));
    return;
  }

  await login(provider);

  const downloadInfo = await provider.download();

  const title = generateInvoiceName(downloadInfo);

  const invoicePath = path.join(downloadDir, title);
  await fs.mkdir(downloadDir, { recursive: true });
  await fs.rename(downloadInfo.filePath, invoicePath);
  console.log('Successfully downloading invoice ' + title + ' !');
};

export const report = async (invoicePath: string): Promise<void> => {
  await login(GoogleProvider);

  console.log('Parsing meta data for invoice...');
  const fileName = invoicePath.split('/').pop();
  const metadata = getInvoiceInfo(fileName);

  console.log('Start creating an expense report with this meta', { ...metadata });

  await createInvoiceReport(invoicePath, metadata);
};
