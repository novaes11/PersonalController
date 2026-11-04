const zlib = require('zlib');
const crypto = require('crypto');

const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_INFLATED_STREAM_BYTES = 10 * 1024 * 1024; // 10 MB anti-ZipBomb (AppSec)

const PT_MONTHS = {
  JAN: '01',
  FEV: '02',
  MAR: '03',
  ABR: '04',
  MAI: '05',
  JUN: '06',
  JUL: '07',
  AGO: '08',
  SET: '09',
  OUT: '10',
  NOV: '11',
  DEZ: '12'
};

const IGNORED_LINE_PATTERNS = [
  /\bSALDO\s+(ANTERIOR|ATUAL|FINAL|DO\s+DIA|PARCIAL|DISPON[IÍ]VEL|BLOQUEADO)\b/i,
  /\bTOTAL\s+(DA\s+FATURA|DE\s+LAN[CÇ]AMENTOS|DO\s+PER[IÍ]ODO|GERAL)\b/i,
  /\bLIMITE\s+(TOTAL|DISPON[IÍ]VEL|DE\s+CR[EÉ]DITO)\b/i,
  /\bENCARGOS\s+ROTATIVOS\b/i,
  /\bPAGAMENTO\s+M[IÍ]NIMO\b/i
];

const INCOME_KEYWORD_PATTERNS = [
  /\b(SAL[AÁ]RIO|PR[OÓ][-\s]?LABORE|REMUNERA[CÇ][AÃ]O)\b/i,
  /\b(PIX\s+RECEBIDO|TED\s+RECEBIDA|DOC\s+RECEBIDO|TRANSFER[EÊ]NCIA\s+RECEBIDA|CR[EÉ]DITO\s+EM\s+CONTA)\b/i,
  /\b(DIVIDENDOS?|JCP|JUROS\s+SOBRE\s+CAPITAL|RENDIMENTOS?|RESGATE)\b/i,
  /\b(REEMBOLSO|ESTORNO\s+DE\s+COMPRA|CASHBACK)\b/i
];

const EXPENSE_KEYWORD_PATTERNS = [
  /\b(PIX\s+ENVIADO|TED\s+ENVIADA|PAGAMENTO\s+DE\s+BOLETO|COMPRA\s+CART[AÃ]O|D[EÉ]BITO\s+AUTOM[AÁ]TICO)\b/i,
  /\b(TARIFA|ANUIDADE|IOF|SAQUE)\b/i
];

