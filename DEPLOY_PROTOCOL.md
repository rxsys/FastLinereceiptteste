# Protocolo de Deploy e Fluxo de Trabalho (OBRIGATÓRIO)

> [!CAUTION]
> **REGRA NÚMERO 1: NUNCA, SOB NENHUMA CIRCUNSTÂNCIA, ENVIAR CÓDIGO PARA A PRODUÇÃO (`/FastLinereceipt`) SEM UMA ORDEM DIRETA E EXPLÍCITA DO USUÁRIO.**
> Mesmo que a implementação pareça correta e testada, o push para a base de produção só deve ocorrer após o comando específico: "pode mandar para produção" ou similar.

ESTE DOCUMENTO DEFINE AS REGRAS INVIOLÁVEIS PARA O DESENVOLVIMENTO DESTE REPOSITÓRIO.

## 1. Fluxo de Trabalho
- **Ambiente de Desenvolvimento/Teste**: `/Users/ricardoyukio/Desktop/Projetos/FastLinereceipt/FastLinereceiptteste`
- **Ambiente de Produção**: `/Users/ricardoyukio/Desktop/Projetos/FastLinereceipt`

## 2. Processo de Mirroring (Espelhamento)
1. Implementar e validar exaustivamente no repositório `FastLinereceiptteste`.
2. Realizar o commit e push para o GitHub de **TESTE**.
3. Aguardar o feedback do usuário.
4. **SOMENTE APÓS A ORDEM DIRETA**, copiar os arquivos para a Produção e realizar o push final.

## 3. Verificação Pós-Mirroring
- Garantir que referências locais ou de teste não vazem para a produção.
- Verificar se as chaves de API e URLs estão corretas para o ambiente final.

---
*Assinado: Antigravity AI Assistant*
*Atualizado em: 2026-04-10*
