import inquirer from 'inquirer';
import { getBrowser } from './service/browser.service.js';
import path from 'path';
import { InvoiceMetaData } from './types.js';
import chalk from 'chalk';

const getRelatedMonthText = (month: string): string => {
  switch (month) {
    case '01':
      return 'Janv.';
    case '02':
      return 'Févr.';
    case '03':
      return 'Mars';
    case '04':
      return 'Avr.';
    case '05':
      return 'Mai';
    case '06':
      return 'Juin';
    case '07':
      return 'Juil.';
    case '08':
      return 'Août';
    case '09':
      return 'Sept.';
    case '10':
      return 'Oct.';
    case '11':
      return 'Nov.';
    case '12':
      return 'Déc.';
    default:
      return null;
  }
};

export const createInvoiceReport = async (invoicePath: string, metadata: InvoiceMetaData): Promise<void> => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.goto('https://zenika.my.alibeez.com/');

  await page.waitForSelector('"Se connecter avec Google"');
  await page.click('"Se connecter avec Google"');

  await page.waitForSelector('"Saisir une note de frais"');
  await page.click('"Saisir une note de frais"');

  await page.waitForSelector('"Nouvelle note de frais"');

  await page.fill('.v-formlayout input', `Facture téléphone ${metadata.month}/${metadata.year}`);
  await page.click('"Sélectionner..."');
  await page.click(`.tuning-datefield-calendar td:has-text("${getRelatedMonthText(metadata.month)}")`);
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
  await page.focus(`#${inputAmountId}`);
  await page.waitForTimeout(200);
  await page.fill(`#${inputAmountId}`, amount);

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

  const currentPath = page.url();

  console.log('Expense successfully created at', currentPath);
  console.log(chalk.green(`\n🎉 Expense successfully created at ${chalk.yellow(currentPath)}\n`));

  const inquirerResult = await inquirer.prompt<{ confirm: true }>([
    { type: 'confirm', message: 'Do you want to submit this invoice report ?', name: 'confirm' },
  ]);

  if (inquirerResult.confirm) {
    await page.click('"Envoyer cette note de frais"');

    await page.waitForSelector('"Voulez-vous envoyer cette note de frais ?"');

    await page.click('"Confirmer"');

    await page.waitForSelector('"En attente de validation @"');

    console.log(chalk.green(`\n🎉 Invoice successfully submitted!\n`));
  }
};
