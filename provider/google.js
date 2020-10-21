import readline from "readline";

const GOOGLE_NAMESPACE = 'google'

export const loginGoogleInit = async ({ keytar, getKeyStoreNamespace }) => {
    const googleAccountCreds = await keytar.findCredentials(getKeyStoreNamespace(GOOGLE_NAMESPACE));

    if (googleAccountCreds.length > 0) {
        return true;
    }

    console.log('You never connect to your google account before.');
    return new Promise(resolve => {
        const prompt = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        prompt.question('Please enter your google email: ', email => {
            prompt.question('Password: ', async password => {
                await keytar.setPassword(getKeyStoreNamespace(GOOGLE_NAMESPACE), email, password);

                prompt.close()
                resolve()
            });
        })
    })
}

export const loginGoogle = async ({getBrowser, keytar, getKeyStoreNamespace}) => {
    let browser = await getBrowser();
    let page = await browser.newPage();

    await page.goto('https://accounts.google.com/signin/v2/identifier?flowName=GlifWebSignIn&flowEntry=ServiceLogin');

    const redirectedUrl = page.url();
    if (redirectedUrl.startsWith('https://myaccount.google.com/')) {
        console.log('Successfully auto connected into your google account.')
        return true;
    }

    console.log('It seems you are not logged in your google account anymore. Trying to autoconnect you');
    await browser.close();

    browser = await getBrowser();
    page = await browser.newPage();
    await page.goto('https://accounts.google.com/signin/v2/identifier?flowName=GlifWebSignIn&flowEntry=ServiceLogin');

    const credentials = await keytar.findCredentials(getKeyStoreNamespace(GOOGLE_NAMESPACE));

    await page.fill('input[type="email"]', credentials[0].account)
    await page.click('"Suivant"')
    await page.fill('input[type="password"]', credentials[0].password)
    await page.click('"Suivant"')

    const response = await page.waitForResponse(response => {
        return response.url().startsWith('https://accounts.google.com/_/signin/challenge')
    })
    const responseBody = await response.body();
    const hasTwoStepVerification = responseBody.toString().includes('TWO_STEP_VERIFICATION')
    await page.waitForNavigation();

    if (!hasTwoStepVerification && page.url().startsWith('https://myaccount.google.com/')) {
        console.log('Autoconnect successfull!')
        await page.screenshot({path: 'test.png'})
    } else {
        console.log('It seems you activated 2FA, waiting for you, to authorized this browser');
        try {
            await page.waitForNavigation()
            console.log('Successfully connected into your Google account!')
        } catch (err) {
            throw err;
        }
    }
}