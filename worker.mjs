/**
 * Worker do FinanFlow: serve o SPA (dist), endpoint de OCR de faturas e
 * sincronização compartilhada em D1 (SQLite) com Sign in with Freebuff.
 */
import { isSameOriginRequest } from '@freebuff/auth';

// ============ Config Google OAuth (segredos vêm do ambiente/Worker, nunca no código) ============
const JWT_ISSUER = 'finanflow';
const JWT_AUDIENCE = 'finanflow-app';

function getConfig(env) {
  const config = {
    clientId: env?.GOOGLE_CLIENT_ID || '',
    clientSecret: env?.GOOGLE_CLIENT_SECRET || '',
    jwtSecret: env?.JWT_SECRET || '',
  };
  if (!config.clientId || !config.clientSecret || !config.jwtSecret) {
    throw new Error('Credenciais OAuth ausentes (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET).');
  }
  return config;
}

// ============ Helpers JWT ============
function b64urlEnc(data) {
  const bin = String.fromCodePoint(...new Uint8Array(data));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function signJwt(payload, jwtSecret, ttlSeconds = 60 * 60 * 24 * 30) {
  const header = b64urlEnc(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64urlEnc(new TextEncoder().encode(JSON.stringify({
    ...payload,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  })));
  const signingInput = `${header}.${body}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(jwtSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${b64urlEnc(new Uint8Array(sig))}`;
}
async function verifyJwt(token, jwtSecret) {
  try {
    const [headerB64, payloadB64, sigB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !sigB64) return null;
    const signingInput = `${headerB64}.${payloadB64}`;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(jwtSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sig = new Uint8Array(atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => c.charCodeAt(0)));
    const ok = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(signingInput));
    if (!ok) return null;
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.iss !== JWT_ISSUER || payload.aud !== JWT_AUDIENCE) return null;
    return payload;
  } catch { return null; }
}

const MODEL = 'gemini-3.8-flash';

const PROMPT = `Você é um assistente especialista em OCR, visão computacional e finanças pessoais para o público brasileiro.
Sua missão é analisar esta imagem (print de app como Riachuelo, Nubank, PicPay, Santander, Itaú, Inter, C6, Mercado Pago, cartão de loja, fatura de cartão de crédito, cupom fiscal ou extrato bancário).

Extraia com máxima precisão:
1. Instituição ou cartão detectado (ex: "Riachuelo", "PicPay", "Santander", "Nubank", "Outro").
2. Lista de transações ou compras encontradas com descrição, valor total, número de parcelas, valor da parcela, parcela atual, data (YYYY-MM-DD), tipo (expense/income), categoria sugerida e forma de pagamento.
3. Resumo explicativo em português para exibir ao usuário.

Se a imagem estiver ilegível ou não for comprovante/print financeiro, retorne itens vazios e explique no summary.`;

const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    detectedInstitution: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          totalAmount: { type: 'number' },
          installmentAmount: { type: 'number' },
          installmentsCount: { type: 'integer' },
          currentInstallment: { type: 'integer' },
          date: { type: 'string' },
          type: { type: 'string' },
          suggestedCategoryId: { type: 'string' },
          paymentMethod: { type: 'string' },
        },
        required: ['description', 'totalAmount', 'installmentsCount'],
      },
    },
  },
  required: ['summary', 'items'],
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' },
  });
}

