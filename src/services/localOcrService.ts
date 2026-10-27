import { createWorker, type Worker } from 'tesseract.js';
import { parseInvoiceText, type InvoiceParseResult } from '../utils/invoiceParser';

/**
 * Leitura de faturas 100% local: a imagem nunca sai do aparelho.
 * Usa Tesseract.js (WASM) com dicionários pt-BR + inglês, baixados uma única
 * vez e guardados no navegador (IndexedDB pelo próprio Tesseract).
 */

export type OcrPhase = 'engine' | 'ocr';

export interface OcrProgress {
  phase: OcrPhase;
  /** 0..1 — quando o motor está baixando pode ficar em 0 (indeterminado). */
  progress: number;
  label: string;
}

export type OcrProgressHandler = (progress: OcrProgress) => void;

const LANGS = 'por+eng';
const IDLE_TERMINATE_MS = 120_000;
/** Prints de app escuro (fundo < que este valor) são invertidos antes da leitura. */
const INVERT_THRESHOLD = 110;
const MIN_DIM = 1000;
const MAX_DIM = 1600;

const STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': 'Baixando o motor de OCR (1ª vez)',
  'initializing tesseract': 'Inicializando o motor',
  'loading language traineddata': 'Baixando o dicionário de textos (1ª vez)',
  'initializing api': 'Preparando a leitura',
  'recognizing text': 'Lendo o texto da imagem',
  terminated: 'Concluindo',
};

let workerPromise: Promise<Worker> | null = null;
let activeHandler: OcrProgressHandler | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function notify(status: string, progress: number) {
  if (!activeHandler) return;
  const isOcr = status === 'recognizing text';
  const label =
    STATUS_LABELS[status] ?? (isOcr ? 'Lendo o texto da imagem' : 'Preparando o OCR');
  activeHandler({
    phase: isOcr ? 'ocr' : 'engine',
    progress: Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0)),
    label,
  });
}

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    const created = createWorker(LANGS, 1, {
      logger: (m) => notify(m.status, m.progress),
      errorHandler: (err) => console.error('[OCR] erro no worker:', err),
    });
    workerPromise = created;
    // Permite tentar de novo se a criação falhar (ex.: sem rede no 1º uso)
    created.catch(() => {
      if (workerPromise === created) workerPromise = null;
    });
  }
  return workerPromise;
}

function cancelIdleTermination() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

/** Libera a memória do motor depois de um tempo sem uso. */
function scheduleIdleTermination() {
  cancelIdleTermination();
  idleTimer = setTimeout(() => {
    const previous = workerPromise;
    workerPromise = null;
    previous
      ?.then((w) => w.terminate())
      .catch(() => undefined);
  }, IDLE_TERMINATE_MS);
}

/* ------------------------------------------------------------------ */
/* Pré-processamento da imagem                                         */
/* ------------------------------------------------------------------ */

async function loadImage(source: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(source, { imageOrientation: 'from-image' });
  } catch {
    const url = URL.createObjectURL(source);
    try {
      const img = new Image();
      img.decoding = 'async';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('decode'));
        img.src = url;
      });
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Redimensiona para o tamanho ideal do Tesseract, converte em escala de cinza,
 * normaliza contraste (percentis 2%/98%) e inverte prints de fundo escuro —
 * o Tesseract lê muito melhor texto escuro sobre fundo claro.
 */
