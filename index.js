// Node > 13
import playwright from 'playwright'
import path from 'path'

import {downloadBouyguesInvoice, loginBouygues, loginBouyguesInit} from "./provider/bouygues.js";
import {createExpenseReport} from "./provider/alibeez.js";
import config from './config.js'
import keytar from 'keytar'
import {loginGoogleInit, loginGoogle} from "./provider/google.js";
import {generateKeystoreNamespace} from "./utils.js";

const __dirname = path.resolve();

const browserType = config.browserType || 'chromium';

const openedBrowsers = []
const getBrowser = async (options) => {
    const newBrowser = await playwright[browserType].launchPersistentContext(path.join(__dirname, 'userDataDir'), options);
    openedBrowsers.push(newBrowser);
    return newBrowser;
}

const cleanup = () => Promise.all(openedBrowsers.map(browser => browser.close()));

(async () => {
    const downloadDirectory = path.join(__dirname, config.invoice.directory)
    const getKeyStoreNamespace = generateKeystoreNamespace();

    const initScripts = [
        loginGoogleInit,
        loginBouyguesInit
    ]
    const loginScripts = [
        loginGoogle,
        loginBouygues
    ]

    try {

        for (const script of initScripts) {
            await script({ keytar, getKeyStoreNamespace });
            await cleanup()
        }

        for (const script of loginScripts) {
            await script({ getBrowser, getKeyStoreNamespace, keytar });
            await cleanup()
        }

        const downloads = await downloadBouyguesInvoice({ getBrowser, downloadDirectory });
        await cleanup();

        await createExpenseReport({ getBrowser, downloads })

    } catch (err) {
        console.error(err)
        await cleanup()
    }

})()