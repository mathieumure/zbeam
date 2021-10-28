import type { Provider, ProviderDownloadMethod, ProviderGetAccountNameMethod } from '../types.js';
import { getBrowser } from '../service/browser.service.js';
import { ProviderLoginMethod } from '../types.js';
import { Credential } from '../service/cred.service.js';

const monthsStringToNumber: Record<string, string> = {
  janvier: '01',
  février: '02',
  mars: '03',
  avril: '04',
  mai: '05',
  juin: '06',
  juillet: '07',
  aout: '08',
  septembre: '09',
  octobre: '10',
  novembre: '11',
  décembre: '12',
};

const soshLogin: ProviderLoginMethod = async (credentials) => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.goto('https://login.orange.fr/#/');

  // If we are already logged in, the webpage will ask to stay connected
  const alreadyConnected = await page.$('[data-testid="button-keepconnected"]');
  if (alreadyConnected) {
    await alreadyConnected.click();
    await page.waitForLoadState('networkidle');
    return true;
  }

  // Orange tries to auto-discover login account based on origin network
  // In that case the login is auto-filled with the network livebox owner login
  // In our case this may not be what we want (public networks etc) so we go back to the account selection page
  const changeAccountButton = await page.$('[data-testid="change-account"]');
  if (changeAccountButton) {
    await Promise.all([page.waitForNavigation(), changeAccountButton.click()]);
    await page.click('text=Utiliser un autre compte');
  }

  await page.click('[data-testid="input-login"]');
  await page.fill('[data-testid="input-login"]', credentials.account);
  await Promise.all([page.waitForNavigation(), page.press('[data-testid="input-login"]', 'Enter')]);

  await page.fill('[data-testid="input-password"]', credentials.password);
  await Promise.all([page.waitForNavigation(), await page.press('[data-testid="input-password"]', 'Enter')]);

  // Login takes a bit of time
  await page.waitForLoadState('networkidle');

  return true;
};

const soshDownload: ProviderDownloadMethod = async () => {
  const browser = await getBrowser({ acceptDownloads: true });
  const page = await browser.newPage();

  await page.goto('https://www.sosh.fr/client');

  await page.waitForTimeout(2000);
  await page.click('li >> button:has-text("mobile")');

  await Promise.all([page.click('text=Consulter votre facture'), page.waitForNavigation()]);
  // Wait needed for bill information to be displayed
  await page.waitForTimeout(2000);

  // Extract bill month and year
  const date = await page
    .$('#last-bill-date')
    .then((e) => e.textContent())
    .catch((exc) => {
      throw `Failed to recover bill date, selector may have changed\n${exc}`;
    });

  const [, monthString, year] = date.trim().split(' ');
  const month = monthsStringToNumber[monthString.toLowerCase()];

  // Extract bill amount
  let price = await page
    .$('[data-e2e="bp-cardAmount"]')
    .then((e) => e.textContent())
    .catch((exc) => {
      throw `Failed to recover bill amount, selector may have changed\n${exc}`;
    });

  price = price.replace(',', '.').replace('€', '').trim();

  await Promise.all([page.waitForNavigation(), page.click('text=Voir la facture')]);
  const lastMonthDownloadLink = await page.$('text=Télécharger');

  const [download] = await Promise.all([page.waitForEvent('download'), lastMonthDownloadLink.click()]);
  const downloadPath = await download.path();

  return {
    filePath: downloadPath,
    year,
    month,
    price,
  };
};

const accountName: ProviderGetAccountNameMethod = (credentials: Credential) => {
  return `${credentials.account}`;
};

export const SoshProvider: Provider = {
  name: 'Sosh',
  inputs: [
    {
      type: 'input',
      message: 'Sosh login (email or phone number)',
      name: 'account',
    },
    {
      type: 'password',
      message: 'Sosh password',
      name: 'password',
    },
    {
      type: 'confirm',
      message: 'do you want to store this credentials for future use ?',
      name: 'confirm',
    },
  ],
  credential: {
    namespace: 'sosh',
  },
  login: soshLogin,
  download: soshDownload,
  getAccountName: accountName,
};
