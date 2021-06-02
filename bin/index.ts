#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import { download, providerMap, report } from '../src/engine.js';
import { closeBrowser } from '../src/service/browser.service.js';

const program = new Command();

program
  .command('download [invoiceProvider]')
  .description('Download named invoice provider')
  .action(async (invoiceProvider) => {
    if (!invoiceProvider) {
      const result = await inquirer.prompt<{ askedInvoiceProvider: string }>({
        type: 'list',
        message: 'Wich invoice',
        name: 'askedInvoiceProvider',
        choices: Object.keys(providerMap),
      });
      invoiceProvider = result.askedInvoiceProvider;
    }

    try {
      await download(invoiceProvider);
    } finally {
      await closeBrowser();
    }
  });

program
  .command('report <invoicePath>')
  .description('Upload and create invoice report')
  .action(async (invoicePath) => {
    try {
      await report(invoicePath);
    } finally {
      await closeBrowser();
    }
  });

program.parse();
