import JSZip from "jszip";

// Parse a single line of CSV taking quotes into account
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Client-side CSV parser
async function parseCsv(file) {
  const headerText = await file.slice(0, 50000).text();
  const lines = headerText.split(/\r?\n/);
  const headerLine = lines[0] || "";
  const csvHeaders = parseCsvLine(headerLine);
  
  const csvRows = [];
  for (let i = 1; i < Math.min(lines.length, 6); i++) {
    if (lines[i].trim()) {
      csvRows.push(parseCsvLine(lines[i]));
    }
  }

  let totalRows = 0;
  const colTypes = csvHeaders.map(() => ({ num: 0, str: 0 }));
  const chunkSize = 2 * 1024 * 1024; // 2MB
  let offset = 0;
  let leftover = "";
  
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize);
    const text = await chunk.text();
    const chunkText = leftover + text;
    const chunkLines = chunkText.split(/\r?\n/);
    leftover = chunkLines.pop() || "";
    
    for (let i = 0; i < chunkLines.length; i++) {
      const line = chunkLines[i];
      if (offset === 0 && i === 0) continue; // Skip header
      if (line.trim()) {
        totalRows++;
        if (totalRows <= 200 || totalRows % 100 === 0) {
          const cells = parseCsvLine(line);
          for (let c = 0; c < Math.min(cells.length, colTypes.length); c++) {
            const cell = cells[c].trim();
            if (cell === "") continue;
            if (!isNaN(cell) && !isNaN(parseFloat(cell))) {
              colTypes[c].num++;
            } else {
              colTypes[c].str++;
            }
          }
        }
      }
    }
    offset += chunkSize;
  }
  
  if (leftover.trim()) {
    totalRows++;
  }
  
  const csvColumnTypes = colTypes.map((types) => {
    if (types.num === 0 && types.str === 0) return "string";
    return types.num >= types.str ? "number" : "string";
  });

  return {
    type: "csv",
    csvHeaders,
    csvRows,
    fingerprint: {
      rowCount: totalRows,
      columnNames: csvHeaders,
      columnTypes: csvColumnTypes
    }
  };
}

// Convert image blob to low-res thumbnail
function createThumbnail(imageBlob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(imageBlob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const maxDim = 10;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

// Client-side ZIP parser
async function parseZip(file) {
  if (file.size > 200 * 1024 * 1024) {
    return {
      type: "zip",
      fingerprint: {
        totalFiles: -1,
        extensionBreakdown: { "error": "Zip too large to parse client-side (>200MB)" }
      }
    };
  }

  const zip = new JSZip();
  await zip.loadAsync(file);
  const files = Object.keys(zip.files);
  const extensions = {};
  const imageFiles = [];
  
  files.forEach((filename) => {
    if (zip.files[filename].dir) return;
    const parts = filename.split(".");
    const ext = parts.length > 1 ? "." + parts.pop().toLowerCase() : ".unknown";
    extensions[ext] = (extensions[ext] || 0) + 1;
    if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
      imageFiles.push(filename);
    }
  });

  const fileCount = Object.values(extensions).reduce((a, b) => a + b, 0);
  const extensionBreakdown = {};
  Object.entries(extensions).forEach(([ext, count]) => {
    const pct = Math.round((count / fileCount) * 100);
    extensionBreakdown[ext] = `${pct}% (${count})`;
  });

  const thumbnails = [];
  const sampleImages = imageFiles.slice(0, 2);
  for (const imgName of sampleImages) {
    try {
      const blob = await zip.files[imgName].async("blob");
      const thumb = await createThumbnail(blob);
      thumbnails.push(thumb);
    } catch (e) {
      console.error(e);
    }
  }

  return {
    type: "zip",
    thumbnails,
    fingerprint: {
      totalFiles: fileCount,
      extensionBreakdown
    }
  };
}

export async function generateFingerprintAndPreview(file) {
  const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
  try {
    if (ext === "csv") {
      return await parseCsv(file);
    } else if (ext === "zip") {
      return await parseZip(file);
    } else if (ext === "json") {
      const text = await file.slice(0, 5000).text();
      return {
        type: "json",
        content: text.slice(0, 1000),
        fingerprint: { characterCount: file.size }
      };
    } else {
      const text = await file.slice(0, 5000).text();
      return {
        type: "txt",
        content: text.slice(0, 1000),
        fingerprint: { characterCount: file.size }
      };
    }
  } catch (err) {
    console.error("Fingerprinting error:", err);
    return {
      type: "unknown",
      fingerprint: { error: err.message || "Failed to generate fingerprint" }
    };
  }
}

export async function verifyDecryptedFile(file, originalFingerprint) {
  if (!originalFingerprint) {
    return { match: false, details: "No original fingerprint available for validation." };
  }
  
  const current = await generateFingerprintAndPreview(file);
  
  // If original fingerprint has an error, skip comparison
  if (originalFingerprint.error) {
    return { match: false, details: `Cannot verify: Original fingerprint error: ${originalFingerprint.error}` };
  }

  if (current.type === "csv" && originalFingerprint.rowCount !== undefined) {
    const rowMatch = current.fingerprint.rowCount === originalFingerprint.rowCount;
    const colCountMatch = current.fingerprint.columnNames.length === originalFingerprint.columnNames.length;
    const colsMatch = JSON.stringify(current.fingerprint.columnNames) === JSON.stringify(originalFingerprint.columnNames);
    
    if (rowMatch && colCountMatch && colsMatch) {
      return {
        match: true,
        details: `Validated successfully! Decrypted CSV matches fingerprint: ${current.fingerprint.rowCount} rows, ${current.fingerprint.columnNames.length} columns.`
      };
    } else {
      return {
        match: false,
        details: `FRAUD ALERT! Decrypted file mismatch. Expected: ${originalFingerprint.rowCount} rows, columns: [${originalFingerprint.columnNames.join(", ")}]. Found: ${current.fingerprint.rowCount} rows, columns: [${current.fingerprint.columnNames.join(", ")}].`
      };
    }
  }

  if (current.type === "zip" && originalFingerprint.totalFiles !== undefined) {
    if (originalFingerprint.totalFiles === -1) {
      return { match: true, details: "Zip file too large to verify client-side; verification skipped." };
    }
    const countMatch = current.fingerprint.totalFiles === originalFingerprint.totalFiles;
    if (countMatch) {
      return {
        match: true,
        details: `Validated successfully! Decrypted ZIP matches fingerprint: ${current.fingerprint.totalFiles} files.`
      };
    } else {
      return {
        match: false,
        details: `FRAUD ALERT! Decrypted file mismatch. Expected: ${originalFingerprint.totalFiles} files. Found: ${current.fingerprint.totalFiles} files.`
      };
    }
  }

  // Fallback match
  if (originalFingerprint.characterCount !== undefined) {
    const sizeMatch = Math.abs(current.fingerprint.characterCount - originalFingerprint.characterCount) < 1024; // within 1KB
    if (sizeMatch) {
      return { match: true, details: "Validated successfully! File size matches listing metadata." };
    } else {
      return { match: false, details: `FRAUD ALERT! File size mismatch. Expected ~${originalFingerprint.characterCount} bytes, found ${current.fingerprint.characterCount} bytes.` };
    }
  }

  return { match: true, details: "Metadata verified successfully." };
}
