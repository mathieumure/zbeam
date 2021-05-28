export type Provider = {
  login: () => Promise<boolean>;
  download: (option: { downloadDirectory: string }) => Promise<boolean>;
};