function prepareCanvas(
  img: ImageBitmap | HTMLImageElement,
  forceInvert?: boolean,
): { canvas: HTMLCanvasElement; inverted: boolean } {
  const sw = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const sh = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  if (!sw || !sh) throw new Error('image-size');

  const max = Math.max(sw, sh);
  let scale = 1;
  if (max > MAX_DIM) scale = MAX_DIM / max;
  else if (max < MIN_DIM) scale = Math.min(2, MIN_DIM / max);

  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas-unavailable');

  ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const count = w * h;
  const grey = new Uint8Array(count);

  let sum = 0;
  for (let i = 0, p = 0; i < count; i++, p += 4) {
    const v = (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;
    grey[i] = v;
    sum += v;
  }

  // Percentis para normalizar contraste
  const histogram = new Uint32Array(256);
  for (let i = 0; i < count; i++) histogram[grey[i]]++;
  const lowCut = Math.floor(count * 0.02);
  const highCut = Math.floor(count * 0.98);
  let acc = 0;
  let pLow = 0;
  for (let v = 0; v < 256; v++) {
    acc += histogram[v];
    if (acc >= lowCut) {
      pLow = v;
      break;
    }
  }
  acc = 0;
  let pHigh = 255;
  for (let v = 0; v < 256; v++) {
    acc += histogram[v];
    if (acc >= highCut) {
      pHigh = v;
      break;
    }
  }
  const span = pHigh - pLow;
  // Só normaliza quando existe faixa real de contraste. Com texto esparsado
  // (ex.: 4 linhas numa tela branca) os percentis caem todos no fundo e o
  // stretch destruiria a imagem inteira — nesse caso o contraste já está bom.
  const applyStretch = span >= 32;

  // Foto de cupom sobre mesa escura tem fundo escuro mas texto claro: inverter
  // por média global atrapalha. O chamador pode forçar a polaridade oposta na
  // segunda tentativa.
  const invert = forceInvert ?? sum / count < INVERT_THRESHOLD;

  for (let i = 0, p = 0; i < count; i++, p += 4) {
    let v = grey[i];
    if (applyStretch) {
      v = ((v - pLow) / span) * 255;
      if (v < 0) v = 0;
      else if (v > 255) v = 255;
    }
    if (invert) v = 255 - v;
    data[p] = v;
    data[p + 1] = v;
    data[p + 2] = v;
    data[p + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return { canvas, inverted: invert };
}

/* ------------------------------------------------------------------ */
/* Confiança                                                           */
/* ------------------------------------------------------------------ */

function readConfidence(data: unknown): number | null {
  const page = data as { confidence?: unknown; blocks?: unknown[] } | null | undefined;
  try {
    if (page && typeof page.confidence === 'number') return page.confidence;
    const blocks = Array.isArray(page?.blocks) ? page.blocks : null;
    if (!blocks) return null;
    let sum = 0;
    let count = 0;
    for (const block of blocks as Record<string, any>[]) {
      for (const paragraph of block?.paragraphs ?? []) {
        for (const line of paragraph?.lines ?? []) {
          for (const word of line?.words ?? []) {
            if (typeof word?.confidence === 'number') {
              sum += word.confidence;
              count++;
            }
          }
        }
      }
    }
    return count > 0 ? sum / count : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* API pública                                                         */
/* ------------------------------------------------------------------ */

/**
 * Lê uma imagem de fatura/print no próprio aparelho e devolve os lançamentos
 * estruturados. Lança Error com mensagem em português quando não é possível.
 */
export async function scanInvoiceLocally(
  image: Blob,
  onProgress?: OcrProgressHandler,
): Promise<InvoiceParseResult> {
  if (typeof document === 'undefined') {
    throw new Error('A leitura local só funciona no navegador.');
  }

  cancelIdleTermination();
  activeHandler = onProgress ?? null;

  try {
    notify('initializing tesseract', 0);
    let decoded: ImageBitmap | HTMLImageElement;
    try {
      decoded = await loadImage(image);
    } catch {
      throw new Error('Não consegui abrir esta imagem. Use um arquivo JPG, PNG ou WEBP.');
    }

    const first = prepareCanvas(decoded);
    const worker = await getWorker();

    const read = async (canvas: HTMLCanvasElement) => {
      const result = await worker.recognize(canvas, {}, { blocks: true });
      const d = result?.data;
      const t = typeof d?.text === 'string' ? d.text : '';
      return { data: d, text: t, confidence: readConfidence(d) };
    };

    let best = await read(first.canvas);

    // Se a leitura veio vazia ou pouco confiável, repete com as cores invertidas:
    // escolhe a polaridade pelo conteúdo, não só pela média da imagem.
    const isPoor = (r: { text: string; confidence: number | null }) =>
      r.text.trim().length < 12 || (r.confidence !== null && r.confidence < 72);
    if (isPoor(best)) {
      const retry = prepareCanvas(decoded, !first.inverted);
      const alt = await read(retry.canvas);
      const altOk = alt.text.trim().length >= 12;
      if (altOk && (!isPoor(best) || (alt.confidence ?? 0) > (best.confidence ?? 0))) {
        best = alt;
      }
    }
    if ('close' in decoded) decoded.close();

    return parseInvoiceText(best.text, { confidence: best.confidence });
  } finally {
    activeHandler = null;
    scheduleIdleTermination();
  }
}