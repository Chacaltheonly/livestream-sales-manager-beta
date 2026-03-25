# Google Apps Script

Use este script como `Apps Script` vinculado a sua planilha.

## Estrutura sugerida

- Aba `Estoque`
- Aba `Vendas`

## Como publicar

1. Abra a planilha.
2. Va em `Extensoes > Apps Script`.
3. Cole o conteudo de `Code.gs`.
4. Salve o projeto.
5. Va em `Implantar > Nova implantacao`.
6. Escolha `Aplicativo da Web`.
7. Execute como `Voce`.
8. Acesso: `Qualquer pessoa com o link`.
9. Copie a URL gerada.
10. Sempre que alterar o script, abra `Implantar > Gerenciar implantacoes` e atualize a implantacao existente.

## Como ligar no app

Depois de publicar, cole a URL em `sheets-config.js`:

```js
window.LIVESELL_CONFIG = {
  sheetsEndpoint: "COLE_AQUI_A_URL_DO_APPS_SCRIPT",
  stockSheetName: "Estoque",
  salesSheetName: "Vendas",
  syncDebounceMs: 700,
};
```

## Observacao importante

Esta versao do script foi preparada para funcionar com GitHub Pages, usando:

- leitura por `GET` com callback (`JSONP`)
- escrita por `POST` simples com campo `payload`

Se voce publicou uma versao anterior do script, substitua o codigo e atualize a implantacao.
