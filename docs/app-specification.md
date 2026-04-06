# 🏗️ Fast LINE - Especificação Técnica para IA (v1.2.0)

## 🎯 Objetivo do Sistema
O **Fast LINE** é um sistema de automação contábil projetado para o setor de construção civil no Japão. Ele permite que funcionários em campo enviem fotos de recibos via **LINE Messenger**, onde uma IA (**Gemini via Genkit**) extrai os dados e os consolida em um Dashboard administrativo para controle de custos por obra em tempo real.

## 🛠️ Stack Tecnológica
- **Frontend**: Next.js 14/15 (App Router), React 18/19, Tailwind CSS.
- **UI Components**: Shadcn UI, Lucide React, Recharts (Gráficos).
- **Backend/Database**: Firebase (Cloud Firestore, Authentication, App Hosting).
- **Inteligência Artificial**: Google Genkit + Gemini 2.0 Flash (Extração Multimodal).
- **Integração**: LINE Messaging API (Webhook Pool).

## 🗄️ Estrutura de Dados (Firestore)
- `line_api_pool`: Credenciais LINE pré-cadastradas (FastLine1, FastLine2, etc.) vinculadas a um `ownerId`.
- `owner`: Perfil da empresa/empresa proprietária.
- `projects`: Dados da obra (Nome, ownerId).
- `lineUsers`: Usuários LINE registrados por convite.
- `expenses`: Registros de gastos (valor, data, hora, categoria, projeto, imagem).
- `invites`: Convites para novos usuários (hash de 8 caracteres hex).

## 🧠 Lógica de Negócio e IA
1. **Extração de Dados**: A IA extrai `amount` (total), `description` (nome da loja em japonês), `date` (YYYY-MM-DD), `time` (HH:mm) e `registrationNumber` (NTA).
2. **Categorização**: Classificação automática em categorias como "Food", "Transport", "Work", etc.
3. **NTA Check**: Verificação automática do número de registro da NTA japonesa para validade fiscal.
4. **Compliance (Duplicidade)**: O sistema detecta registros que possuam o mesmo Valor, Data e Hora na mesma empresa.

## 🤖 Fluxo do LINE Bot
- **Webhook Pool**: As URLs de webhook são estáticas e seguem o padrão `/api/line/webhook/FastLineX`.
- O sistema resolve o `ownerId` real consultando a coleção `line_api_pool` usando o ID da URL.
- **Validação de Assinatura**: Obrigatória para todas as requisições vindas do LINE usando o `channelSecret` do pool.
- **Convites**: Usuários se registram enviando um código de 8 dígitos (ex: `A1B2C3D4`) que os vincula à empresa e projetos corretos.

## 📊 Dashboard Administrativo
- **Aba de Despesas**: Lista de recibos com status de processamento e NTA.
- **Aba de Usuários LINE**: Gestão de funcionários vinculados via LINE.
- **Aba de Projetos**: Criação de obras e vinculação de equipes.
- **Aba de Configurações**: Gerenciamento de tokens e pool de APIs.

---
*Documento atualizado para refletir a arquitetura de Webhook Pool.*