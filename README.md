# Bilhetou — frontend

React, TypeScript e Vite. O frontend utiliza a API NestJS para cadastro, campanhas, estoque, pedidos e sessões.

```bash
npm install
npm run dev
```

A API local deve estar disponível em http://127.0.0.1:3000. O Vite encaminha /api para esse endereço. Na Vercel, use VITE_API_URL=/api; o vercel.json encaminha as chamadas para o backend no Render.

O painel /admin exige credencial validada pelo backend. Cadastre campanhas em /admin/campanhas e crie ou importe os bilhetes antes de abrir o fluxo público.

Em `/admin/participantes`, consulte cadastros com busca, filtros e paginação. O telefone fica mascarado na lista; o contato completo e os históricos de pedidos e bilhetes aparecem ao abrir os detalhes. Acesso e isolamento por organização são verificados pela API. Publique frontend e backend atualizados para disponibilizar a aba; não há nova migração para ela.

```bash
npm run build
npm test
npm run test:e2e
```

Pedidos registrados e bilhetes atribuídos não são comprovantes de pagamento. Não há integração automática de pagamentos. Prêmios e datas são exibidos apenas quando configurados na campanha.
