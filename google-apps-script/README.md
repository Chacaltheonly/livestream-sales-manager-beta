# Google Apps Script

Use este script como `Apps Script` vinculado a sua planilha.

## Estrutura sugerida

- Aba `Estoque`
- Aba `Vendas`

## Como publicar

1. Abra a planilha.
2. Vá em `Extensões > Apps Script`.
3. Cole o conteúdo de `Code.gs`.
4. Salve o projeto.
5. Vá em `Implantar > Nova implantação`.
6. Escolha `Aplicativo da Web`.
7. Execute como `Você`.
8. Acesso: `Qualquer pessoa com o link`.
9. Copie a URL gerada.

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