const CATEGORY_RULES = [
  {
    category: 'Alimentação',
    type: 'EXPENSE',
    confidence: 0.92,
    keywords: [
      'IFOOD', 'RESTAURANTE', 'SUPERMERCADO', 'MERCADO', 'PADARIA', 'LANCHONETE',
      'BURGER', 'PIZZA', 'CAFETERIA', 'CAFE', 'ASSAI', 'CARREFOUR', 'PAO DE ACUCAR',
      'UBER EATS', 'RAPPI', 'OUTBACK', 'MCDONALDS', 'HABIBS', 'ACOUGUE', 'HORTIFRUTI'
    ]
  },
  {
    category: 'Transporte',
    type: 'EXPENSE',
    confidence: 0.91,
    keywords: [
      'UBER', '99POP', '99APP', '99 TAXI', 'POSTO', 'COMBUSTIVEL', 'GASOLINA',
      'SHELL', 'IPIRANGA', 'PETROBRAS', 'ESTACIONAMENTO', 'SEM PARAR', 'VELOE',
      'CONECTCAR', 'PEDAGIO', 'LATAM', 'AZUL', 'GOL LINHAS', 'METRO', 'ONIBUS'
    ]
  },
  {
    category: 'Moradia',
    type: 'EXPENSE',
    confidence: 0.93,
    keywords: [
      'ALUGUEL', 'CONDOMINIO', 'IMOBILIARIA', 'ENERGIA', 'ELETRICA', 'ENEL',
      'COPEL', 'CEMIG', 'LIGHT', 'SABESP', 'SANEPAR', 'AGUA', 'ESGOTO', 'GAS',
      'COMGAS', 'IPTU', 'VIVO', 'CLARO', 'TIM', 'OI FIBRA', 'INTERNET'
    ]
  },
  {
    category: 'Saúde',
    type: 'EXPENSE',
    confidence: 0.90,
    keywords: [
      'FARMACIA', 'DROGASIL', 'DROGARIA', 'RAIA', 'PANVEL', 'PAGUE MENOS',
      'HOSPITAL', 'CLINICA', 'LABORATORIO', 'UNIMED', 'BRADESCO SAUDE', 'SULAMERICA',
      'CONSULTA', 'EXAME', 'ODONTO', 'DENTISTA', 'ACADEMIA', 'SMARTFIT', 'GYMPASS', 'WELLHUB'
    ]
  },
  {
    category: 'Lazer',
    type: 'EXPENSE',
    confidence: 0.89,
    keywords: [
      'NETFLIX', 'SPOTIFY', 'AMAZON PRIME', 'DISNEY', 'HBO', 'MAX', 'YOUTUBE',
      'APPLE.COM/BILL', 'GOOGLE PLAY', 'STEAM', 'PLAYSTATION', 'XBOX', 'NINTENDO',
      'CINEMA', 'CINEMARK', 'INGRESSO', 'SYMPLA', 'EVENTIM', 'SHOW', 'BAR'
    ]
  },
  {
    category: 'Investimentos',
    type: 'EXPENSE',
    confidence: 0.88,
    keywords: [
      'TESOURO DIRETO', 'APORTE', 'CDB', 'LCI', 'LCA', 'CORRETORA', 'B3',
      'NUINVEST', 'XP INVESTIMENTOS', 'BTG PACTUAL', 'RICO', 'CLEAR', 'BINANCE'
    ]
  },
  {
    category: 'Salário',
    type: 'INCOME',
    confidence: 0.94,
    keywords: [
      'SALARIO', 'PRO-LABORE', 'PRO LABORE', 'REMUNERACAO', 'FOLHA DE PAGAMENTO',
      'ADIANTAMENTO SALARIAL', 'DECIMO TERCEIRO', '13 SALARIO'
    ]
  },
  {
    category: 'Renda Extra & Dividendos',
    type: 'INCOME',
    confidence: 0.88,
    keywords: [
      'DIVIDENDOS', 'JCP', 'RENDIMENTO', 'PIX RECEBIDO', 'TED RECEBIDA',
      'TRANSFERENCIA RECEBIDA', 'REEMBOLSO', 'CASHBACK', 'FREELANCE'
    ]
  }
];

