import { BrowserContext, BrowserContextOptions } from 'playwright/types/types.js';
import { firefox } from 'playwright';
import path from 'path';

let currentBrowser: BrowserContext;
export const getBrowser = async (options?: BrowserContextOptions & { headless?: boolean }) => {
  await closeBrowser();

  const userDataDir = path.join(path.dirname(''), 'userDataDir');
  currentBrowser = await firefox.launchPersistentContext(userDataDir, options);

  return currentBrowser;
};

export const closeBrowser = async () => {
  if (currentBrowser) {
    await currentBrowser.close();
  }
};