# 🔒 Configuração segura do MCP Supabase

## Arquivo: `mcp.config.json`

Este arquivo configura o servidor MCP do Supabase. Ele contém a **URL do projeto** (não é segredo) e um placeholder para a **Service Role Key** (É SEGREDO).

## ⚠️ Regras de segurança

1. **Nunca coloque sua Service Role Key real neste arquivo e faça commit.**
2. A chave dá acesso total ao seu banco de dados (leitura e escrita).
3. Substitua `COLE_AQUI_SUA_SERVICE_ROLE_KEY` apenas em sua máquina local.

## Passos para configurar

1. Acesse o painel do Supabase: **Settings → API**
2. Copie a **service_role key** (não é a `anon key` que já está no código)
3. Cole no arquivo `mcp.config.json` no lugar de `COLE_AQUI_SUA_SERVICE_ROLE_KEY`
4. Salve o arquivo

## Recomendação ainda mais segura

Em vez de colocar a chave direto no JSON, use variáveis de ambiente:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_URL": "https://agffyfubikxdvrmmcjia.supabase.co",
        "SUPABASE_SERVICE_KEY": "${SUPABASE_SERVICE_KEY}"
      }
    }
  }
}
```

E depois defina no seu terminal:
```powershell
$env:SUPABASE_SERVICE_KEY = "sua_chave_aqui"
```

## .gitignore

O arquivo `mcp.config.json` **não deve ser commitado** se contiver chaves reais. Considere adicioná-lo ao `.gitignore`:

```
mcp.config.json
```

Ou mantenha um `mcp.config.json.example` com placeholders e o real em um arquivo ignorado pelo git.