function round2(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function removeAccents(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Decodifica sequências de escape de strings literais da especificação PDF.
 */
function decodePdfLiteralString(raw) {
  return String(raw || '')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

/**
 * Extrai strings de operadores tipográficos PostScript/PDF: (...) Tj e [...] TJ.
 */
function extractTextFromPdfOperators(streamContent) {
  const lineTokens = [];
  const tokenRegex = /\((?:\\.|[^\\()])*\)\s*Tj|\[([\s\S]*?)\]\s*TJ|\((?:\\.|[^\\()])*\)\s*'/g;
  let match;

  while ((match = tokenRegex.exec(streamContent)) !== null) {
    const fullMatch = match[0];
    if (match[1] !== undefined) {
      // Operador TJ com array de strings: [(05/10/2026) -20 (IFOOD) -15 (45,90)] TJ
      const innerLiterals = [];
      const innerRegex = /\(((?:\\.|[^\\()])*)\)/g;
      let innerMatch;
      while ((innerMatch = innerRegex.exec(match[1])) !== null) {
        innerLiterals.push(decodePdfLiteralString(innerMatch[1]));
      }
      if (innerLiterals.length > 0) {
        lineTokens.push(innerLiterals.join(' '));
      }
    } else {
      const singleMatch = fullMatch.match(/\(((?:\\.|[^\\()])*)\)/);
      if (singleMatch) {
        lineTokens.push(decodePdfLiteralString(singleMatch[1]));
      }
    }
  }

  return lineTokens.join('\n').trim();
}

/**
 * Extrai conteúdo textual a partir de um Buffer PDF ou string Base64 de PDF (E07.T01).
 * Suporta streams comprimidos (/FlateDecode), operadores Tj/TJ e texto embutido.
 *
 * @param {Buffer|string} inputBufferOrBase64
 * @returns {string}
 */
function extractTextFromPdfBuffer(inputBufferOrBase64) {
  if (!inputBufferOrBase64) {
    throw new Error('Conteúdo do PDF não fornecido para extração.');
  }

  let buffer;
  if (Buffer.isBuffer(inputBufferOrBase64)) {
    buffer = inputBufferOrBase64;
  } else if (typeof inputBufferOrBase64 === 'string') {
    const cleaned = inputBufferOrBase64
      .trim()
      .replace(/^data:application\/pdf;base64,/i, '');
    buffer = Buffer.from(cleaned, 'base64');
  } else {
    throw new Error('Formato de entrada inválido para buffer de PDF.');
  }

  if (buffer.length === 0) {
    throw new Error('O arquivo PDF enviado está vazio.');
  }

  if (buffer.length > MAX_PDF_BYTES) {
    const err = new Error('O arquivo PDF excede o limite máximo permitido de 5 MB.');
    err.status = 413;
    throw err;
  }

  const rawLatin1 = buffer.toString('latin1');
  const rawUtf8 = buffer.toString('utf8');

  // Verifica se o buffer possui cabeçalho mágico %PDF-
  if (!rawLatin1.startsWith('%PDF-') && !rawLatin1.includes('%PDF-')) {
    const err = new Error('Assinatura de arquivo inválida: o documento não é um PDF válido (%PDF-).');
    err.status = 400;
    throw err;
  }

  const extractedSegments = [];

  // 1. Extrai e descomprime streams (incluindo /FlateDecode)
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch;

  while ((streamMatch = streamRegex.exec(rawLatin1)) !== null) {
    const rawStreamBytes = Buffer.from(streamMatch[1], 'latin1');
    let decodedStreamText = '';

    try {
      const inflated = zlib.inflateSync(rawStreamBytes, {
        maxOutputLength: MAX_INFLATED_STREAM_BYTES
      });
      decodedStreamText = inflated.toString('utf8');
    } catch (_) {
      try {
        const inflatedRaw = zlib.inflateRawSync(rawStreamBytes, {
          maxOutputLength: MAX_INFLATED_STREAM_BYTES
        });
        decodedStreamText = inflatedRaw.toString('utf8');
      } catch (__) {
        decodedStreamText = rawStreamBytes.toString('utf8');
      }
    }

    const opText = extractTextFromPdfOperators(decodedStreamText);
    if (opText) {
      extractedSegments.push(opText);
    } else if (decodedStreamText && /[\d]{2}[\/\-][\d]{2}/.test(decodedStreamText)) {
      extractedSegments.push(decodedStreamText);
    }
  }

  // 2. Também verifica operadores Tj/TJ fora de blocos stream ou texto direto no corpo
  const topLevelOpText = extractTextFromPdfOperators(rawUtf8);
  if (topLevelOpText) {
    extractedSegments.push(topLevelOpText);
  }

  if (extractedSegments.length === 0) {
    return rawUtf8;
  }

  return Array.from(new Set(extractedSegments)).join('\n');
}

/**
 * Classifica a descrição de uma transação extraída e sugere categoria + score de confiança (E07.T01).
 *
 * @param {string} description
 * @param {'INCOME'|'EXPENSE'} [transactionType='EXPENSE']
 * @param {Array<{id: string, name: string, type: string}>} [userCategories=[]]
 */
function classifyTransactionCategory(description, transactionType = 'EXPENSE', userCategories = []) {
  const normalizedDesc = removeAccents(description).toUpperCase();
  const safeUserCategories = Array.isArray(userCategories) ? userCategories : [];

  let matchedRule = null;
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => normalizedDesc.includes(kw))) {
      matchedRule = rule;
      break;
    }
  }

  const effectiveType = transactionType || (matchedRule ? matchedRule.type : 'EXPENSE');
  const suggestedCategoryName = matchedRule
    ? matchedRule.category
    : (effectiveType === 'INCOME' ? 'Receitas Gerais' : 'Outras Despesas');
  const confidenceScore = matchedRule ? matchedRule.confidence : 0.65;

  // Tenta vincular com uma categoria real cadastrada pelo usuário no Supabase
  let matchedUserCategory = null;
  const normalizedSuggested = removeAccents(suggestedCategoryName).toUpperCase();

  for (const cat of safeUserCategories) {
    const catNameNorm = removeAccents(cat.name).toUpperCase();
    if (
      catNameNorm === normalizedSuggested ||
      catNameNorm.includes(normalizedSuggested) ||
      normalizedSuggested.includes(catNameNorm)
    ) {
      matchedUserCategory = cat;
      break;
    }
  }

  // Fallback: primeira categoria do usuário com o mesmo tipo (INCOME / EXPENSE)
  if (!matchedUserCategory && safeUserCategories.length > 0) {
    matchedUserCategory = safeUserCategories.find(c => c.type === effectiveType) || null;
  }

  return {
    suggested_category_id: matchedUserCategory ? matchedUserCategory.id : null,
    suggested_category_name: matchedUserCategory ? matchedUserCategory.name : suggestedCategoryName,
    suggested_type: effectiveType,
    confidence_score: confidenceScore,
    needs_review: confidenceScore < 0.85
  };
}

