import { Provider, ProviderLoginMethod } from '../types.js';
import { getBrowser } from '../service/browser.service.js';
import { Response } from 'playwright/types/types.js';

const googleLogin: ProviderLoginMethod = async (credentials) => {
  let browser = await getBrowser();
  let page = await browser.newPage();

  await page.goto('https://accounts.google.com/signin/v2/identifier?flowName=GlifWebSignIn&flowEntry=ServiceLogin');

  const redirectedUrl = page.url();
  if (redirectedUrl.startsWith('https://myaccount.google.com/')) {
    console.log('Successfully auto connected into your google account.');
    return true;
  }

  console.log('It seems you are not logged in your google account anymore. Trying to autoconnect you in visual');

  browser = await getBrowser({ headless: false });
  page = await browser.newPage();
  await page.goto('https://accounts.google.com/signin/v2/identifier?flowName=GlifWebSignIn&flowEntry=ServiceLogin');

  await page.fill('input[type="email"]', credentials.account);
  await page.click('"Suivant"');
  await page.fill('input[type="password"]', credentials.password);
  await page.click('"Suivant"');

  const response = await page.waitForResponse((response: Response) => {
    return response.url().startsWith('https://accounts.google.com/_/signin/challenge');
  });
  const responseBody = await response.body();
  const hasTwoStepVerification = responseBody.toString().includes('TWO_STEP_VERIFICATION');
  await page.waitForNavigation();

  if (!hasTwoStepVerification && page.url().startsWith('https://myaccount.google.com/')) {
    return true;
  } else {
    console.log('It seems you activated 2FA, waiting for you, to authorized this browser. Check the opened browser.');
    try {
      await page.waitForNavigation();
      return true;
    } catch (err) {
      return false;
    }
  }
};

export const GoogleProvider: Provider = {
  name: 'Google',
  credential: {
    namespace: 'google',
    loginMessage: 'Google email',
  },
  login: googleLogin,
  download: () => Promise.reject('not implemented'),
};
