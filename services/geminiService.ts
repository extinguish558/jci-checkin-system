
import { GoogleGenAI, Type } from "@google/genai";
import { read, utils, writeFile } from "xlsx";
import { GuestCategory, ParsedGuestDraft, Guest } from "../types";

// Helper to determine category from string loosely
const detectCategory = (str: string = ''): GuestCategory => {
    const s = str.trim();
    if (s.includes('OB') || s.includes('特友')) return GuestCategory.MEMBER_OB;
    if (s.includes('YB') || s.includes('會友')) return GuestCategory.MEMBER_YB;
    if (s.includes('會長')) return GuestCategory.PAST_PRESIDENT;
    if (s.includes('主席')) return GuestCategory.PAST_CHAIRMAN;
    if (s.includes('總會')) return GuestCategory.HQ_GUEST;
    if (s.includes('政府') || s.includes('議員') || s.includes('長官')) return GuestCategory.GOV_OFFICIAL;
    if (s.includes('友會')) return GuestCategory.VISITING_CHAPTER;
    // Default fallback
    return GuestCategory.OTHER;
};

// Initialize Gemini safely
let ai: GoogleGenAI | null = null;
if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} else {
    console.warn("API_KEY not found in process.env. Image recognition will fail.");
}

// Prompt for Check-in Mode (Looking for signatures)
const SYSTEM_INSTRUCTION_CHECKIN = `
You are an expert event assistant AI. Your task is to extract guest information from the provided **Signed Check-in Sheets** (Images or PDFs).

The list typically has columns for ID/Code, Name, Title, and a "Signature" or "Check-in" area. 
Please identify and process inputs from ALL pages provided:

1. **Code (編號/序號)**: Extract the original ID number from the list (e.g., "1", "10", "OB-005"). Do NOT generate a new one. If missing, return empty string.
2. **Name (姓名)**
3. **Title (職稱)**: 
   - If the title contains a year in ROC format (e.g., "112", "113"), CONVERT it to Western Year (AD) (e.g., 113 -> 2024).
   - If missing, return empty string "".
4. **Category (類別)**: 
   - Detect "YB" (Young Business) or "OB" (Old Boy) in headers/watermarks.
   - Infer from title: '歷屆會長', '歷屆主席', '總會貴賓', '政府貴賓', '友會來訪', etc.
5. **hasSignature** (boolean): 
   - **CRITICAL**: Return **true** ONLY if there is a visible handwritten signature, checkmark, or stamp in the signature column.
   - Return **false** if the signature area is blank.

Return the data as a clean, single flat JSON array containing results from all pages.
`;

export type ParseMode = 'CHECK_IN' | 'ROSTER';

export interface FileInput {
    data: string; // Base64
    mimeType: string;
}

// Define a "Section" map for multi-column layouts (e.g., Left Side, Right Side)
interface ColumnSection {
    nameIdx: number;
    codeIdx: number;
    titleIdx: number;
    noteIdx: number;
    categoryIdx: number;
}

// Blocklist for values that look like headers but appear in data rows
const INVALID_VALUES_NORMALIZED = [
    '姓名', 'name', 'name(english)', '會員姓名',
    '編號', '序號', 'code', 'id', 'no', 'no.',
    '職稱', 'title', 'position',
    '備註', 'note', 'remark',
    '類別', 'category', 'group',
    '簽名', 'signature', 'sign',
    'r1', 'r2', 'checkin'
];