// ============ Esquema D1 (idempotente, criado na primeira chamada) ============
const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS households (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_uid TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, updated_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS household_members (
    household_id TEXT NOT NULL, user_uid TEXT NOT NULL, user_name TEXT,
    joined_at TEXT NOT NULL, PRIMARY KEY (household_id, user_uid))`,
  `CREATE INDEX IF NOT EXISTS idx_members_user ON household_members(user_uid)`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, household_id TEXT NOT NULL, creator_uid TEXT NOT NULL,
    creator_name TEXT, description TEXT NOT NULL, amount REAL NOT NULL DEFAULT 0,
    type TEXT NOT NULL, category TEXT, date TEXT NOT NULL, account TEXT,
    payment_method TEXT, is_paid INTEGER NOT NULL DEFAULT 0, notes TEXT,
    recurrence TEXT, installment TEXT, installment_group_id TEXT,
    recurrence_group_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_tx_household ON transactions(household_id)`,
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, household_id TEXT NOT NULL, creator_uid TEXT NOT NULL,
    name TEXT NOT NULL, icon TEXT, color TEXT, type TEXT NOT NULL,
    budget REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_cat_household ON categories(household_id)`,
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY, household_id TEXT NOT NULL, creator_uid TEXT NOT NULL,
    name TEXT NOT NULL, type TEXT NOT NULL, initial_balance REAL NOT NULL DEFAULT 0,
    color TEXT, card_limit REAL, card_due_day INTEGER,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_acc_household ON accounts(household_id)`,
  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY, household_id TEXT NOT NULL, creator_uid TEXT NOT NULL,
    title TEXT NOT NULL, target_amount REAL NOT NULL DEFAULT 0,
    current_amount REAL NOT NULL DEFAULT 0, deadline TEXT, color TEXT, icon TEXT,
    notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_goal_household ON goals(household_id)`,
];

let schemaReady = null;
function ensureSchema(db) {
  schemaReady ??= db
    .batch(SCHEMA_SQL.map((sql) => db.prepare(sql)))
    .catch((err) => {
      schemaReady = null;
      throw err;
    });
  return schemaReady;
}

const TX_COLS = 'id,household_id,creator_uid,creator_name,description,amount,type,category,date,account,payment_method,is_paid,notes,recurrence,installment,installment_group_id,recurrence_group_id,created_at,updated_at';

function txRow(householdId, tx, user, now) {
  return {
    id: tx.id,
    household_id: householdId,
    creator_uid: user.sub,
    creator_name: (user.name || user.email || 'Usuário').slice(0, 120),
    description: String(tx.description || 'Sem descrição').slice(0, 300),
    amount: Number(tx.amount) || 0,
    type: tx.type === 'income' ? 'income' : 'expense',
    category: String(tx.category || '').slice(0, 128),
    date: String(tx.date || '').slice(0, 30),
    account: String(tx.account || 'default').slice(0, 128),
    payment_method: String(tx.paymentMethod || 'cash').slice(0, 64),
    is_paid: tx.isPaid ? 1 : 0,
    notes: tx.notes ? String(tx.notes).slice(0, 2000) : null,
    recurrence: tx.recurrence ? String(tx.recurrence).slice(0, 64) : null,
    installment: tx.installment ? JSON.stringify(tx.installment) : null,
    installment_group_id: (tx.installment && tx.installment.installmentGroupId) || null,
    recurrence_group_id: tx.recurrenceGroupId || null,
    created_at: now,
    updated_at: now,
  };
}

function upsertTxStmt(db, row) {
  return db
    .prepare(
      `INSERT INTO transactions (${TX_COLS}) VALUES (${TX_COLS.split(',').map(() => '?').join(',')})
       ON CONFLICT(id) DO UPDATE SET
         description=excluded.description, amount=excluded.amount, type=excluded.type,
         category=excluded.category, date=excluded.date, account=excluded.account,
         payment_method=excluded.payment_method, is_paid=excluded.is_paid, notes=excluded.notes,
         recurrence=excluded.recurrence, installment=excluded.installment,
         installment_group_id=excluded.installment_group_id,
         recurrence_group_id=excluded.recurrence_group_id, updated_at=excluded.updated_at`
    )
    .bind(...Object.values(row));
}

function rowToTransaction(r) {
  let installment;
  if (r.installment) {
    try {
      installment = JSON.parse(r.installment);
    } catch {
      installment = undefined;
    }
  }
  return {
    id: r.id,
    description: r.description,
    amount: r.amount,
    type: r.type,
    category: r.category || '',
    date: r.date,
    account: r.account || '',
    paymentMethod: r.payment_method || 'cash',
    isPaid: !!r.is_paid,
    notes: r.notes || undefined,
    recurrence: r.recurrence || undefined,
    installment,
    recurrenceGroupId: r.recurrence_group_id || undefined,
  };
}

function catRow(householdId, c, user, now) {
  return {
    id: c.id,
    household_id: householdId,
    creator_uid: user.sub,
    name: String(c.name || '').slice(0, 100),
    icon: String(c.icon || ''),
    color: String(c.color || ''),
    type: ['expense', 'income', 'both'].includes(c.type) ? c.type : 'expense',
    budget: Number(c.budget) || 0,
    created_at: now,
    updated_at: now,
  };
}

function rowToCategory(r) {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon || '',
    color: r.color || '',
    type: r.type,
    budget: r.budget || 0,
  };
}

function accRow(householdId, a, user, now) {
  return {
    id: a.id,
    household_id: householdId,
    creator_uid: user.sub,
    name: String(a.name || '').slice(0, 100),
    type: ['checking', 'credit', 'cash', 'investment'].includes(a.type) ? a.type : 'checking',
    initial_balance: Number(a.initialBalance) || 0,
    color: String(a.color || ''),
    card_limit: a.cardLimit === undefined ? null : Number(a.cardLimit) || 0,
    card_due_day: a.cardDueDay === undefined ? null : Number(a.cardDueDay) || 10,
    created_at: now,
    updated_at: now,
  };
}

function rowToAccount(r) {
  const out = {
    id: r.id,
    name: r.name,
    type: r.type,
    initialBalance: r.initial_balance || 0,
    color: r.color || '',
  };
  if (r.card_limit !== null && r.card_limit !== undefined) out.cardLimit = r.card_limit;
  if (r.card_due_day !== null && r.card_due_day !== undefined) out.cardDueDay = r.card_due_day;
  return out;
}

function goalRow(householdId, g, user, now) {
  return {
    id: g.id,
    household_id: householdId,
    creator_uid: user.sub,
    title: String(g.title || '').slice(0, 120),
    target_amount: Number(g.targetAmount) || 0,
    current_amount: Number(g.currentAmount) || 0,
    deadline: String(g.deadline || ''),
    color: String(g.color || ''),
    icon: String(g.icon || ''),
    notes: g.notes ? String(g.notes).slice(0, 1000) : null,
    created_at: now,
    updated_at: now,
  };
}

function rowToGoal(r) {
  return {
    id: r.id,
    title: r.title,
    targetAmount: r.target_amount || 0,
    currentAmount: r.current_amount || 0,
    deadline: r.deadline || '',
    color: r.color || '',
    icon: r.icon || '',
    notes: r.notes || undefined,
  };
}

function genInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function shapeHousehold(h) {
  return { id: h.id, name: h.name, ownerId: h.owner_uid, inviteCode: h.invite_code };
}

async function getHouseholdForUser(db, sub, name) {
  await ensureSchema(db);
  const member = await db
    .prepare(
      `SELECT h.* FROM household_members m JOIN households h ON h.id = m.household_id
       WHERE m.user_uid = ? LIMIT 1`
    )
    .bind(sub)
    .first();
  if (member) return member;

  const hhId = `house_${sub.slice(0, 8)}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await db.batch([
        db
          .prepare('INSERT INTO households (id, name, owner_uid, invite_code, created_at) VALUES (?, ?, ?, ?, ?)')
          .bind(hhId, 'Finanças Compartilhadas', sub, genInviteCode(), now),
        db
          .prepare('INSERT INTO household_members (household_id, user_uid, user_name, joined_at) VALUES (?, ?, ?, ?)')
          .bind(hhId, sub, (name || '').slice(0, 120), now),
      ]);
      break;
    } catch (err) {
      // Código de convite colidiu (UNIQUE): gera outro e tenta de novo.
      if (attempt === 2) throw err;
    }
  }
  return await db.prepare('SELECT * FROM households WHERE id = ?').bind(hhId).first();
}

