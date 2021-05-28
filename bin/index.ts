#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import { download } from '../src/download.js';
import { closeBrowser } from '../src/browser.service.js';
import { createInvoiceReport } from '../src/invoice-report.js';

const program = new Command();

try {
  program
    .command('download [invoiceProvider]')
    .description('Download named invoice provider')
    .action(async (invoiceProvider) => {
      if (!invoiceProvider) {
        const result = await inquirer.prompt<{ askedInvoiceProvider: string }>({
          type: 'list',
          message: 'Wich invoice',
          name: 'askedInvoiceProvider',
          choices: ['bouygues', 'sosh'],
        });
        invoiceProvider = result.askedInvoiceProvider;
      }

      await download(invoiceProvider);
      await closeBrowser();
    });

  program
    .command('report <invoicePath>')
    .description('Upload and create invoice report')
    .action(async (invoicePath) => {
      await createInvoiceReport(invoicePath);
      await closeBrowser();
    });

  program.parse();
} catch (e) {
  console.error(e);
  closeBrowser();
}
