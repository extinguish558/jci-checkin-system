
import { GoogleGenAI, Type } from "@google/genai";
import { read, utils, writeFile } from "xlsx";
import { GuestCategory, ParsedGuestDraft, Guest, McFlowStep, GiftItem } from "../types";

// Helper to determine category from string loosely
const detectCategory = (str: string = ''): GuestCategory => {
    const s = str.trim();
    if (s.includes('OB') || s.includes('特友')) return GuestCategory.MEMBER_OB;
    if (s.includes('YB') || s.includes('會友')) return GuestCategory.MEMBER_YB;
    if (s.includes('會長')) return GuestCategory.PAST_PRESIDENT;
    if (s.includes('主席')) return GuestCategory.PAST_CHAIRMAN;
    if (s.includes('總會')) return GuestCategory.HQ_GUEST;
    if (s.includes('政府') || s.includes('議員') || s.includes('長官')) return GuestCategory.GOV_OFFICIAL;
    if (s.includes('友會') || s.includes('聯誼會')) return GuestCategory.VISITING_CHAPTER;
    return GuestCategory.OTHER;
};

const SYSTEM_INSTRUCTION_MC_FLOW = `
You are an expert event planner. Your task is to parse an event schedule or MC flow document and convert it into a structured JSON list of steps.
Each step should have: time, title, description.
Return an array of objects.
`;

const SYSTEM_INSTRUCTION_GIFTS = `
You are an expert event coordinator. Your task is to parse a gift presentation list (禮品頒贈清單) or donor list.
Each entry should have:
1. **name**: The name of the gift or item.
2. **donor**: The person or organization giving the gift.
3. **recipient**: The target person, organization, or unit receiving it.

Return a clean JSON array of objects.
`;

export type ParseMode = 'CHECK_IN' | 'ROSTER' | 'MC_FLOW' | 'GIFTS';

export interface FileInput {
    data: string; // Base64
    mimeType: string;
}

export const parseCheckInSheet = async (files: FileInput[], mode: ParseMode = 'CHECK_IN'): Promise<ParsedGuestDraft[]> => {
  try {
    const results: ParsedGuestDraft[] = [];
    const aiParts: any[] = [];
    for (const file of files) {
        aiParts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
    }
    if (aiParts.length > 0) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: aiParts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
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
                }
            }
        });
        if (response.text) results.push(...JSON.parse(response.text));
    }
    return results;
  } catch (error) { throw new Error("處理檔案失敗。"); }
};

export const parseMcFlow = async (files: FileInput[]): Promise<McFlowStep[]> => {
  try {
    const aiParts: any[] = [];
    for (const file of files) {
      aiParts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    aiParts.push({ text: SYSTEM_INSTRUCTION_MC_FLOW });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: aiParts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              time: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["title"]
          }
        }
      }
    });
    if (response.text) {
      const parsed = JSON.parse(response.text);
      return parsed.map((p: any) => ({
        ...p,
        id: p.id || Math.random().toString(36).substr(2, 9),
        isCompleted: false
      }));
    }
    return [];
  } catch (error) { throw new Error("解析司儀流程失敗。"); }
};

export const parseGifts = async (files: FileInput[]): Promise<GiftItem[]> => {
  try {
    const aiParts: any[] = [];
    for (const file of files) {
      aiParts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    aiParts.push({ text: SYSTEM_INSTRUCTION_GIFTS });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: aiParts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              donor: { type: Type.STRING },
              recipient: { type: Type.STRING }
            },
            required: ["name", "donor", "recipient"]
          }
        }
      }
    });
    if (response.text) {
      const parsed = JSON.parse(response.text);
      return parsed.map((p: any) => ({
        ...p,
        id: p.id || Math.random().toString(36).substr(2, 9),
        isPresented: false
      }));
    }
    return [];
  } catch (error) { throw new Error("解析禮品清單失敗。"); }
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
