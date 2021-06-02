import { DownloadInfo, InvoiceMetaData } from '../types.js';

export const generateInvoiceName = (downloadInfo: DownloadInfo): string =>
  `${downloadInfo.year}-${downloadInfo.month}-${downloadInfo.price}.pdf`;

export const getInvoiceInfo = (invoiceName: string): InvoiceMetaData => {
  const metadata = /(?<year>\d{4})-(?<month>\d{2})-(?<price>[\d.]+)\.pdf/.exec(invoiceName)?.groups;
  return {
    year: metadata.year,
    month: metadata.month,
    price: metadata.price,
  };
};
