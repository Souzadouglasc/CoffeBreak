# ☕ CoffeeBrake – Racha do Café

Sistema web para gestão de compras compartilhadas entre colegas de trabalho.

**Stack:** React + Vite + Supabase (PostgreSQL)

---

## 🚀 Como rodar localmente

### 1. Configurar o Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Vá em **SQL Editor** e execute o script `supabase-schema.sql` (está na raiz do projeto)
4. Vá em **Settings > API** e copie a **URL** e a **anon key**

### 2. Configurar variáveis de ambiente

```bash
# Copie o template
cp .env.example .env

# Edite o .env com seus valores do Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### 3. Instalar e rodar

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`

---

## 📁 Estrutura do Projeto

```
CoffeeBrake/
├── public/
├── src/
│   ├── components/
│   │   └── Layout.jsx          # Sidebar + navegação responsiva
│   ├── lib/
│   │   └── supabaseClient.js   # Conexão com Supabase
│   ├── pages/
│   │   ├── DashboardPage.jsx   # Dashboard de saldos
│   │   ├── UsersPage.jsx       # Cadastro de usuários
│   │   ├── PurchasesPage.jsx   # Listagem de compras
│   │   └── NewPurchasePage.jsx # Registro de nova compra
│   ├── utils/
│   │   └── balanceCalculator.js # Algoritmo de cálculo de saldos
│   ├── App.jsx                 # Rotas e layout principal
│   ├── main.jsx                # Entry point
│   └── index.css               # Design system completo
├── supabase-schema.sql         # Script SQL para criar tabelas
├── .env.example                # Template de variáveis de ambiente
└── README.md
```

---

## 🗄️ Banco de Dados

Execute o `supabase-schema.sql` no SQL Editor do Supabase. Ele cria:

| Tabela | Descrição |
|--------|-----------|
| `users` | Participantes (id, name, created_at) |
| `purchases` | Compras (id, user_id, amount, description, date) |
| `participants` | Quem participou da divisão (purchase_id, user_id) |

---

## 🧠 Como funciona o cálculo de saldos

1. Para cada compra, o valor é dividido igualmente entre todos os participantes
2. Cada participante (exceto o comprador) deve sua parte ao comprador
3. As dívidas são consolidadas: se A deve R$10 para B e B deve R$3 para A, o saldo líquido é A deve R$7 para B

---

## 🌐 Deploy gratuito na Vercel

1. Suba o código para o GitHub
2. Acesse [vercel.com](https://vercel.com) e conecte seu repositório
3. Configure as variáveis de ambiente no painel da Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy automático! 🎉

> **Dica:** A Vercel já detecta projetos Vite automaticamente. Nenhuma configuração extra é necessária.

---

## ✨ Funcionalidades

- ✅ Cadastro de usuários (nome)
- ✅ Registro de compras com divisão entre participantes
- ✅ Listagem de compras com filtro por comprador
- ✅ Dashboard com saldos consolidados (quem deve para quem)
- ✅ Total gasto por pessoa
- ✅ Botão para limpar histórico
- ✅ Interface responsiva (funciona no celular)
- ✅ Tema escuro moderno
