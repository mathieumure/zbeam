import { BrowserContext, BrowserContextOptions } from 'playwright/types/types.js';
import { firefox } from 'playwright';
import path from 'path';

let currentBrowser: BrowserContext;
export const getBrowser = async (
  options: BrowserContextOptions & { headless?: boolean } = { locale: 'fr-FR', headless: false }
): Promise<BrowserContext> => {
  await closeBrowser();

  const userDataDir = path.join(path.dirname(''), 'userDataDir');
  currentBrowser = await firefox.launchPersistentContext(userDataDir, options);

  return currentBrowser;
};

export const closeBrowser = async (): Promise<void> => {
  if (currentBrowser) {
    await currentBrowser.close();
  }
};
