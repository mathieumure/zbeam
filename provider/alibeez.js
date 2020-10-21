export const createExpenseReport = async ({ getBrowser, downloads }) => {

    const browser = await getBrowser({headless: false});
    const page = await browser.newPage();
    await page.goto('https://zenika.my.alibeez.com/');

    await page.waitForSelector('"Se connecter avec Google"');
    await page.click('"Se connecter avec Google"')

    await page.waitForSelector('"Saisir une note de frais"');
    await page.click('"Saisir une note de frais"')

    await page.waitForSelector('"Nouvelle note de frais"')

    await page.fill('.v-formlayout input', 'Facture téléphone ' + downloads.date.month + ' ' + downloads.date.year)
    await page.click('"Sélectionner..."');
    await page.click('.tuning-datefield-calendar .currentmonth');
    await page.click('"Créer"');

    await page.waitForSelector('"Ajouter une dépense"')

    const formRows = await page.$$('#add-expense-window .v-formlayout-row');

    await (await formRows[0].$('input')).fill('Facture téléphone')

    await (await formRows[2].$('"Sélectionner..."')).click()
    await page.waitForSelector('.v-popupbutton-popup')

    await page.type('.v-popupbutton-popup input', 'INT_TELEPHONE')
    await page.click('"INT_TELEPHONE"')

    const amount = Math.min(25, downloads.amount).toString()
    const inputAmountId = await page.$eval("'Montant déclaré TTC'", node => node.parentNode.getAttribute('for'))
    await page.focus('#' + inputAmountId)
    await page.waitForTimeout(200);
    await page.fill('#' + inputAmountId, amount)

    await page.click('"Sélectionner le type de dépense"')
    await page.waitForSelector('.v-popupbutton-popup')
    await page.click('"TELEPHONE"')

    await page.click('"Ajouter un justificatif"')
    await page.waitForSelector('"Sélectionner un fichier sur cet ordinateur"')
    await page.setInputFiles('.v-csslayout-upload-field input[type="file"]', downloads.downloadPath)
    await page.waitForSelector('#add-bill .v-textfield-readonly')

    await page.click('#add-bill #submit')

    await page.waitForSelector('"Remplacer le justificatif"')

    await page.click('#add-expense-window #submit');

    await page.click('"Envoyer cette note de frais"')

    await page.waitForSelector('"Voulez-vous envoyer cette note de frais ?"')

    await page.click('"Confirmer"')

    await page.waitForSelector('"En attente de validation @"')
}