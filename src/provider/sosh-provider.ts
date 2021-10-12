import type { Provider, ProviderDownloadMethod, ProviderGetAccountNameMethod } from '../types.js';
import { getBrowser } from '../service/browser.service.js';
import { ProviderLoginMethod } from '../types.js';

const soshLogin: ProviderLoginMethod = async (credentials) => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.goto('https://login.orange.fr/');

  await page.goto('https://login.orange.fr/#/password');

  await Promise.all([
    page.waitForNavigation(/*{ url: 'https://login.orange.fr/#/listAccount' }*/),
    page.click('[data-testid="change-account"]'),
  ]);

  await page.click('text=Utiliser un autre compte');

  await page.click('[data-testid="input-login"]');

  await page.fill('[data-testid="input-login"]', credentials.account);

  await Promise.all([
    page.waitForNavigation(/*{ url: 'https://login.orange.fr/#/password' }*/),
    page.press('[data-testid="input-login"]', 'Enter'),
  ]);

  const alreadyConnected = await page.$('[data-testid="button-keepconnected"]');
  if (alreadyConnected) {
    alreadyConnected.click();
  } else {
    await page.click('[data-testid="submit-password"]');
    await page.fill('[data-testid="input-password"]', credentials.password);
    await page.press('[data-testid="input-password"]', 'Enter');
  }

  // Login takes a bit of time
  await page.waitForTimeout(2000);

  return true;
};

const soshDownload: ProviderDownloadMethod = async () => {
  console.log('Getting the list of invoices...');
  const browser = await getBrowser({ acceptDownloads: true, headless: false });
  const page = await browser.newPage();

  await page.goto('https://espace-client.orange.fr/factures-paiement?sosh=');

  await page.waitForTimeout(2000);

  await Promise.all([
    page.waitForNavigation(/*{ url: 'https://espace-client.orange.fr/facture-paiement/9061346781' }*/),
    page.click('text=Gérer et payer vos factures'),
  ]);

  await page.waitForTimeout(1000);

  //TODO remove
  page.on('response', async (response) => {
    if (
      response
        .url()
        .includes(
          'https://sso-f.orange.fr/omoi_erb/facture/v2.0/billsAndPaymentInfos/users/current/contracts/9061346781'
        )
    ) {
      const body = await response.json();
      console.log('<<', response.status(), response.url(), body);
    }
  });

  await page.click('text=Voir la facture');

  const date = await page.$('#last-bill-date').then((e) => e.textContent());
  const [, month, year] = date.trim().split(' ');

  let price = await page.$('[data-e2e="bp-cardAmount"]').then((e) => e.textContent());
  price = price.replace(',', '.').replace('€', '').trim();

  console.log(month, year, price);

  await page.waitForTimeout(4000);

  const lastMonthDownloadLink = await page.$('text=Télécharger');

  console.log(lastMonthDownloadLink);
  const [download] = await Promise.all([page.waitForEvent('download'), lastMonthDownloadLink.click()]);

  await page.waitForTimeout(1000);

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
