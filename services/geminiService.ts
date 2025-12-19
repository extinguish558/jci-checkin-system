
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
  // 每次調用時初始化，確保讀取到最新的環境變數
  if (!process.env.API_KEY) {
      console.error("Gemini API Key is missing in process.env");
      throw new Error("系統環境變數中未偵測到有效的 API KEY，請檢查設定。");
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
    
    if (!response || !response.text) {
        throw new Error("模型回傳空內容，請檢查圖片清晰度或網絡連線。");
    }
    
    return JSON.parse(response.text);
  } catch (error: any) {
    console.error("Gemini API Error Detail:", error);
    // 針對常見錯誤進行中文語義化處理
    let errMsg = error.message || '未知錯誤';
    if (errMsg.includes("API_KEY_INVALID")) errMsg = "API KEY 無效或已過期";
    if (errMsg.includes("Quota exceeded")) errMsg = "API 調用次數已達今日上限";
    
    throw new Error(`AI 解析失敗: ${errMsg}`);
  }
}

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
          const name = row['姓名'] || row['Name'] || row['人員'] || '';
          const title = row['職稱'] || row['Title'] || row['職位'] || '';
          const categoryStr = row['類別'] || row['分組'] || row['Category'] || '其他貴賓';
          const code = row['編號'] || row['學號'] || row['Code'] || '';
          const note = row['備註'] || row['Note'] || '';
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
            hasSignature: false
          };
        }).filter(d => d.name !== '');
        resolve(drafts);
      } catch (err) {
        reject(new Error("Excel 人員名單解析失敗"));
      }
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
          sequence: (row['序'] || row['序號'] || '').toString(),
          name: (row['項目'] || row['禮品'] || '未命名').toString(),
          quantity: (row['數量'] || '1').toString(),
          recipient: (row['受獎人'] || '現場嘉賓').toString(),
          isPresented: false
        }));
        resolve(items);
      } catch (err) { reject(new Error("Excel 解析失敗")); }
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
        const json: any[] = utils.sheet_to_json(worksheet);
        const steps: McFlowStep[] = json.map((row: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          sequence: (row['序'] || '').toString(),
          time: (row['時間'] || '').toString(),
          title: (row['項目'] || row['標題'] || '未命名').toString(),
          script: (row['司儀搞'] || row['司儀稿'] || '').toString(),
          slides: (row['簡報頁面'] || '').toString(),
          isCompleted: false
        }));
        resolve(steps);
      } catch (err) { reject(new Error("Excel 解析失敗")); }
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

export const exportDetailedGuestsExcel = (guests: Guest[], eventName: string, getGroupFn: (g: Guest) => string) => {
    const wb = utils.book_new();
    const categories = [
      { key: 'YB', label: '會友 YB' },
      { key: 'OB', label: '特友 OB' },
      { key: 'HQ', label: '總會貴賓' },
      { key: 'VISITING', label: '友會貴賓' },
      { key: 'VIP', label: '貴賓 VIP' }
    ];

    categories.forEach(cat => {
        const list = guests
            .filter(g => getGroupFn(g) === cat.key)
            .sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }));
        
        const data = list.map(g => ({
            '編號': g.code || '',
            '姓名': g.name,
            '職稱': g.title,
            '類別': g.category,
            '狀態': g.isCheckedIn ? '已報到' : '未報到',
            '報到梯次': g.attendedRounds?.join(', ') || '',
            '報到時間': g.checkInTime || '',
            '備註': g.note || ''
        }));
        
        const ws = utils.json_to_sheet(data);
        utils.book_append_sheet(wb, ws, cat.label);
    });

    writeFile(wb, `${eventName}_嘉賓名冊.xlsx`);
};

export const exportGiftsExcel = (items: GiftItem[], eventName: string) => {
    const data = items.map(i => ({
        '序': i.sequence || '',
        '禮品名稱': i.name,
        '數量': i.quantity || '',
        '受獎人': i.recipient,
        '負責人': i.personInCharge || '',
        '狀態': i.isPresented ? '【已領取】' : '待領取'
    }));
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, '禮品頒贈清單');
    writeFile(wb, `${eventName}_禮品狀態.xlsx`);
};

export const exportMcFlowExcel = (steps: McFlowStep[], eventName: string) => {
    const data = steps.map(s => ({
        '序': s.sequence || '',
        '時間': s.time || '',
        '流程項目': s.title,
        '簡報內容': s.slides || '',
        '狀態': s.isCompleted ? '【已完成】' : '進行中/待處理'
    }));
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, '司儀講稿');
    writeFile(wb, `${eventName}_司儀講稿.xlsx`);
};

export const exportIntroductionsExcel = (guests: Guest[], eventName: string) => {
    const present = guests.filter(g => g.isCheckedIn && g.title && !g.title.includes('見習'));
    const data = present.map(g => ({
        '姓名': g.name,
        '職稱': g.title,
        '類別': g.category,
        '介紹狀態': g.isIntroduced ? '【已介紹】' : '待介紹'
    })).sort((a,b) => a.介紹狀態.localeCompare(b.介紹狀態));
    
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, '貴賓介紹清單');
    writeFile(wb, `${eventName}_介紹現況.xlsx`);
};

export const exportLotteryExcel = (guests: Guest[], eventName: string) => {
    const wb = utils.book_new();
    const rounds = Array.from(new Set(guests.flatMap(g => g.wonRounds || []))).sort((a,b) => a-b);
    rounds.forEach(r => {
        const roundWinners = guests.filter(g => g.wonRounds?.includes(r)).map(g => ({
            '輪次': `第 ${r} 輪`,
            '姓名': g.name,
            '職稱': g.title
        }));
        const ws = utils.json_to_sheet(roundWinners);
        utils.book_append_sheet(wb, ws, `第 ${r} 輪得獎`);
    });

    const summary = guests.filter(g => g.isWinner).map(g => ({
        '姓名': g.name,
        '職稱': g.title,
        '總得獎次數': g.wonRounds?.length || 0,
        '得獎輪次': g.wonRounds?.join(', ') || ''
    })).sort((a,b) => b.總得獎次數 - a.總得獎次數);
    
    const wsSum = utils.json_to_sheet(summary);
    utils.book_append_sheet(wb, wsSum, '中獎統計總表');

    writeFile(wb, `${eventName}_抽獎結果.xlsx`);
};