/**
 * Normaliza uma string de data brasileira ou ISO para YYYY-MM-DD.
 */
function normalizeExtractedDate(rawDateStr, referenceYear = new Date().getFullYear()) {
  const cleaned = String(rawDateStr || '').trim().toUpperCase();

  // 1. YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // 2. DD/MM/YYYY ou DD-MM-YYYY ou DD/MM/YY
  const brFullMatch = cleaned.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})$/);
  if (brFullMatch) {
    const day = brFullMatch[1];
    const month = brFullMatch[2];
    const year = brFullMatch[3].length === 2 ? `20${brFullMatch[3]}` : brFullMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 3. DD/MM (curto de extrato/fatura)
  const brShortMatch = cleaned.match(/^(\d{2})\/(\d{2})$/);
  if (brShortMatch) {
    return `${referenceYear}-${brShortMatch[2]}-${brShortMatch[1]}`;
  }

  // 4. DD MMM (ex: 15 OUT, 03 NOV)
  const ptMonthMatch = cleaned.match(/^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)$/);
  if (ptMonthMatch) {
    const day = ptMonthMatch[1];
    const month = PT_MONTHS[ptMonthMatch[2]];
    return `${referenceYear}-${month}-${day}`;
  }

  return null;
}

/**
 * Converte string monetária (ex: "1.250,50", "45,90", "1250.50") em número positivo float.
 */
function parseMonetaryAmount(rawAmountStr) {
  const cleaned = String(rawAmountStr || '')
    .replace(/R\$\s*/gi, '')
    .replace(/\s+/g, '')
    .trim();

  if (!cleaned) return NaN;

  // Formato brasileiro com vírgula decimal (ex: 1.234,56 ou 45,90)
  if (cleaned.includes(',')) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    return parseFloat(normalized);
  }

  return parseFloat(cleaned);
}

/**
 * Analisa texto extraído de extrato bancário ou fatura de cartão PDF e retorna as transações estruturadas (E07.T01).
 *
 * @param {string} rawText Texto extraído do PDF
 * @param {object} [options]
 * @param {'AUTO'|'BANK_STATEMENT'|'CREDIT_CARD_INVOICE'} [options.documentType='AUTO']
 * @param {number} [options.referenceYear]
 * @param {Array} [options.userCategories=[]]
 */
