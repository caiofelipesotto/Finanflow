# 📁 Estrutura do Projeto Finanflow

```
Finanflow/
├── config/                  # Configurações do projeto
│   ├── deploy/              # Deploy e hosting
│   │   ├── deploy.json
│   │   └── vercel.json
│   ├── firebase/            # Config Firebase
│   │   ├── firebase-applet-config.json
│   │   └── firebase-blueprint.json
│   ├── firestore/           # Regras Firestore
│   │   ├── DRAFT_firestore.rules
│   │   └── firestore.rules
│   └── mcp/                 # Config MCP (NÃO commitar mcp.config.json)
│       ├── mcp.config.json            ← sua chave real (ignorado pelo git)
│       └── mcp.config.json.example    ← exemplo seguro
├── docs/                    # Documentação
│   ├── SECURITY_MCP.md      # Segurança do MCP Supabase
│   └── security_spec.md     # Especificação de segurança
├── scripts/                 # Scripts utilitários (vazio, para uso futuro)
├── src/                     # Código fonte
│   ├── components/          # Componentes React
│   ├── data/                # Dados estáticos
│   ├── services/            # Serviços (Supabase, OCR, etc.)
│   ├── types/               # Tipos TypeScript
│   └── utils/               # Utilitários (formatters, invoiceParser, etc.)
├── supabase/                # Configuração Supabase
├── public/                  # Assets estáticos
├── .env                     # Variáveis de ambiente (local)
├── .env.example             # Exemplo de variáveis de ambiente
├── .gitignore               # Arquivos ignorados pelo git
├── index.html               # Entry point HTML
├── package.json             # Dependências e scripts
├── package-lock.json        # Lock de dependências
├── bun.lock                 # Lock do Bun
├── server.ts                # Servidor Express backend
├── worker.mjs               # Worker
├── tsconfig.json            # Config TypeScript
├── vite.config.ts           # Config Vite
└── ESTRUTURA.md             # Este arquivo
```

## 🔒 Segurança

- **`config/mcp/mcp.config.json`** contém sua Service Role Key do Supabase — **NÃO é commitado** (está no `.gitignore`)
- Use `config/mcp/mcp.config.json.example` como referência para configurar
- Nunca coloque chaves reais em arquivos que vão para o GitHub

## 🚀 Como rodar

```bash
# Instalar dependências
bun install

# Rodar em desenvolvimento
bun run dev

# Acessar: http://localhost:3000
```
