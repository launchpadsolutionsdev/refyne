const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

async function extractText(filePath, originalFilename) {
  const ext = getFileExtension(originalFilename);

  switch (ext) {
    case '.txt':
    case '.md':
      return extractPlainText(filePath);
    case '.csv':
      return extractCsv(filePath);
    case '.pdf':
      return extractPdf(filePath);
    case '.docx':
      return extractDocx(filePath);
    case '.html':
    case '.htm':
      return extractHtml(filePath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

async function extractPlainText(filePath) {
  return fs.promises.readFile(filePath, 'utf-8');
}

async function extractCsv(filePath) {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());
  if (lines.length === 0) return '';

  const header = lines[0];
  const rows = lines.slice(1);

  // Format as readable text: each row becomes a labeled entry
  const headers = header.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

  const entries = rows.map((row, i) => {
    const values = parseCsvRow(row);
    const fields = headers
      .map((h, j) => `${h}: ${(values[j] || '').trim()}`)
      .join('\n');
    return `--- Row ${i + 1} ---\n${fields}`;
  });

  return entries.join('\n\n');
}

function parseCsvRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function extractPdf(filePath) {
  const buffer = await fs.promises.readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function extractHtml(filePath) {
  const html = await fs.promises.readFile(filePath, 'utf-8');
  // Strip HTML tags and decode common entities
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

module.exports = { extractText };