function parseStatementText(rawText, options = {}) {
  const {
    documentType = 'AUTO',
    referenceYear = new Date().getFullYear(),
    userCategories = []
  } = options;

  const text = String(rawText || '');
  const isInvoiceDoc =
    documentType === 'CREDIT_CARD_INVOICE' ||
    (documentType === 'AUTO' && /\b(FATURA|CART[AÃ]O\s+DE\s+CR[EÉ]DITO|VENCIMENTO\s+DA\s+FATURA)\b/i.test(text));
  const resolvedDocType = isInvoiceDoc ? 'CREDIT_CARD_INVOICE' : 'BANK_STATEMENT';

  const lines = text
    .split(/\r?\n/)
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const extractedTransactions = [];

  // Padrão de linha: <Data no início> <Descrição no meio> <Sinal opcional + R$ opcional + Valor + D/C opcional no fim>
  const linePattern = /^(\d{4}-\d{2}-\d{2}|\d{2}[\/\-]\d{2}(?:[\/\-]\d{2,4})?|\d{2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ))\s+(.+?)\s+([+\-]?\s*(?:R\$\s*)?[+\-]?\s*\d{1,3}(?:\.\d{3})*,\d{2}|[+\-]?\s*(?:R\$\s*)?[+\-]?\s*\d+\.\d{2})(?:\s*([DCdc]|\([+\-]\)))?$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (IGNORED_LINE_PATTERNS.some(regex => regex.test(line))) {
      continue;
    }

    const match = line.match(linePattern);
    if (!match) continue;

    const [, rawDate, rawDesc, rawAmountChunk, rawDcFlag] = match;
    const date = normalizeExtractedDate(rawDate, referenceYear);
    if (!date) continue;

    const description = rawDesc
      .replace(/\s*[-–—]\s*$/, '')
      .trim()
      .slice(0, 255);

    if (!description || IGNORED_LINE_PATTERNS.some(regex => regex.test(description))) {
      continue;
    }

    // Em faturas de cartão, ignora linha de pagamento da própria fatura anterior para evitar duplicidade como receita
    if (isInvoiceDoc && /\bPAGAMENTO\s+(RECEBIDO|DE\s+FATURA|EFETUADO)\b/i.test(description)) {
      continue;
    }

    const hasNegativeSign = /[-]/.test(rawAmountChunk) || (rawDcFlag && rawDcFlag.toUpperCase() === 'D') || rawDcFlag === '(-)';
    const hasPositiveSign = /[+]/.test(rawAmountChunk) || (rawDcFlag && rawDcFlag.toUpperCase() === 'C') || rawDcFlag === '(+)';

    const numericAmount = parseMonetaryAmount(rawAmountChunk.replace(/[+\-]/g, ''));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      continue;
    }

    const amount = round2(numericAmount);

    // Determina se é INCOME ou EXPENSE
    let transactionType = 'EXPENSE';
    if (isInvoiceDoc) {
      transactionType = 'EXPENSE';
    } else if (hasNegativeSign) {
      transactionType = 'EXPENSE';
    } else if (EXPENSE_KEYWORD_PATTERNS.some(rx => rx.test(description))) {
      transactionType = 'EXPENSE';
    } else if (hasPositiveSign || INCOME_KEYWORD_PATTERNS.some(rx => rx.test(description))) {
      transactionType = 'INCOME';
    }

    const classification = classifyTransactionCategory(description, transactionType, userCategories);

    const fingerprint = crypto
      .createHash('sha256')
      .update(`${date}|${amount.toFixed(2)}|${description.toUpperCase()}|${extractedTransactions.length}`)
      .digest('hex')
      .slice(0, 16);

    extractedTransactions.push({
      fingerprint,
      date,
      description,
      amount,
      type: classification.suggested_type,
      category_id: classification.suggested_category_id,
      suggested_category_id: classification.suggested_category_id,
      suggested_category_name: classification.suggested_category_name,
      confidence_score: classification.confidence_score,
      needs_review: classification.needs_review,
      is_automated: true
    });
  }

  const totalIncome = round2(
    extractedTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.amount, 0)
  );
  const totalExpense = round2(
    extractedTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + t.amount, 0)
  );
  const highConfidenceCount = extractedTransactions.filter(t => !t.needs_review).length;
  const reviewRequiredCount = extractedTransactions.filter(t => t.needs_review).length;

  return {
    document_type: resolvedDocType,
    reference_year: referenceYear,
    extracted_count: extractedTransactions.length,
    summary: {
      total_extracted: extractedTransactions.length,
      total_income: totalIncome,
      total_expense: totalExpense,
      net_amount: round2(totalIncome - totalExpense),
      high_confidence_count: highConfidenceCount,
      review_required_count: reviewRequiredCount
    },
    transactions: extractedTransactions
  };
}

/**
 * Orquestrador principal de extração de transações de PDF (E07.T01).
 * Aceita `pdf_base64` (binário PDF codificado em base64) e/ou `raw_text`.
 */
function parsePdfStatement(input = {}, options = {}) {
  const {
    pdf_base64,
    raw_text,
    file_name = 'extrato.pdf',
    document_type = 'AUTO',
    reference_year = new Date().getFullYear()
  } = input;

  let extractedText = '';

  if (pdf_base64 && String(pdf_base64).trim()) {
    extractedText = extractTextFromPdfBuffer(pdf_base64);
  }

  if (raw_text && String(raw_text).trim()) {
    extractedText = extractedText
      ? `${extractedText}\n${String(raw_text).trim()}`
      : String(raw_text).trim();
  }

  if (!extractedText.trim()) {
    const err = new Error('Nenhum conteúdo textual ou PDF válido foi fornecido para extração.');
    err.status = 400;
    throw err;
  }

  const parsed = parseStatementText(extractedText, {
    documentType: document_type,
    referenceYear: reference_year,
    userCategories: options.userCategories || []
  });

  return {
    file_name: String(file_name || 'extrato.pdf').slice(0, 120),
    ...parsed
  };
}

module.exports = {
  MAX_PDF_BYTES,
  extractTextFromPdfBuffer,
  classifyTransactionCategory,
  normalizeExtractedDate,
  parseMonetaryAmount,
  parseStatementText,
  parsePdfStatement
};
