import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
const _rename = promisify(fs.rename)

export const downloadInvoice = async ({browser, downloadDirectory, config}) => {
    const context = await browser.newContext({acceptDownloads: true});
    const page = await context.newPage();
    await page.goto('https://www.bouyguestelecom.fr/mon-compte/mes-factures');

    const authFrame = await page.frame({ name: 'bycIframe' });

    console.log('Log into bouygues user space...')
    await authFrame.fill('#passepartout #username', config.username)
    await authFrame.fill('#passepartout #password', config.password)
    const submitButton = await authFrame.$('#passepartout button[type="submit"]');
    await submitButton.click()
    await page.waitForSelector('#invoice-notification')

    const invoiceLink = await page.$('#invoice-notification')

    console.log('Successfully logged in!')
    await invoiceLink.click()

    const lastInvoiceSelector = '[data-ui="invoices-table"] .factureLine.first-of-month.PAYE';
    console.log('Listing all available invoices...')
    await page.waitForSelector(lastInvoiceSelector)
    console.log('All available invoices successfully loaded!')

    const titleWrapper = await page.$(`${lastInvoiceSelector} .monthWrapper`)
    const rawTitle = await titleWrapper.textContent();
    const title = rawTitle.trim()

    console.log('Downloading last invoice...')
    await page.hover(lastInvoiceSelector)
    const lastMonthDownloadLink = await page.$(`${lastInvoiceSelector} .linkWrapper.action-download`);

    const [download] = await Promise.all([
        page.waitForEvent('download'),
        lastMonthDownloadLink.click()])

    // wait for download to complete
    const downloadPath = await download.path();
    const invoicePath = path.join(downloadDirectory, title + '.pdf')
    await _rename(downloadPath, invoicePath)
    console.log('Successfully downloading invoice ' + title + ' !')

    return invoicePath
}