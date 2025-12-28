
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { Guest } from '../types';

/**
 * 生成單個 QR Code 的 Data URL
 */
export const generateQrDataUrl = async (url: string): Promise<string> => {
  try {
    if (!QRCode || typeof QRCode.toDataURL !== 'function') {
      throw new Error('QRCode library not loaded correctly');
    }
    return await QRCode.toDataURL(url, {
      width: 1024, 
      margin: 4, // 增加邊距，幫助相機對焦
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M' // 改為中等糾錯，使點陣變大，更容易掃描
    });
  } catch (err) {
    console.error('QR Code 生成失敗:', err);
    throw err;
  }
};

/**
 * 將所有賓客的 QR Code 打包成 ZIP 下載
 */
export const downloadAllQrAsZip = async (guests: Guest[], eventName: string) => {
  try {
    const zip = new JSZip();
    // 確保路徑結尾處理正確，避免出現雙斜線
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
    
    const tasks = guests.map(async (guest) => {
      try {
        const url = `${baseUrl}/?guestId=${guest.id}`;
        const dataUrl = await generateQrDataUrl(url);
        const base64Data = dataUrl.split(',')[1];
        
        const safeName = (guest.name || '未命名').replace(/[\\/:*?"<>|]/g, '_');
        const safeTitle = (guest.title || '貴賓').replace(/[\\/:*?"<>|]/g, '_');
        const filename = `${safeName}_${safeTitle}.png`;
        
        zip.file(filename, base64Data, { base64: true });
      } catch (e) {
        console.error(`處理賓客 ${guest.name} 時出錯:`, e);
      }
    });

    await Promise.all(tasks);
    
    const content = await zip.generateAsync({ type: 'blob' });
    const zipFilename = `${eventName || '活動'}_個人報到QRCode全集.zip`;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = zipFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    return true;
  } catch (err) {
    console.error('ZIP 打包失敗:', err);
    throw err;
  }
};
