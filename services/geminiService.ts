
import { GoogleGenAI, Type } from "@google/genai";
import { read, utils, writeFile } from "xlsx";
import { GuestCategory, ParsedGuestDraft, Guest, McFlowStep, GiftItem } from "../types";

const SYSTEM_INSTRUCTION_CHECK_IN = `
你是一位專業的活動報到管理專家。請分析提供的圖片或文件，識別其中的簽名、姓名、職稱及報到狀態。
請將辨識結果轉換為 JSON 格式，包含姓名、職稱、類別以及是否已簽名（報到狀態）。
`;

export interface FileInput {
    data: string;
    mimeType: string;
}

async function callGemini(aiParts: any[], systemInstruction: string, responseSchema: any) {
  if (!process.env.API_KEY) {
      throw new Error("API KEY 缺失");
  }
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
    return JSON.parse(response.text || '{}');
  } catch (error: any) {
    throw new Error(`AI 解析失敗: ${error.message}`);
  }
}

// 通用的欄位抓取工具：支援多種名稱及欄位索引
const getValue = (row: any, keys: string[], index?: number): string => {
    // 1. 嘗試根據 key 抓取
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null) return row[key].toString().trim();
    }
    // 2. 如果提供了 index (從 0 開始)，嘗試根據 Excel 原始欄位索引抓取 (用於處理表頭名稱不符)
    // sheet_to_json 預設不會保留 index，除非使用 header: 1
    return "";
};

export const parseGuestsFromExcel = async (file: File): Promise<ParsedGuestDraft[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[] = utils.sheet_to_json(worksheet);
        const drafts: ParsedGuestDraft[] = json.map((row: any) => {
          const name = getValue(row, ['姓名', 'Name', '人員']);
          const title = getValue(row, ['職稱', 'Title', '職位']);
          const categoryStr = getValue(row, ['類別', '分組', 'Category']);
          const code = getValue(row, ['編號', '序號', 'Code']);
          
          let category = GuestCategory.OTHER;
          if (categoryStr) {
            const matched = Object.values(GuestCategory).find(val => categoryStr.includes(val));
            if (matched) category = matched;
          }
          return { name, title, category, code, hasSignature: false };
        }).filter(d => d.name !== '');
        resolve(drafts);
      } catch (err) { reject(new Error("人員清單解析失敗")); }
    };
    reader.readAsBinaryString(file);
  });
};

export const parseGiftsFromExcel = async (file: File): Promise<GiftItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[] = utils.sheet_to_json(worksheet);
        const items: GiftItem[] = json.map((row: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          sequence: getValue(row, ['序', '序號', 'A']),
          name: getValue(row, ['程序', '項目', '禮品', 'D']) || '未命名禮品',
          quantity: getValue(row, ['數量', '1']),
          recipient: getValue(row, ['受獎人', '單位']),
          isPresented: false
        }));
        resolve(items);
      } catch (err) { reject(new Error("禮品清單解析失敗")); }
    };
    reader.readAsBinaryString(file);
  });
};

export const parseMcFlowFromExcel = async (file: File): Promise<McFlowStep[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // 為了極限相容性，我們同時獲取 JSON 格式（抓 Key）與 陣列格式（抓 Index）
        const json: any[] = utils.sheet_to_json(worksheet);
        const rows: any[][] = utils.sheet_to_json(worksheet, { header: 1 });
        
        // 移除表頭列 (第一列)
        const dataRows = rows.slice(1);

        const steps: McFlowStep[] = json.map((row: any, idx: number) => {
          // 抓取 D 欄位 (索引為 3) 的原始數據作為備援
          const rawRow = dataRows[idx] || [];
          const rawDValue = rawRow[3] ? rawRow[3].toString().trim() : ""; // D 欄位是第四格

          return {
            id: Math.random().toString(36).substr(2, 9),
            // A 欄位
            sequence: getValue(row, ['序', '序號', 'A']) || (idx + 1).toString(),
            // B 欄位
            time: getValue(row, ['時間', 'Time', 'B']),
            // D 欄位 (核心：程序名稱)
            title: getValue(row, ['程序', '程序名稱', '項目', '標題', 'D']) || rawDValue || '⚠️ 請檢查Excel程序欄位',
            // G 欄位 (腳本)
            script: getValue(row, ['司儀搞', '司儀稿', '腳本', 'Script', 'G']),
            // C 欄位/其他
            slides: getValue(row, ['簡報頁面', 'PPT', 'C']),
            isCompleted: false
          };
        }).filter(s => s.title !== '');
        
        resolve(steps);
      } catch (err) { 
        console.error(err);
        reject(new Error("司儀講稿解析失敗，請確保 Excel 格式正確。")); 
      }
    };
    reader.readAsBinaryString(file);
  });
};

export const parseCheckInSheet = async (files: FileInput[]): Promise<ParsedGuestDraft[]> => {
  const aiParts = files.map(file => ({ inlineData: { mimeType: file.mimeType, data: file.data } }));
  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        title: { type: Type.STRING },
        category: { type: Type.STRING, enum: Object.values(GuestCategory) },
        hasSignature: { type: Type.BOOLEAN }
      },
      required: ["name", "category", "hasSignature"]
    }
  };
  return await callGemini(aiParts, SYSTEM_INSTRUCTION_CHECK_IN, schema);
};

export const exportDetailedGuestsExcel = (guests: Guest[], eventName: string, getGroupFn: (g: Guest) => string) => {
    const wb = utils.book_new();
    const categories = [{ key: 'YB', label: '會友' }, { key: 'OB', label: '特友' }, { key: 'HQ', label: '總會' }, { key: 'VISITING', label: '友會' }, { key: 'VIP', label: '貴賓' }];
    categories.forEach(cat => {
        const list = guests.filter(g => getGroupFn(g) === cat.key);
        const ws = utils.json_to_sheet(list.map(g => ({ '姓名': g.name, '職稱': g.title, '狀態': g.isCheckedIn ? '已報到' : '未報到' })));
        utils.book_append_sheet(wb, ws, cat.label);
    });
    writeFile(wb, `${eventName}_名冊.xlsx`);
};

export const exportGiftsExcel = (items: GiftItem[], eventName: string) => {
    const ws = utils.json_to_sheet(items);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, '禮品');
    writeFile(wb, `${eventName}_禮品.xlsx`);
};

export const exportMcFlowExcel = (steps: McFlowStep[], eventName: string) => {
    const ws = utils.json_to_sheet(steps);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, '流程');
    writeFile(wb, `${eventName}_講稿.xlsx`);
};

export const exportIntroductionsExcel = (guests: Guest[], eventName: string) => {
    const ws = utils.json_to_sheet(guests.filter(g => g.isCheckedIn));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, '介紹');
    writeFile(wb, `${eventName}_介紹.xlsx`);
};

export const exportLotteryExcel = (guests: Guest[], eventName: string) => {
    const ws = utils.json_to_sheet(guests.filter(g => g.isWinner));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, '得獎');
    writeFile(wb, `${eventName}_抽獎.xlsx`);
};
