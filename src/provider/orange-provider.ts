import type { Provider, ProviderDownloadMethod, ProviderGetAccountNameMethod } from '../types.js';
import { getBrowser } from '../service/browser.service.js';
import { ProviderLoginMethod } from '../types.js';
import { Credential } from '../service/cred.service.js';

const orangeLogin: ProviderLoginMethod = async (credentials) => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  const privacyPopup = await page.$('#didomi-notice');
  if (privacyPopup) {
    const privacyPopupBtn = await page.$('#didomi-notice-agree-button');
    console.log('privacy opened closing it');
    await privacyPopupBtn.click();
  }

  await page.goto('https://espace-client.orange.fr/facture-paiement');
  await page.waitForLoadState('networkidle');

  if (page.url().includes('https://espace-client.orange.fr/facture-paiement')) {
    console.log('Successfully auto connected in your Orange account!');
    return true;
  }

  const alreadySelectedAccount = await page.$('[data-testid="selected-account-login"]');
  const btnSubmit = await page.$('#btnSubmit');

  if (!alreadySelectedAccount) {
    console.log('Log into Orange user space...');
    // orange can also use phone number as id, we add it to the account name
    await page.fill('#login', getAccountName(credentials));
    await page.waitForTimeout(1000);
    console.log('Login typed');
    await btnSubmit.click();
    await page.waitForTimeout(1000);
  }

  await page.fill('#password', credentials.password);
  await page.waitForTimeout(1000);
  console.log('Password typed');
  await btnSubmit.click();
  await page.waitForTimeout(5000);

  if (page.url().includes('https://login.orange.fr/promotion-mobile-connect?service=nextecare')) {
    console.log('Avoid double auth in your Orange account!');
    const decouvrirPlusTardBtn = await page.$('[data-testid="link-mc-later"]');
    await decouvrirPlusTardBtn.click();
    await page.waitForTimeout(1000);
  }

  console.log('Logged');
  return page.url().includes('https://espace-client.orange.fr/facture-paiement');
};

const orangeDownload: ProviderDownloadMethod = async () => {
  console.log('Getting the list of invoices...');
  const browser = await getBrowser({ acceptDownloads: true });
  const page = await browser.newPage();
  await page.goto('https://espace-client.orange.fr/facture-paiement');
  await page.waitForLoadState('networkidle');

  console.log('Getting the last invoice metadata...');
  const invoiceDate = await page.$('#last-bill-date');
  const invoiceDateValue = await invoiceDate.textContent();
  const [, month, year] = invoiceDateValue.trim().split(' ');
  const invoicePrice = await page.$('[data-e2e="bp-cardAmount"]');
  const invoicePriceValue = await invoicePrice.textContent();
  const price = invoicePriceValue.trim().replace(',', '_').replace('€', '.');
  await page.click('text=Voir la facture');
  await page.waitForLoadState('networkidle');
  console.log('Opening the last invoice in iframe...');

  await page.waitForTimeout(1000);
  const onPdfDisplay = await page.$('pdf-display');
  const downloadBtn = await page.$('[data-e2e="download-link"]');
  if (onPdfDisplay && downloadBtn) {
    console.log('Downloading the last invoice...');
    const [download] = await Promise.all([page.waitForEvent('download'), downloadBtn.click()]);

    // wait for download to complete
    const downloadPath = await download.path();

    console.log({
      filePath: downloadPath,
      year,
      month,
      price,
    });

    return {
      filePath: downloadPath,
      year,
      month,
      price,
    };
  }
};

const getAccountName: ProviderGetAccountNameMethod = (credentials: OrangeCredentials) => {
  const { number, account } = credentials;
  return number ? number : account;
};

export type OrangeCredentials = Credential & { number?: string };

export const OrangeProvider: Provider = {
  name: 'Orange',
  inputs: [
    {
      type: 'input',
      message: 'Orange login (phone number or email)',
      name: 'account',
    },
    {
      type: 'password',
      message: 'Orange password',
      name: 'password',
    },
    {
      type: 'lastName',
      message: 'Orange last name',
      name: 'lastName',
    },
    {
      type: 'confirm',
      message: 'do you want to store this credentials for future use ?',
      name: 'confirm',
    },
  ],
  credential: {
    namespace: 'orange',
  },
  login: orangeLogin,
  download: orangeDownload,
  getAccountName,
};