// EXCEL EXPORT FUNCTION
export const exportToExcel = (guests: Guest[], eventName: string) => {
    const wb = utils.book_new();
    
    // 定義 UI 顯示的分組定義
    const visitingKeywords = ['母會', '兄弟會', '分會', '友好會', '姐妹會', '姊妹會', '聯誼會'];
    const hqKeywords = ['總會'];

    const getGroupKey = (g: Guest): string => {
        const title = g.title || '';
        const category = g.category;
        if (category === GuestCategory.MEMBER_YB) return '會友 YB';
        if (category === GuestCategory.MEMBER_OB) return '特友 OB';
        if (category === GuestCategory.HQ_GUEST || hqKeywords.some(k => title.includes(k))) return '總會貴賓';
        if (category === GuestCategory.VISITING_CHAPTER || visitingKeywords.some(k => title.includes(k))) return '友會貴賓';
        return '貴賓 VIP';
    };

    // 使用者指定的排序順序
    const groupOrder = ['會友 YB', '特友 OB', '總會貴賓', '友會貴賓', '貴賓 VIP'];

    // 依據分組進行匯出
    groupOrder.forEach(groupName => {
        const groupGuests = guests.filter(g => getGroupKey(g) === groupName);
        if (groupGuests.length > 0) {
            // 關鍵更新：分頁內依據編號 (Code) 進行自然排序
            const sortedGuests = [...groupGuests].sort((a, b) => {
                const codeA = a.code || '';
                const codeB = b.code || '';
                if (codeA || codeB) {
                    return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
                }
                return (a.checkInTime || '').localeCompare(b.checkInTime || '');
            });

            const data = sortedGuests.map(g => ({
                '編號': g.code || '',
                '姓名': g.name,
                '職稱': g.title,
                '原始類別': g.category,
                '備註': g.note || '',
                '狀態': g.isCheckedIn ? '已報到' : '未報到',
                'R1': g.attendedRounds?.includes(1) ? 'V' : '',
                'R2': g.attendedRounds?.includes(2) ? 'V' : '',
                '報到時間': g.checkInTime ? new Date(g.checkInTime).toLocaleString('zh-TW') : ''
            }));

            const ws = utils.json_to_sheet(data);
            const wscols = [{wch: 10}, {wch: 15}, {wch: 25}, {wch: 15}, {wch: 20}, {wch: 10}, {wch: 5}, {wch: 5}, {wch: 25}];
            ws['!cols'] = wscols;
            
            utils.book_append_sheet(wb, ws, groupName);
        }
    });

    // 2. 中獎名單分頁
    const winnersData = guests
        .filter(g => g.isWinner || (g.wonRounds && g.wonRounds.length > 0))
        .flatMap(g => {
            const rounds = g.wonRounds && g.wonRounds.length > 0 
                ? g.wonRounds 
                : (g.winRound ? [g.winRound] : []);
            
            return rounds.map(r => ({
                '中獎輪次': `第 ${r} 輪`,
                '姓名': g.name,
                '職稱': g.title,
                '分組': getGroupKey(g),
                '編號': g.code || ''
            }));
        })
        .sort((a, b) => {
             const roundA = parseInt(a['中獎輪次'].replace(/\D/g, '')) || 0;
             const roundB = parseInt(b['中獎輪次'].replace(/\D/g, '')) || 0;
             if (roundA !== roundB) return roundA - roundB;
             // 同輪次中獎者依編號排序
             return a['編號'].localeCompare(b['編號'], undefined, { numeric: true });
        });

    if (winnersData.length > 0) {
        const wsWinners = utils.json_to_sheet(winnersData);
        wsWinners['!cols'] = [{wch: 15}, {wch: 15}, {wch: 25}, {wch: 15}, {wch: 10}];
        utils.book_append_sheet(wb, wsWinners, "中獎名單紀錄");
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const safeName = eventName.replace(/[^\w\s\u4e00-\u9fa5]/gi, '').trim() || 'Event';
    writeFile(wb, `${safeName}_分組報到明細_${dateStr}.xlsx`);
};

// DIRECT EXCEL PARSER (Local)
const parseExcelLocally = (base64Data: string): ParsedGuestDraft[] => {
    try {
        const workbook = read(base64Data, { type: 'base64' });
        const allDrafts: ParsedGuestDraft[] = [];

        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = utils.sheet_to_json<any[]>(worksheet, { header: 1 });
            
            if (jsonData.length === 0) continue;

            let headerRowIndex = -1;
            let currentSections: ColumnSection[] = [];
            
            for (let i = 0; i < Math.min(jsonData.length, 50); i++) {
                const row = jsonData[i];
                if (!row) continue;
                
                const nameIndices: number[] = [];
                row.forEach((cell: any, idx: number) => {
                    const txt = String(cell || '').trim();
                    if (txt.includes('姓名') || txt.includes('會員姓名') || txt.toLowerCase() === 'name') {
                        nameIndices.push(idx);
                    }
                });

                if (nameIndices.length > 0) {
                    headerRowIndex = i;
                    currentSections = nameIndices.map(nameIdx => {
                        const section: ColumnSection = { nameIdx: nameIdx, codeIdx: -1, titleIdx: -1, noteIdx: -1, categoryIdx: -1 };
                        const start = Math.max(0, nameIdx - 5);
                        const end = Math.min(row.length, nameIdx + 8);
                        for (let c = start; c < end; c++) {
                            if (c === nameIdx) continue;
                            const txt = String(row[c] || '').trim();
                            const txtLower = txt.toLowerCase();
                            if (txt.includes('編號') || txt.includes('序號') || /^(code|id|no\.?)$/i.test(txt)) section.codeIdx = c;
                            else if (txt.includes('職稱') || /title/i.test(txtLower)) section.titleIdx = c;
                            else if (txt.includes('備註') || /note/i.test(txtLower)) section.noteIdx = c;
                            else if (txt.includes('類別') || /category/i.test(txtLower)) section.categoryIdx = c;
                        }
                        return section;
                    });
                    break;
                }
            }

            if (headerRowIndex === -1) continue;

            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                for (const section of currentSections) {
                    const rawName = String(row[section.nameIdx] || '').trim();
                    if (!rawName) continue;
                    
                    const normalizedName = rawName.replace(/\s+/g, '').toLowerCase();
                    if (INVALID_VALUES_NORMALIZED.includes(normalizedName)) continue;

                    const code = section.codeIdx !== -1 ? String(row[section.codeIdx] || '').trim() : '';
                    const title = section.titleIdx !== -1 ? String(row[section.titleIdx] || '').trim() : '';
                    const note = section.noteIdx !== -1 ? String(row[section.noteIdx] || '').trim() : '';
                    
                    let category = GuestCategory.OTHER;
                    if (section.categoryIdx !== -1 && row[section.categoryIdx]) {
                        category = detectCategory(String(row[section.categoryIdx]));
                    } else {
                        category = detectCategory(`${title} ${note} ${sheetName}`);
                    }

                    allDrafts.push({ code, name: rawName, title, category, note, hasSignature: false });
                }
            }
        }
        return allDrafts;
    } catch (e) {
        console.error("Local Excel Parse Error:", e);
        return [];
    }
};

