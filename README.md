# Livestream Sales Manager

Aplicacao web estatica para gerenciar produtos, consultar precos durante lives e registrar vendas.

## O que existe hoje

- Interface pronta em build estatico (`index.html` + `assets/`)
- Persistencia local via `localStorage`
- Importacao de produtos por planilha
- Registro de vendas com tentativa de envio para um Google Apps Script ja embutido no bundle

## Como publicar

Como este repositorio contem apenas o build compilado, basta publicar os arquivos estaticos na raiz do projeto.

### GitHub Pages

1. Envie a branch `main` para o GitHub.
2. No repositorio, abra `Settings > Pages`.
3. Em `Build and deployment`, escolha `Deploy from a branch`.
4. Selecione a branch `main` e a pasta `/ (root)`.
5. Salve e aguarde a URL publica ser gerada.

## Limitacoes importantes

- O codigo-fonte original nao esta no repositorio, apenas o build final.
- Nao ha suite de testes automatizados.
- Existe uma integracao externa hardcoded com Google Apps Script dentro do bundle compilado.
- Melhorias estruturais ficam limitadas sem recuperar o projeto fonte original.

## Integracao com planilha

Agora o projeto tambem suporta sincronizacao com Google Sheets usando:

- [sheets-config.js](/C:/Users/Usuario/OneDrive/Documentos/APP/livestream-sales-manager/sheets-config.js)
- [sheet-sync.js](/C:/Users/Usuario/OneDrive/Documentos/APP/livestream-sales-manager/sheet-sync.js)
- [google-apps-script/Code.gs](/C:/Users/Usuario/OneDrive/Documentos/APP/livestream-sales-manager/google-apps-script/Code.gs)

Fluxo esperado:

- a aba `Estoque` vira a fonte dos produtos
- a aba `Vendas` guarda o historico
- o app carrega os dados da planilha ao abrir
- mudancas em estoque e vendas passam a ser sincronizadas de volta para a planilha
