import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import readline from "readline";
const _rename = promisify(fs.rename)

const BOUYGUES_NAMESPACE = 'bouygues'

export const loginBouyguesInit = async ({ keytar, getKeyStoreNamespace }) => {
    const bouyguesCreds = await keytar.findCredentials(getKeyStoreNamespace(BOUYGUES_NAMESPACE));

    if (bouyguesCreds.length > 0) {
        return true;
    }

    console.log('You never connect to your Bouygues account before.');
    return new Promise(resolve => {
        const prompt = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        prompt.question('Please enter your Bouygues id: ', email => {
            prompt.question('Please enter your lastName', lastName => {
                prompt.question('Password: ', async password => {
                    await keytar.setPassword(getKeyStoreNamespace(BOUYGUES_NAMESPACE), email + '::' + lastName, password);

                    prompt.close()
                    resolve()
                });
            })
        })
    })
}

export const loginBouygues = async ({ getBrowser, keytar, getKeyStoreNamespace }) => {
    const browser = await getBrowser();
    const credentials = await keytar.findCredentials(getKeyStoreNamespace(BOUYGUES_NAMESPACE));

    const page = await browser.newPage();
    await page.goto('https://www.bouyguestelecom.fr/mon-compte/mes-factures');
    await page.waitForLoadState('networkidle')
    if (page.url() === 'https://www.bouyguestelecom.fr/mon-compte/mes-factures#') {
        console.log('Successfully auto connected in your Bouygues account!');
        return true;
    }

    let authFrame = await page.frame({ name: 'bycIframe' });

    console.log('Log into bouygues user space...')
    const [account, lastname] = credentials[0].account.split('::')
    await authFrame.fill('#passepartout #lastname', lastname)
    await authFrame.fill('#passepartout #username', account)
    await authFrame.fill('#passepartout #password', credentials[0].password)
    const submitButton = await authFrame.$('#passepartout button[type="submit"]');
    await submitButton.click()

    await page.waitForLoadState('networkidle');

    if (page.url() === 'https://www.bouyguestelecom.fr/mon-compte/mes-factures#') {
        console.log('Successfully connected in your Bouygues account!');
        return true;
    } else {
        throw new Error("Can't connect into your Bouygues account, check your credentials");
    }
}

export const downloadBouyguesInvoice = async ({ getBrowser, downloadDirectory }) => {
    const browser = await getBrowser({ acceptDownloads: true });
    const page = await browser.newPage();
    await page.goto('https://www.bouyguestelecom.fr/mon-compte/mes-factures');
    await page.waitForLoadState('networkidle');

    const lastInvoiceSelector = '[data-ui="invoices-table"] .factureLine.first-of-month.PAYE';
    console.log('Listing all available invoices...')
    await page.waitForSelector(lastInvoiceSelector)
    console.log('All available invoices successfully loaded!')

    const titleWrapper = await page.$(`${lastInvoiceSelector} .monthWrapper`)
    const rawTitle = await titleWrapper.textContent();
    const title = rawTitle.trim()

    const priceWrapper = await page.$(`${lastInvoiceSelector} [data-key="price"]`)
    const rawPrice = await priceWrapper.textContent();
    const priceStr = rawPrice.trim().replace("€", ".");
    const price = parseFloat(priceStr)

    console.log('Downloading last invoice...')
    await page.hover(lastInvoiceSelector)
    const lastMonthDownloadLink = await page.$(`${lastInvoiceSelector} .action-download a`);

    const [download] = await Promise.all([
        page.waitForEvent('download'),
        lastMonthDownloadLink.click()
    ])

    // wait for download to complete
    const downloadPath = await download.path();
    const invoicePath = path.join(downloadDirectory, title + '.pdf')
    await _rename(downloadPath, invoicePath)
    console.log('Successfully downloading invoice ' + title + ' !')

    return {name: 'bouygues', downloadPath: invoicePath, amount: price, date: title}
}