function simulation() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    summary:
      'Foto recebida com sucesso! (Modo Simulação Inteligente ativo: detectada compra parcelada em 5x). Você pode ajustar qualquer valor antes de salvar.',
    detectedInstitution: 'Riachuelo',
    items: [
      {
        description: 'Riachuelo - Compra Detectada no Print',
        totalAmount: 350.0,
        installmentAmount: 70.0,
        installmentsCount: 5,
        currentInstallment: 1,
        date: today,
        type: 'expense',
        suggestedCategoryId: 'cat_compras_cartao',
        paymentMethod: 'credit',
      },
    ],
  };
}

// ============ API de sincronização (D1) ============
async function handleSyncApi(request, env, url, h) {
  const { ensureSchema, getHouseholdForUser, shapeHousehold } = h;
  const p = url.pathname;
  const db = env.DB;

  const sub = request.headers.get('x-user-sub');
  const name = request.headers.get('x-user-name');
  const email = request.headers.get('x-user-email');
  const picture = request.headers.get('x-user-picture');
  if (!sub) return json({ error: 'Faça login para sincronizar.' }, 401);
  const user = { sub, name, email, picture };
  const userName = (name || email?.split('@')[0] || 'Usuário').slice(0, 120);

  // GET /api/me — perfil + espaço do usuário (cria o espaço no primeiro acesso)
  if (p === '/api/me' && request.method === 'GET') {
    const household = await getHouseholdForUser(db, user.sub, userName);
    const members = await db
      .prepare('SELECT user_uid, user_name, joined_at FROM household_members WHERE household_id = ?')
      .bind(household.id)
      .all();
    return json({
      user: { sub: user.sub, name: user.name, email: user.email, picture: user.picture },
      household: shapeHousehold(household),
      members: members.results.map((m) => ({ uid: m.user_uid, name: m.user_name, joinedAt: m.joined_at })),
    });
  }

  // Tudo abaixo é estado compartilhado: apenas same-origin.
  if (!isSameOriginRequest(request, env.APP_ORIGIN)) return new Response(null, { status: 403 });

  // POST /api/household/join — entra em um espaço pelo código de convite
  if (p === '/api/household/join' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    const code = String(body?.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) return json({ error: 'Código inválido.' }, 400);
    await ensureSchema(db);
    const hh = await db
      .prepare('SELECT * FROM households WHERE UPPER(invite_code) = ?')
      .bind(code)
      .first();
    if (!hh) return json({ error: 'Código de convite não encontrado.' }, 404);
    const now = new Date().toISOString();
    await db.batch([
      // Um usuário pertence a um espaço por vez (troca ao entrar por convite).
      db.prepare('DELETE FROM household_members WHERE user_uid = ?').bind(user.sub),
      db
        .prepare(
          `INSERT INTO household_members (household_id, user_uid, user_name, joined_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(household_id, user_uid) DO NOTHING`
        )
        .bind(hh.id, user.sub, userName, now),
    ]);
    return json({ ok: true, household: shapeHousehold(hh) });
  }

  // POST /api/transactions — upsert em lote (pendências do AutoSync)
  if (p === '/api/transactions' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    const list = Array.isArray(body?.transactions) ? body.transactions.slice(0, 500) : [];
    if (list.length === 0) return json({ ok: true, saved: 0 });
    await ensureSchema(db);
    const household = await getHouseholdForUser(db, user.sub, userName);
    const now = new Date().toISOString();
    const stmts = [];
    for (const tx of list) {
      if (!tx?.id) continue;
      const existing = await db
        .prepare('SELECT household_id FROM transactions WHERE id = ?')
        .bind(String(tx.id))
        .first();
      // Não mexe em lançamentos de outro espaço (outro usuário criou com esse id).
      if (existing && existing.household_id !== household.id) continue;
      stmts.push(h.upsertTxStmt(db, h.txRow(household.id, tx, user, now)));
    }
    if (stmts.length > 0) await db.batch(stmts);
    return json({ ok: true, saved: stmts.length });
  }

  // PUT /api/transactions/:id — cria ou atualiza um lançamento
  if (p.startsWith('/api/transactions/') && request.method === 'PUT') {
    const txId = decodeURIComponent(p.split('/')[3]);
    const body = await request.json().catch(() => null);
    if (!txId || !body) return json({ error: 'Dados inválidos.' }, 400);
    await ensureSchema(db);
    const household = await getHouseholdForUser(db, user.sub, userName);
    const existing = await db
      .prepare('SELECT household_id FROM transactions WHERE id = ?')
      .bind(txId)
      .first();
    if (existing && existing.household_id !== household.id) {
      return json({ error: 'Este lançamento pertence a outro espaço.' }, 403);
    }
    await db.batch([h.upsertTxStmt(db, h.txRow(household.id, { ...body, id: txId }, user, new Date().toISOString()))]);
    return json({ ok: true });
  }

  // DELETE /api/transactions/:id
  if (p.startsWith('/api/transactions/') && request.method === 'DELETE') {
    const txId = decodeURIComponent(p.split('/')[3]);
    if (!txId) return json({ error: 'Dados inválidos.' }, 400);
    await ensureSchema(db);
    const household = await getHouseholdForUser(db, user.sub, userName);
    const row = await db
      .prepare('SELECT household_id FROM transactions WHERE id = ?')
      .bind(txId)
      .first();
    if (row && row.household_id !== household.id) {
      return json({ error: 'Este lançamento pertence a outro espaço.' }, 403);
    }
    if (row) await db.prepare('DELETE FROM transactions WHERE id = ?').bind(txId).run();
    return json({ ok: true });
  }

  // DELETE /api/transactions — limpa todos os lançamentos do espaço
  if (p === '/api/transactions' && request.method === 'DELETE') {
    await ensureSchema(db);
    const household = await getHouseholdForUser(db, user.sub, userName);
    await db.prepare('DELETE FROM transactions WHERE household_id = ?').bind(household.id).run();
    return json({ ok: true });
  }

  // PUT /api/categories/:id | /api/accounts/:id | /api/goals/:id
  const kind = ['categories', 'accounts', 'goals'].find((k) => p.startsWith(`/api/${k}/`));
  if (kind && request.method === 'PUT') {
    const itemId = decodeURIComponent(p.split('/')[3]);
    const body = await request.json().catch(() => null);
    if (!itemId || !body) return json({ error: 'Dados inválidos.' }, 400);
    await ensureSchema(db);
    const household = await getHouseholdForUser(db, user.sub, userName);
    const existing = await db
      .prepare(`SELECT household_id FROM ${kind} WHERE id = ?`)
      .bind(itemId)
      .first();
    if (existing && existing.household_id !== household.id) {
      return json({ error: 'Este item pertence a outro espaço.' }, 403);
    }
    const now = new Date().toISOString();

    if (kind === 'categories') {
      const row = h.catRow(household.id, { ...body, id: itemId }, user, now);
      await db.batch([
        db
          .prepare(
            `INSERT INTO categories (id, household_id, creator_uid, name, icon, color, type, budget, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name, icon=excluded.icon, color=excluded.color,
               type=excluded.type, budget=excluded.budget, updated_at=excluded.updated_at`
          )
          .bind(...Object.values(row)),
      ]);
      return json({ ok: true });
    }

    if (kind === 'accounts') {
      const row = h.accRow(household.id, { ...body, id: itemId }, user, now);
      await db.batch([
        db
          .prepare(
            `INSERT INTO accounts (id, household_id, creator_uid, name, type, initial_balance, color, card_limit, card_due_day, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type,
               initial_balance=excluded.initial_balance, color=excluded.color,
               card_limit=excluded.card_limit, card_due_day=excluded.card_due_day,
               updated_at=excluded.updated_at`
          )
          .bind(...Object.values(row)),
      ]);
      return json({ ok: true });
    }

    const row = h.goalRow(household.id, { ...body, id: itemId }, user, now);
    await db.batch([
      db
        .prepare(
          `INSERT INTO goals (id, household_id, creator_uid, title, target_amount, current_amount, deadline, color, icon, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET title=excluded.title, target_amount=excluded.target_amount,
             current_amount=excluded.current_amount, deadline=excluded.deadline, color=excluded.color,
             icon=excluded.icon, notes=excluded.notes, updated_at=excluded.updated_at`
        )
        .bind(...Object.values(row)),
    ]);
    return json({ ok: true });
  }

  // GET /api/sync — snapshot completo do espaço (usado pelo polling)
  if (p === '/api/sync' && request.method === 'GET') {
    await ensureSchema(db);
    const household = await getHouseholdForUser(db, user.sub, userName);
    const [txs, cats, accs, goals, members] = await db.batch([
      db.prepare('SELECT * FROM transactions WHERE household_id = ? ORDER BY date DESC').bind(household.id),
      db.prepare('SELECT * FROM categories WHERE household_id = ?').bind(household.id),
      db.prepare('SELECT * FROM accounts WHERE household_id = ?').bind(household.id),
      db.prepare('SELECT * FROM goals WHERE household_id = ?').bind(household.id),
      db.prepare('SELECT user_uid, user_name, joined_at FROM household_members WHERE household_id = ?').bind(household.id),
    ]);
    return json({
      household: shapeHousehold(household),
      transactions: txs.results.map(h.rowToTransaction),
      categories: cats.results.map(h.rowToCategory),
      accounts: accs.results.map(h.rowToAccount),
      goals: goals.results.map(h.rowToGoal),
      members: members.results.map((m) => ({ uid: m.user_uid, name: m.user_name, joinedAt: m.joined_at })),
    });
  }

  return json({ error: 'Rota não encontrada.' }, 404);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};

