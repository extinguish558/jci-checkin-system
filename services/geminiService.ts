
import { GoogleGenAI, Type } from "@google/genai";
import { read, utils, writeFile } from "xlsx";
import { GuestCategory, ParsedGuestDraft, Guest, McFlowStep, GiftItem, Sponsorship } from "../types";

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

const getValue = (row: any, keys: string[], index?: number): string => {
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null) return row[key].toString().trim();
    }
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
            const s = categoryStr.toUpperCase();
            // 增強型分類邏輯：確保 OB/YB 關鍵字優先匹配
            if (s.includes('OB') || s.includes('特友')) {
              category = GuestCategory.MEMBER_OB;
            } else if (s.includes('YB') || s.includes('會友')) {
              category = GuestCategory.MEMBER_YB;
            } else if (s.includes('會長')) {
              category = GuestCategory.PAST_PRESIDENT;
            } else if (s.includes('主席')) {
              category = GuestCategory.PAST_CHAIRMAN;
            } else {
              const matched = Object.values(GuestCategory).find(val => categoryStr.includes(val));
              if (matched) category = matched;
            }
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
        const json: any[] = utils.sheet_to_json(worksheet);
        const rows: any[][] = utils.sheet_to_json(worksheet, { header: 1 });
        const dataRows = rows.slice(1);

        const steps: McFlowStep[] = json.map((row: any, idx: number) => {
          const rawRow = dataRows[idx] || [];
          const rawDValue = rawRow[3] ? rawRow[3].toString().trim() : "";
          return {
            id: Math.random().toString(36).substr(2, 9),
            sequence: getValue(row, ['序', '序號', 'A']) || (idx + 1).toString(),
            time: getValue(row, ['時間', 'Time', 'B']),
            title: getValue(row, ['程序', '程序名稱', '項目', '標題', 'D']) || rawDValue || '⚠️ 請檢查Excel程序欄位',
            script: getValue(row, ['司儀搞', '司儀稿', '腳本', 'Script', 'G']),
            slides: getValue(row, ['簡報頁面', 'PPT', 'C']),
            isCompleted: false
          };
        }).filter(s => s.title !== '');
        resolve(steps);
      } catch (err) { reject(new Error("司儀講稿解析失敗")); }
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

const formatTime = (iso?: string) => iso ? new Date(iso).toLocaleString('zh-TW', { hour12: false }) : '';

const formatGuestForExcel = (g: Guest) => ({
    '編號': g.code || '',
    '姓名': g.name,
    '職稱': g.title || '',
    '類別': g.category,
    '報到狀態': g.isCheckedIn ? '✅ 已報到' : '❌ 未報到',
    '報到時間': formatTime(g.checkInTime),
    '報到輪次': (g.attendedRounds || []).map(r => `R${r}`).join(', '),
    '司儀介紹': g.isIntroduced ? '🎤 已介紹' : '⏳ 待介紹',
    '中獎狀態': g.isWinner ? '🏆 已得獎' : '-',
    '得獎輪次': (g.wonRounds || []).map(r => `R${r}`).join(', '),
    '備註': g.note || ''
});

export const exportFinalActivityReport = (guests: Guest[], gifts: GiftItem[], steps: McFlowStep[], sponsorships: Sponsorship[], eventName: string) => {
    const wb = utils.book_new();
    const today = new Date().toLocaleDateString('zh-TW').replace(/\//g, '');

    const sortedGuests = [...guests].sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }));
    const sortedGifts = [...gifts].sort((a, b) => (a.sequence || '').localeCompare(b.sequence || '', undefined, { numeric: true }));
    const sortedSteps = [...steps].sort((a, b) => (a.sequence || '').localeCompare(b.sequence || '', undefined, { numeric: true }));

    const guestData = sortedGuests.map(formatGuestForExcel);
    const guestWs = utils.json_to_sheet(guestData);
    utils.book_append_sheet(wb, guestWs, '人員報到總表');

    const categories = Object.values(GuestCategory);
    categories.forEach(cat => {
        const list = sortedGuests.filter(g => g.category === cat);
        if (list.length > 0) {
            const ws = utils.json_to_sheet(list.map(formatGuestForExcel));
            utils.book_append_sheet(wb, ws, cat.substring(0, 31));
        }
    });

    const giftData = sortedGifts.map(i => ({
        '序號': i.sequence || '',
        '禮品名稱': i.name,
        '數量': i.quantity || '1',
        '受獎單位': i.recipient,
        '頒發狀態': i.isPresented ? '✅ 已頒發' : '⏳ 待頒發',
        '頒獎時間': formatTime(i.presentedAt)
    }));
    const giftWs = utils.json_to_sheet(giftData);
    utils.book_append_sheet(wb, giftWs, '禮品頒贈進度');

    const flowData = sortedSteps.map(s => ({
        '序號': s.sequence || '',
        '預計時間': s.time || '',
        '程序名稱': s.title,
        '司儀講稿': s.script || '',
        '簡報頁面': s.slides || '',
        '執行狀態': s.isCompleted ? '✅ 已完成' : '⏳ 執行中',
        '完成時間': formatTime(s.completedAt)
    }));
    const flowWs = utils.json_to_sheet(flowData);
    utils.book_append_sheet(wb, flowWs, '活動程序講稿');

    const sponsorData = sponsorships.sort((a, b) => a.timestamp.localeCompare(b.timestamp)).map(s => ({
        '姓名': s.name,
        '職稱': s.title || '',
        '贊助品項': s.itemName || '現金',
        '贊助金額': s.amount || 0,
        '登記時間': formatTime(s.timestamp)
    }));
    const sponsorWs = utils.json_to_sheet(sponsorData);
    utils.book_append_sheet(wb, sponsorWs, '贊助芳名錄');

    const winnerData = sortedGuests.filter(g => g.isWinner).map(g => ({
        '姓名': g.name,
        '職稱': g.title,
        '類別': g.category,
        '中獎輪次': (g.wonRounds || []).map(r => `R${r}`).join(', '),
        '中獎時間詳情': JSON.stringify(g.wonTimes || {})
    }));
    const winnerWs = utils.json_to_sheet(winnerData);
    utils.book_append_sheet(wb, winnerWs, '抽獎中獎名冊');

    writeFile(wb, `${eventName}_活動成果總報告_${today}.xlsx`);
};
