
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { Guest } from '../types';

export const generateQrDataUrl = async (url: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('QR Code 生成失敗', err);
    return '';
  }
};

export const downloadAllQrAsZip = async (guests: Guest[], eventName: string) => {
  const zip = new JSZip();
  const baseUrl = window.location.origin + window.location.pathname;
  
  const tasks = guests.map(async (guest) => {
    const url = `${baseUrl}?guestId=${guest.id}`;
    const dataUrl = await generateQrDataUrl(url);
    const base64Data = dataUrl.split(',')[1];
    
    // 檔名：姓名_職稱.png (移除不合法字元)
    const safeName = guest.name.replace(/[\\/:*?"<>|]/g, '');
    const safeTitle = (guest.title || '貴賓').replace(/[\\/:*?"<>|]/g, '');
    const filename = `${safeName}_${safeTitle}.png`;
    
    zip.file(filename, base64Data, { base64: true });
  });

  await Promise.all(tasks);
  
  const content = await zip.generateAsync({ type: 'blob' });
  const zipFilename = `${eventName}_個人報到QRCode全集.zip`;
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = zipFilename;
  link.click();
  URL.revokeObjectURL(link.href);
};
