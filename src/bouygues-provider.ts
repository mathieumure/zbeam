import type { Provider } from './types';
import { getStoredCredentials, Credential, storeCredentials } from './cred.service.js';
import inquirer from 'inquirer';
import { getBrowser } from './browser.service.js';
import { Page } from 'playwright/types/types.js';
import path from 'path';
import fs from 'fs/promises';

const NAMESPACE = 'bouygues';

const bouyguesLogin = async () => {
  const storedCredentials = await getStoredCredentials(NAMESPACE);
  let credentials: Credential;

  if (storedCredentials.length === 0) {
    console.log('You never connect to your Bouygues account before.');

    const result = await inquirer.prompt<Credential & { confirm: true }>([
      {
        type: 'input',
        message: 'Bouygues login (phone number)',
        name: 'account',
      },
      { type: 'password', message: 'Bouygues password', name: 'password' },
      { type: 'confirm', message: 'do you want to store this credentials for future use ?', name: 'confirm' },
    ]);

    credentials = { account: result.account, password: result.password };
    if (result.confirm) {
      await storeCredentials(NAMESPACE, result.account, result.password);
    }
  } else {
    console.log('Bouygues credential founded.');
    credentials = storedCredentials[0];
  }

  console.log('Login bouygues with stored credentials');

  const browser = await getBrowser();

  const page = await browser.newPage();
  await page.goto('https://www.bouyguestelecom.fr/mon-compte/mes-factures');
  await page.waitForNavigation({ url: 'https://www.bouyguestelecom.fr/mon-compte/mes-factures' });
  await page.waitForLoadState('networkidle');

  const privacyPopup = await page.$('#popin_tc_privacy');
  if (privacyPopup) {
    console.log('privacy opened closing it');
    await page.click('"Continuer sans accepter ➔"');
  }

  if (page.url() === 'https://www.bouyguestelecom.fr/mon-compte/mes-factures#') {
    console.log('Successfully auto connected in your Bouygues account!');
    return true;
  }

  let authFrame = await page.frame({ name: 'bycIframe' });

  console.log('Log into bouygues user space...');
  await authFrame.fill('#passepartout #username', credentials.account);
  await authFrame.fill('#passepartout #password', credentials.password);
  const submitButton = await authFrame.$('#passepartout button[type="submit"]');
  await submitButton.click();

  await page.waitForNavigation({ url: 'https://www.bouyguestelecom.fr/mon-compte/mes-factures#' });
  await page.waitForLoadState('networkidle');

  if (page.url() === 'https://www.bouyguestelecom.fr/mon-compte/mes-factures#') {
    console.log('Successfully connected in your Bouygues account!');
    return true;
  } else {
    console.error("Can't connect to your Bouygues account!");
    return false;
  }
};

const bouyguesDownload = async ({ downloadDirectory }: { downloadDirectory: string }) => {
  console.log('Getting the list of invoices...');
  const browser = await getBrowser({ acceptDownloads: true });
  const page = await browser.newPage();
  await page.goto('https://www.bouyguestelecom.fr/mon-compte/mes-factures');
  await page.waitForLoadState('networkidle');

  console.log('Getting the last invoice metadata...');
  const lastMonthRow = await page.$('tr:has-text("Télécharger")');
  const lastMonthDateContainer = await lastMonthRow.$('td');
  const lastMonthDate = await lastMonthDateContainer.textContent();
  const [, month, year] = lastMonthDate.split('/');
  const lastMonthPriceContainer = await lastMonthRow.$('td:nth-child(4)');
  const lastMonthPrice = await lastMonthPriceContainer.textContent();
  const price = lastMonthPrice.replace('€', '.');

  console.log('Downloading the last invoice...');
  const lastMonthDownloadLink = await page.$('"Télécharger"');

  const [download] = await Promise.all([page.waitForEvent('download'), lastMonthDownloadLink.click()]);

  const title = `${year}-${month}-${price}.pdf`;

  // wait for download to complete
  const downloadPath = await download.path();
  const invoicePath = path.join(downloadDirectory, title);
  await fs.mkdir(downloadDirectory, { recursive: true });
  await fs.rename(downloadPath, invoicePath);
  console.log('Successfully downloading invoice ' + title + ' !');

  return true;
};

export const BouyguesProvider: Provider = {
  login: bouyguesLogin,
  download: bouyguesDownload,
};
