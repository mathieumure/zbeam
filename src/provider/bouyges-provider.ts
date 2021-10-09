import type { Provider, ProviderDownloadMethod, ProviderGetAccountNameMethod } from '../types.js';
import { getBrowser } from '../service/browser.service.js';
import { ProviderLoginMethod } from '../types.js';
import { Credential } from '../service/cred.service.js';

const bouyguesLogin: ProviderLoginMethod = async (credentials) => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.goto('https://www.bouyguestelecom.fr/mon-compte/mes-factures');
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

  const authFrame = await page.frame({ name: 'bycIframe' });

  console.log('Log into bouygues user space...');
  // bouygues want a last name, we add it to the account name
  const [account, lastName] = getAccountAndLastNameFromAccountName(credentials.account);
  await authFrame.fill('#passepartout #lastname', lastName);
  await authFrame.fill('#passepartout #username', account);
  await authFrame.fill('#passepartout #password', credentials.password);
  const submitButton = await authFrame.$('#passepartout button[type="submit"]');
  await submitButton.click();

  await page.waitForTimeout(5000);

  return page.url() === 'https://www.bouyguestelecom.fr/mon-compte/mes-factures#';
};

const bouyguesDownload: ProviderDownloadMethod = async () => {
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

  // wait for download to complete
  const downloadPath = await download.path();

  return {
    filePath: downloadPath,
    year,
    month,
    price,
  };
};

const accountName: ProviderGetAccountNameMethod = (credentials: BouyguesCredentials) => {
  return `${credentials.account}_${credentials.lastName}`;
};

const getAccountAndLastNameFromAccountName = (accountName: string) => {
  return accountName.split('_')
}

export type BouyguesCredentials = Credential & { lastName?: string };

export const BouyguesProvider: Provider = {
  name: 'Bouygues',
  inputs: [
    {
      type: 'input',
      message: 'Bouygues login (phone number)',
      name: 'account',
    },
    {
      type: 'password',
      message: 'Bouygues password',
      name: 'password',
    },
    {
      type: 'lastName',
      message: 'Bouygues last name',
      name: 'lastName',
    },
    {
      type: 'confirm',
      message: 'do you want to store this credentials for future use ?',
      name: 'confirm',
    },
  ],
  credential: {
    namespace: 'bouygues',
  },
  login: bouyguesLogin,
  download: bouyguesDownload,
  getAccountName: accountName,
};
