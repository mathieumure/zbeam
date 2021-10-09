import type { Provider } from './types';
import { BouyguesProvider } from './provider/bouyges-provider.js';
import path from 'path';
import { Credential, getStoredCredentials, removeCredentials, storeCredentials } from './service/cred.service.js';
import inquirer from 'inquirer';
import { generateInvoiceName, getInvoiceInfo } from './service/utils.js';
import fs from 'fs/promises';
import { GoogleProvider } from './provider/google-provider.js';
import { createInvoiceReport } from './invoice-report.js';
import chalk from 'chalk';

export const providerMap: { [Key: string]: Provider } = {
  bouygues: BouyguesProvider,
};

const downloadDir = path.join(path.dirname(''), 'invoices');

export const login = async (provider: Provider): Promise<boolean> => {
  const storedCredentials = await getStoredCredentials(provider.credential.namespace);
  let credentials: Credential;

  if (storedCredentials.length === 0) {
    console.log(`You never connect to your ${chalk.yellow(provider.name)} account before.`);

    const result = await inquirer.prompt<Credential & { confirm: true }>(provider.inputs);

    credentials = { account: provider.getAccountName(result), password: result.password };

    if (result.confirm) {
      await storeCredentials(provider.credential.namespace, provider.getAccountName(result), result.password);
    }
  } else {
    console.log(`${chalk.yellow(provider.name)} credential founded.`);
    credentials = storedCredentials[0];
  }

  console.log(`Trying to log in ${chalk.yellow(provider.name)} with your credentials`);
  const loginResult = await provider.login(credentials).catch(() => false);

  if (loginResult) {
    console.log(chalk.green(`\n🎉 Successfully connected in your ${provider.name} account!\n`));
    return true;
  } else {
    console.error(chalk.red(`\n😕 We can't connect to your ${chalk.yellow(provider.name)} account!\n`));
    const result = await inquirer.prompt<{ confirm: true }>([
      {
        type: 'confirm',
        message: 'do you want to remove your stored credentials and start again ?',
        name: 'confirm',
      },
    ]);
    if (result.confirm) {
      await removeCredentials(provider.credential.namespace);
      return login(provider);
    }
    return false;
  }
};

export const download = async (providerName: string): Promise<void> => {
  const provider = providerMap[providerName];
  if (!provider) {
    console.log(providerName, 'is not a known provider.\nAvailable providers: ', Object.keys(providerMap));
    return;
  }

  const loginSuccessful = await login(provider);

  if (!loginSuccessful) {
    process.exit(-1);
    return;
  }

  const downloadInfo = await provider.download();

  const title = generateInvoiceName(downloadInfo);

  const invoicePath = path.join(downloadDir, title);
  await fs.mkdir(downloadDir, { recursive: true });
  await fs.rename(downloadInfo.filePath, invoicePath);
  console.log(`Successfully downloading invoice ${title} !`);
  console.log(chalk.green(`\n🎉 Successfully downloading invoice ${chalk.yellow(title)}!\n`));
};

export const report = async (invoicePath: string): Promise<void> => {
  const loginSuccessful = await login(GoogleProvider);
  if (!loginSuccessful) {
    process.exit(-1);
    return;
  }

  console.log('Parsing meta data for invoice...');
  const fileName = invoicePath.split('/').pop();
  const metadata = getInvoiceInfo(fileName);

  console.log('Start creating an expense report with this meta', { ...metadata });

  await createInvoiceReport(invoicePath, metadata);
};
