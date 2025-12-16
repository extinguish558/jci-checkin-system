import { GoogleGenAI, Type } from "@google/genai";
import { read, utils } from "xlsx";
import { GuestCategory, ParsedGuestDraft } from "../types";

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
// These are normalized (no spaces, lowercase)
const INVALID_VALUES_NORMALIZED = [
    '姓名', 'name', 'name(english)', '會員姓名',
    '編號', '序號', 'code', 'id', 'no', 'no.',
    '職稱', 'title', 'position',
    '備註', 'note', 'remark',
    '類別', 'category', 'group',
    '簽名', 'signature', 'sign',
    'r1', 'r2', 'checkin'
];

// DIRECT EXCEL PARSER (Local) - Updated to support Multiple Sheets & SPLIT COLUMNS (Left/Right)
const parseExcelLocally = (base64Data: string): ParsedGuestDraft[] => {
    try {
        const workbook = read(base64Data, { type: 'base64' });
        const allDrafts: ParsedGuestDraft[] = [];

        console.log(`Excel loaded. Found ${workbook.SheetNames.length} sheets:`, workbook.SheetNames);

        // Store the column structure from the previous sheet to use as fallback
        let globalSections: ColumnSection[] | null = null;

        // Iterate through ALL sheets
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON array of arrays (header: 1 means raw array)
            const jsonData = utils.sheet_to_json<any[]>(worksheet, { header: 1 });
            
            if (jsonData.length === 0) {
                console.log(`Sheet "${sheetName}" is empty, skipping.`);
                continue;
            }

            let headerRowIndex = -1;
            let currentSections: ColumnSection[] = [];
            
            // 1. Scan for headers in this sheet
            // We look for ANY cell containing "姓名" or "Name"
            for (let i = 0; i < Math.min(jsonData.length, 50); i++) {
                const row = jsonData[i];
                if (!row) continue;
                
                // Find all indices where 'Name' appears (handling split layouts)
                const nameIndices: number[] = [];
                row.forEach((cell: any, idx: number) => {
                    const txt = String(cell || '').trim();
                    if (txt.includes('姓名') || txt.includes('會員姓名') || txt.toLowerCase() === 'name') {
                        nameIndices.push(idx);
                    }
                });

                if (nameIndices.length > 0) {
                    headerRowIndex = i;
                    
                    // For EACH "Name" column found, identify its surrounding columns (Code, Title, etc.)
                    // We look in a LARGER window around the Name column (e.g. +/- 10 columns) to catch far-away IDs
                    currentSections = nameIndices.map(nameIdx => {
                        const section: ColumnSection = {
                            nameIdx: nameIdx,
                            codeIdx: -1,
                            titleIdx: -1,
                            noteIdx: -1,
                            categoryIdx: -1
                        };

                        // Search window: 5 columns left, 8 columns right (Widened)
                        const start = Math.max(0, nameIdx - 5);
                        const end = Math.min(row.length, nameIdx + 8);

                        for (let c = start; c < end; c++) {
                            if (c === nameIdx) continue; // Skip self
                            
                            const txt = String(row[c] || '').trim();
                            const txtLower = txt.toLowerCase();

                            if (txt.includes('編號') || txt.includes('序號') || /^(code|id|no\.?)$/i.test(txt)) {
                                section.codeIdx = c;
                            }
                            else if (txt.includes('職稱') || /title/i.test(txtLower)) section.titleIdx = c;
                            else if (txt.includes('備註') || /note/i.test(txtLower)) section.noteIdx = c;
                            else if (txt.includes('類別') || /category/i.test(txtLower)) section.categoryIdx = c;
                        }
                        
                        return section;
                    });
                    
                    // Update global fallback
                    globalSections = currentSections;
                    break;
                }
            }

            // 2. Logic to determine start row and structure
            let startRow = 0;
            let finalSections: ColumnSection[] = [];

            if (headerRowIndex !== -1 && currentSections.length > 0) {
                // Headers found in this sheet
                console.log(`[Sheet: ${sheetName}] Headers found at row ${headerRowIndex}. Layout has ${currentSections.length} sections.`);
                startRow = headerRowIndex + 1;
                finalSections = currentSections;
            } else if (globalSections) {
                // Use previous sheet's structure
                console.log(`[Sheet: ${sheetName}] No headers found. Inheriting structure (${globalSections.length} sections) from previous sheet.`);
                startRow = 0;
                finalSections = globalSections;
            } else {
                console.warn(`[Sheet: ${sheetName}] Skipping - No headers found.`);
                continue;
            }

            // 3. Process data rows
            let sheetCount = 0;
            for (let i = startRow; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                // Iterate through each SECTION (Left side, Right side, etc.)
                for (const section of finalSections) {
                    const rawName = String(row[section.nameIdx] || '').trim();
                    
                    // VALIDATION LOGIC ENHANCED:
                    if (!rawName) continue;
                    
                    // Normalize the name (remove spaces, lowercase) to strictly filter headers
                    const normalizedName = rawName.replace(/\s+/g, '').toLowerCase();

                    // Check strictly against normalized blacklist
                    if (INVALID_VALUES_NORMALIZED.includes(normalizedName)) continue;

                    // Name shouldn't be just symbols (optional, but good for cleanup)
                    if (rawName.length < 2 && !/^[\u4e00-\u9fa5a-zA-Z0-9]+$/.test(rawName)) continue;

                    const code = section.codeIdx !== -1 ? String(row[section.codeIdx] || '').trim() : '';
                    const title = section.titleIdx !== -1 ? String(row[section.titleIdx] || '').trim() : '';
                    const note = section.noteIdx !== -1 ? String(row[section.noteIdx] || '').trim() : '';
                    
                    // Category logic
                    let category = GuestCategory.OTHER;
                    if (section.categoryIdx !== -1 && row[section.categoryIdx]) {
                        category = detectCategory(String(row[section.categoryIdx]));
                    } else {
                        // Auto-detect from Title, Note, or Sheet Name?
                        // If no explicit category column, check text.
                        // Also check if Sheet Name implies category (User often separates sheets by category)
                        const combinedInfo = `${title} ${note} ${sheetName}`; 
                        category = detectCategory(combinedInfo);
                    }

                    allDrafts.push({
                        code,
                        name: rawName,
                        title,
                        category,
                        note,
                        hasSignature: false
                    });
                    sheetCount++;
                }
            }
            console.log(`[Sheet: ${sheetName}] Parsed ${sheetCount} records.`);
        }
        
        console.log(`Total parsed records from all sheets: ${allDrafts.length}`);
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

    // Separate Excel files for local processing vs Images for AI processing
    for (const file of files) {
        const isSpreadsheet = 
            file.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimeType === 'application/vnd.ms-excel' ||
            file.mimeType === 'text/csv';

        if (isSpreadsheet) {
            // STRATEGY CHANGE: Parse Excel LOCALLY to handle large datasets (200+ rows) reliably
            console.log("Parsing spreadsheet locally...");
            const localDrafts = parseExcelLocally(file.data);
            results.push(...localDrafts);
        } else {
            // Collect images/PDFs for AI
            aiParts.push({
                inlineData: {
                    mimeType: file.mimeType,
                    data: file.data
                }
            });
        }
    }

    // If we have images, send them to Gemini
    if (aiParts.length > 0) {
        if (!ai) {
             throw new Error("Missing API Key for Image Recognition");
        }
        
        // Add instruction
        aiParts.push({
            text: mode === 'ROSTER' 
                ? "Extract ALL names from these documents. Ignore signatures." 
                : SYSTEM_INSTRUCTION_CHECKIN
        });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
    // If partial results exist (e.g. from Excel), return them instead of failing completely
    // But if logic failed, throw friendly error
    throw new Error("處理檔案失敗。如果是大量文字資料，請確認使用 Excel 格式上傳會更穩定。");
  }
};