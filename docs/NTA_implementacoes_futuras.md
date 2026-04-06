# NTA - Implementações Futuras: Separação Automática de Alíquotas (8% vs. 10%)

## 1. Visão Geral

Esta documentação descreve a pesquisa e o plano de implementação para automatizar a classificação de alíquotas de imposto (8% ou 10%) com base nas informações obtidas da API da Agência Tributária Nacional do Japão (NTA).

A ideia é utilizar o número de registro do comerciante (T-number) para identificar o tipo de negócio e, com isso, inferir a alíquota de imposto correta, simplificando o processo para o usuário final.

## 2. Análise da API da NTA

Após uma consulta, a API da NTA retorna um objeto JSON com várias informações sobre o contribuinte. As mais relevantes para esta implementação são:

-   **`name` (氏名又は名称):** Nome oficial do negócio. **Campo chave** para nossa lógica de inferência.
-   **`address` (本店又は主たる事務所の所在地):** Endereço oficial.
-   **`registrationDate` (登録年月日):** Data de registro.
-   **`updateDate` (最終更新年月日):** Data da última atualização.
-   **`status` (登録ステータス):** Status do registro (e.g., "登録中" - Ativo).

**Ponto Crítico:** A API da NTA **não** fornece um campo estruturado de "Categoria de Negócio". Portanto, a lógica de classificação deverá ser implementada em nossa aplicação, baseando-se principalmente no campo `name`.

## 3. Plano de Implementação

### Parte 1: Backend - Coleta e Armazenamento de Dados de Fornecedores

1.  **Criar Nova Coleção no Firestore:**
    *   **Nome da Coleção:** `vendors`
    *   **ID do Documento:** O `registrationNumber` (T-number) do fornecedor, para garantir a unicidade.
    *   **Estrutura do Documento:**
        ```json
        {
          "name": "Nome do fornecedor (da NTA)",
          "address": "Endereço do fornecedor (da NTA)",
          "businessCategory": "Categoria inferida (ex: 'Supermercado')",
          "inferredTaxRate": 8, // ou 10
          "lastVerifiedAt": "Timestamp",
          "ownerId": "ID do proprietário da conta que fez a verificação"
        }
        ```

2.  **Modificar a API `/api/nta/verify`:**
    *   Após uma verificação bem-sucedida na NTA:
        *   **Lógica de Inferência:** Implementar uma função que analise o campo `name` do fornecedor em busca de palavras-chave.
            *   **Regra para 8%:** Palavras como `スーパー` (supermercado), `コンビニ` (conveniência), `ドラッグストア` (farmácia com alimentos).
            *   **Regra Padrão (10%):** Se nenhuma palavra-chave for encontrada, assume-se 10%.
        *   **Salvar no Banco de Dados:** Criar ou atualizar o documento correspondente na coleção `vendors` com os dados da NTA e a `inferredTaxRate`.

### Parte 2: Frontend e Lógica de Aplicação

1.  **Fluxo de Criação de Despesa (via LINE/OCR):**
    *   Quando o OCR extrai um `registrationNumber` de um recibo, o sistema deve consultar a coleção `vendors`.
    *   Se um documento correspondente for encontrado, a `inferredTaxRate` deve ser salva junto com os outros dados da despesa na coleção `expenses`.

2.  **Dashboard (`ExpensesTab.tsx`):**
    *   **Exibição:** Mostrar a alíquota aplicada (8% ou 10%) na visualização da despesa.
    *   **Edição Manual:** **(Requisito Essencial)** Permitir que o usuário **sempre possa corrigir a alíquota manualmente**. O sistema oferece uma sugestão inteligente, não uma decisão final. A caixa de diálogo de edição de despesa (`EditExpenseDialog`) deve incluir um campo para alterar a alíquota.

## 4. Desafios

*   **Ambiguidade:** Um mesmo estabelecimento pode vender produtos com alíquotas diferentes. A correção manual é a solução.
*   **Qualidade do OCR:** A automação depende da extração bem-sucedida do `registrationNumber`.
*   **Manutenção da Lógica:** A lista de palavras-chave para a inferência precisará ser mantida e expandida com o tempo.
