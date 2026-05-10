import * as XLSX from "xlsx";

/**
 * Reads first sheet column A as email strings (same behavior as legacy app).
 * @param {File} file
 * @returns {Promise<string[]>}
 */
export function parseExcelEmailsFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: "A" });
        const emails = rows
          .map((item) =>
            typeof item.A === "string" ? item.A.trim() : item.A != null ? String(item.A).trim() : "",
          )
          .filter((addr) => addr.length > 0);
        resolve(emails);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error || new Error("File read failed"));
    reader.readAsArrayBuffer(file);
  });
}