export const parseCheckInSheet = async (
    files: FileInput[], 
    mode: ParseMode = 'CHECK_IN'
): Promise<ParsedGuestDraft[]> => {
  try {
    if (files.length === 0) return [];
    const results: ParsedGuestDraft[] = [];
    const aiParts: any[] = [];

    for (const file of files) {
        const isSpreadsheet = 
            file.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimeType === 'application/vnd.ms-excel' ||
            file.mimeType === 'text/csv';

        if (isSpreadsheet) {
            const localDrafts = parseExcelLocally(file.data);
            results.push(...localDrafts);
        } else {
            aiParts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
        }
    }

    if (aiParts.length > 0) {
        if (!ai) throw new Error("Missing API Key for Image Recognition");
        aiParts.push({ text: mode === 'ROSTER' ? "Extract ALL names from these documents. Ignore signatures." : SYSTEM_INSTRUCTION_CHECKIN });
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
                            note: { type: Type.STRING }
                        },
                        required: ["name", "category", "hasSignature"]
                    }
                }
            }
        });
        const text = response.text;
        if (text) {
            const aiDrafts = JSON.parse(text) as ParsedGuestDraft[];
            results.push(...aiDrafts);
        }
    }
    return results;
  } catch (error) {
    console.error("Parsing Error:", error);
    throw new Error("處理檔案失敗。如果是大量文字資料，請確認使用 Excel 格式上傳會更穩定。");
  }
};
