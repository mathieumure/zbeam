import { Credential, getStoredCredentials, storeCredentials } from './cred.service.js';
import inquirer from 'inquirer';
import { getBrowser } from './browser.service.js';
import { Response } from 'playwright/types/types.js';
import path from 'path';

const GOOGLE_NAMESPACE = 'google';

export const loginForInvoiceReport = async () => {
  const storedCredentials = await getStoredCredentials(GOOGLE_NAMESPACE);
  let credentials: Credential;

  if (storedCredentials.length === 0) {
    console.log('You never connect to your Google account before.');

    const result = await inquirer.prompt<Credential & { confirm: true }>([
      {
        type: 'input',
        message: 'Google email',
        name: 'account',
      },
      { type: 'password', message: 'Google password', name: 'password' },
      { type: 'confirm', message: 'do you want to store this credentials for future use ?', name: 'confirm' },
    ]);

    credentials = { account: result.account, password: result.password };
    if (result.confirm) {
      await storeCredentials(GOOGLE_NAMESPACE, result.account, result.password);
    }
  } else {
    console.log('Bouygues credential founded.');
    credentials = storedCredentials[0];
  }

  console.log('Login Google with stored credentials');

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
    console.log('Autoconnect successfull!');
  } else {
    console.log('It seems you activated 2FA, waiting for you, to authorized this browser. Check the opened browser.');
    try {
      await page.waitForNavigation();
      console.log('Successfully connected into your Google account!');
    } catch (err) {
      throw err;
    }
  }
};

export const createInvoiceReport = async (invoicePath: string) => {
  await loginForInvoiceReport();

  console.log('Parsing meta data for invoice...');
  const fileName = invoicePath.split('/').pop();
  const metadata = /(?<year>\d{4})-(?<month>\d{2})-(?<price>[\d.]+)\.pdf/.exec(fileName)?.groups;

  console.log('Start creating an expense report with this meta', { ...metadata });
  const browser = await getBrowser({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://zenika.my.alibeez.com/');

  await page.waitForSelector('"Se connecter avec Google"');
  await page.click('"Se connecter avec Google"');

  await page.waitForSelector('"Saisir une note de frais"');
  await page.click('"Saisir une note de frais"');

  await page.waitForSelector('"Nouvelle note de frais"');

  await page.fill('.v-formlayout input', 'Facture téléphone ' + metadata.month + '/' + metadata.year);
  await page.click('"Sélectionner..."');
  await page.click('.tuning-datefield-calendar .currentmonth');
  await page.click('"Créer"');

  console.log('Reports container created. Add a new expense with your invoice.');
  await page.waitForSelector('"Ajouter une dépense"');

  const formRows = await page.$$('#add-expense-window .v-formlayout-row');

  await (await formRows[0].$('input')).fill('Facture téléphone');

  await (await formRows[2].$('"Sélectionner..."')).click();
  await page.waitForSelector('.v-popupbutton-popup');

  await page.type('.v-popupbutton-popup input', 'INT_TELEPHONE');
  await page.click('"INT_TELEPHONE"');

  const amount = Math.min(25, parseFloat(metadata.price)).toString();
  const inputAmountId = await page.$eval("'Montant déclaré TTC'", (node) => node.parentElement.getAttribute('for'));
  await page.focus('#' + inputAmountId);
  await page.waitForTimeout(200);
  await page.fill('#' + inputAmountId, amount);

  await page.click('"Sélectionner le type de dépense"');
  await page.waitForSelector('.v-popupbutton-popup');
  await page.click('"TELEPHONE"');

  await page.click('"Ajouter un justificatif"');
  await page.waitForSelector('"Sélectionner un fichier sur cet ordinateur"');
  await page.setInputFiles('.v-csslayout-upload-field input[type="file"]', path.join(path.dirname(''), invoicePath));
  await page.waitForSelector('#add-bill .v-textfield-readonly');

  await page.click('#add-bill #submit');

  await page.waitForSelector('"Remplacer le justificatif"');

  await page.click('#add-expense-window #submit');

  await page.waitForSelector('"Ajouter une dépense"');

  const currentPath = await page.url();

  console.log('Expense successfully created at', currentPath);

  const inquirerResult = await inquirer.prompt<{ confirm: true }>([
    { type: 'confirm', message: 'Do you want to submit this invoice report ?', name: 'confirm' },
  ]);

  if (inquirerResult.confirm) {
    await page.click('"Envoyer cette note de frais"');

    await page.waitForSelector('"Voulez-vous envoyer cette note de frais ?"');

    await page.click('"Confirmer"');

    await page.waitForSelector('"En attente de validation @"');

    console.log('Successfully ');
  }
};
