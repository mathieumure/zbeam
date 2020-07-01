// Node > 13
import playwright from 'playwright'
import path from 'path'

import {downloadInvoice} from "./bouygues.js";
import config from './config.js'

const __dirname = path.resolve();

(async () => {
    const downloadDirectory = path.join(__dirname, config.invoice.directory)
    const browser = await playwright.chromium.launch({downloadsPath: downloadDirectory});

    try {
        const invoicePath = await downloadInvoice({ browser, downloadDirectory: downloadDirectory, config: config.invoice });
    } finally {
        if (browser) {
            await browser.close();
        }
    }

})()