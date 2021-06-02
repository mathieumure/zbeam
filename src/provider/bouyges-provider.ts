import type { Provider, ProviderDownloadMethod } from '../types.js';
import { getBrowser } from '../service/browser.service.js';
import { ProviderLoginMethod } from '../types.js';

const bouyguesLogin: ProviderLoginMethod = async (credentials) => {
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

export const BouyguesProvider: Provider = {
  name: 'Bouygues',
  credential: {
    namespace: 'bouygues',
    loginMessage: 'Bouygues login (phone number)',
  },
  login: bouyguesLogin,
  download: bouyguesDownload,
};
