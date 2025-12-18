
import { GoogleGenAI, Type } from "@google/genai";
import { read, utils, writeFile } from "xlsx";
import { GuestCategory, ParsedGuestDraft, Guest, McFlowStep, GiftItem } from "../types";

// 系統提示詞定義 (用於 AI 辨識手寫簽單)
const SYSTEM_INSTRUCTION_CHECK_IN = `
你是一位專業的活動報到管理專家。請分析提供的圖片或文件，識別其中的簽名、姓名、職稱及報到狀態。
請將辨識結果轉換為 JSON 格式，包含姓名、職稱、類別以及是否已簽名（報到狀態）。
`;

export interface FileInput {
    data: string; // Base64
    mimeType: string;
}

/**
 * 通用的 Gemini 調用封裝 (僅用於圖片/PDF 辨識)
 */
async function callGemini(aiParts: any[], systemInstruction: string, responseSchema: any) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: aiParts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        thinkingConfig: { thinkingBudget: 0 }
      },
    });

    if (!response.text) {
      throw new Error("模型未回傳任何內容。");
    }

    return JSON.parse(response.text);
  } catch (error: any) {
    console.error("Gemini API Error Detail:", error);
    throw new Error(`Gemini API 調用失敗: ${error.message || '未知錯誤'}`);
  }
}

/**
 * 直接從 Excel 解析人員名單 (非 AI)
 */
export const parseGuestsFromExcel = async (file: File): Promise<ParsedGuestDraft[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = utils.sheet_to_json(worksheet);
        
        const drafts: ParsedGuestDraft[] = json.map((row: any) => {
          // 欄位名稱映射與容錯處理
          const name = row['姓名'] || row['Name'] || row['人員'] || '';
          const title = row['職稱'] || row['Title'] || row['職位'] || '';
          const categoryStr = row['類別'] || row['分組'] || row['Category'] || '其他貴賓';
          const code = row['編號'] || row['學號'] || row['Code'] || '';
          const note = row['備註'] || row['Note'] || '';
          
          // 嘗試匹配類別列舉
          let category = GuestCategory.OTHER;
          if (categoryStr) {
            const matched = Object.values(GuestCategory).find(val => categoryStr.includes(val));
            if (matched) category = matched;
          }

          return {
            name: name.toString().trim(),
            title: title.toString().trim(),
            category: category,
            code: code.toString().trim(),
            note: note.toString().trim(),
            hasSignature: false // Excel 匯入預設視為未報到
          };
        }).filter(d => d.name !== '');

        resolve(drafts);
      } catch (err) {
        reject(new Error("Excel 人員名單解析失敗，請確保標題包含：姓名、職稱。"));
      }
    };
    reader.onerror = () => reject(new Error("檔案讀取失敗"));
    reader.readAsBinaryString(file);
  });
};

/**
 * 直接從 Excel 解析禮品清單 (非 AI)
 */
export const parseGiftsFromExcel = async (file: File): Promise<GiftItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = utils.sheet_to_json(worksheet);
        
        const items: GiftItem[] = json.map((row: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: (row['禮品名稱'] || row['禮品'] || row['項目'] || row['Name'] || '未命名禮品').toString(),
          donor: (row['贈送人'] || row['單位'] || row['Donor'] || '未知單位').toString(),
          recipient: (row['受贈人'] || row['受贈對象'] || row['Recipient'] || '現場嘉賓').toString(),
          isPresented: false
        }));
        resolve(items);
      } catch (err) {
        reject(new Error("Excel 解析失敗，請確保標題包含：禮品名稱、贈送人、受贈人。"));
      }
    };
    reader.onerror = () => reject(new Error("檔案讀取失敗"));
    reader.readAsBinaryString(file);
  });
};

/**
 * 直接從 Excel 解析活動流程 (非 AI)
 */
export const parseMcFlowFromExcel = async (file: File): Promise<McFlowStep[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = utils.sheet_to_json(worksheet);
        
        const steps: McFlowStep[] = json.map((row: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          time: (row['時間'] || row['Time'] || '').toString(),
          title: (row['標題'] || row['項目'] || row['Title'] || '未命名環節').toString(),
          description: (row['內容'] || row['描述'] || row['備註'] || row['Description'] || '').toString(),
          isCompleted: false
        }));
        resolve(steps);
      } catch (err) {
        reject(new Error("Excel 解析失敗，請確保標題包含：時間、標題、內容。"));
      }
    };
    reader.onerror = () => reject(new Error("檔案讀取失敗"));
    reader.readAsBinaryString(file);
  });
};

/**
 * AI 簽到辨識 (僅用於處理照片或 PDF 掃描檔)
 */
export const parseCheckInSheet = async (files: FileInput[]): Promise<ParsedGuestDraft[]> => {
  const aiParts = files.map(file => ({
    inlineData: { mimeType: file.mimeType, data: file.data }
  }));

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        code: { type: Type.STRING },
        name: { type: Type.STRING },
        title: { type: Type.STRING },
        category: { type: Type.STRING, enum: Object.values(GuestCategory) },
        hasSignature: { type: Type.BOOLEAN },
        forcedRound: { type: Type.INTEGER },
        note: { type: Type.STRING }
      },
      required: ["name", "category", "hasSignature"]
    }
  };

  return await callGemini(aiParts, SYSTEM_INSTRUCTION_CHECK_IN, schema);
};

export const exportToExcel = (guests: Guest[], eventName: string) => {
    const wb = utils.book_new();
    const data = guests.map(g => ({
        '編號': g.code || '',
        '姓名': g.name,
        '職稱': g.title,
        '狀態': g.isCheckedIn ? '已報到' : '未報到'
    }));
    const ws = utils.json_to_sheet(data);
    utils.book_append_sheet(wb, ws, '報到明細');
    writeFile(wb, `${eventName}_報到明細.xlsx`);
};