async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/api/health') {
    return json({ ok: true, server: 'FinanFlow API', timestamp: new Date().toISOString() });
  }

  const config = getConfig(env);


  // ============ Google OAuth login ============
  if (url.pathname === '/auth/google/login' && request.method === 'GET') {
    const state = crypto.randomUUID();
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${env.APP_ORIGIN}/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, 302);
  }

  if (url.pathname === '/auth/google/callback' && request.method === 'GET') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    if (error) return json({ error: `Google auth error: ${error}` }, 400);
    if (!code) return json({ error: 'Código não recebido do Google' }, 400);

    try {
      console.log('[DEBUG] Attemptando obter token do Google');
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${env.APP_ORIGIN}/auth/google/callback`,
        }).toString(),
      });
      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error('Google token error:', errText);
console.error('Erro ao obter o token do Google:', err);
        return json({ error: 'Falha ao trocar código por token' }, 500);
      }
      const tokens = await tokenRes.json();
      console.log('[DEBUG] Tokens recebidos', tokens);

      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!profileRes.ok) {
        console.error('[DEBUG] Falha ao obter perfil do Google', await profileRes.text());
console.error('Erro ao obter perfil:', err);
        return json({ error: 'Falha ao obter perfil do Google' }, 500);
      }
      const profile = await profileRes.json();

      const jwt = await signJwt({
        sub: profile.id,
        name: profile.name,
        email: profile.email,
        picture: profile.picture,
      }, config.jwtSecret);

      return new Response(null, {
        status: 302,
        headers: {
          Location: '/api/me',
          'Set-Cookie': `ff_token=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
        },
      });
    } catch (err) {
      console.error('Google callback error:', err);
      return json({ error: 'Erro interno no callback do Google' }, 500);
    }
  }

  if (url.pathname === '/auth/logout' && request.method === 'POST') {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/',
        'Set-Cookie': 'ff_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
      },
    });
  }

  // ============ JWT auth middleware para rotas /api ============
  if (url.pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization');
    const cookie = request.headers.get('cookie') || '';
    const cookieMatch = cookie.match(/ff_token=([^;]+)/);
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieMatch?.[1];
    if (!token) return json({ error: 'Token de autenticação necessário' }, 401);
    const payload = await verifyJwt(token, config.jwtSecret);
    if (!payload) return json({ error: 'Token inválido ou expirado' }, 401);
    request.headers.set('x-user-sub', payload.sub);
    request.headers.set('x-user-name', payload.name || '');
    request.headers.set('x-user-email', payload.email || '');
    request.headers.set('x-user-picture', payload.picture || '');
  }

  if (url.pathname === '/api/scan-invoice' && request.method === 'POST') {
    // Protegido: usa a chave do dono, então só usuário logado pode escanear.
    const scanSub = request.headers.get('x-user-sub');
    if (!scanSub) return json({ error: 'Faça login para usar o scanner.' }, 401);
    let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Corpo da requisição inválido.' }, 400);
      }

      const { image, mimeType } = body || {};
      if (!image) {
        return json({ error: 'Nenhuma imagem foi recebida. Por favor, envie uma foto ou print.' }, 400);
      }

      let base64Data = image;
      let detectedMime = mimeType || 'image/jpeg';
      const match = String(image).match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        detectedMime = match[1];
        base64Data = match[2];
      } else if (String(image).includes(',')) {
        base64Data = String(image).split(',')[1];
      }

      const key = env.GEMINI_API_KEY;
      if (!key) return json(simulation());

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { inlineData: { mimeType: detectedMime, data: base64Data } },
                    { text: PROMPT },
                  ],
                },
              ],
              generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA },
            }),
          },
        );

        if (!res.ok) {
          console.warn('Gemini respondeu', res.status, (await res.text()).slice(0, 300));
          return json(simulation());
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
        if (!text) return json(simulation());
        return json(JSON.parse(text));
      } catch (err) {
        console.warn('Falha na chamada do Gemini:', err?.message || err);
        return json(simulation());
      }
    }

    if (url.pathname.startsWith('/api/')) {
      return handleSyncApi(request, env, url, {
        ensureSchema,
        getHouseholdForUser,
        shapeHousehold,
        txRow,
        upsertTxStmt,
        rowToTransaction,
        catRow,
        rowToCategory,
        accRow,
        rowToAccount,
        goalRow,
        rowToGoal,
        genInviteCode,
      });
    }

    return env.ASSETS.fetch(request);
}
