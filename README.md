# Bilhetou — frontend demonstrativo

Projeto existente em React 18, TypeScript e Vite. A entrada agora é o cadastro simples com **nome completo e WhatsApp**, seguido de seleção de bilhetes, resumo, simulação sem cobrança e confirmação. A identidade visual e o modo escuro foram preservados.

## Executar

```bash
npm install
npm run dev
```

Abra http://localhost:5173. No PowerShell com scripts desabilitados, use `npm.cmd` no lugar de `npm`.

```bash
npm run build       # TypeScript + compilação de produção
npm run typecheck   # checagem de tipos
npm test           # regras de sessão, estoque e pedidos
npm run test:e2e   # fluxo real no Chrome, desktop e celular
```

Os testes de navegador usam o Google Chrome instalado (`channel: chrome`). Evidências visuais ficam em `artifacts/`; traces de falhas ficam em `test-results/`.

## Rotas

| Rota | Tela |
| --- | --- |
| `/` | Cadastro com nome completo e WhatsApp |
| `/bilhetes` | Seleção por quantidade ou por bilhete, filtros e paginação |
| `/resumo` | Dados do participante com telefone parcialmente oculto, números e total |
| `/pagamento` | Confirmação de simulação, sem pagamento |
| `/confirmacao` | Último pedido fictício concluído e seus bilhetes |
| `/meus-bilhetes` | Bilhetes atribuídos apenas nesta sessão |
| `/resultados` | Resultado fictício e conferência dos bilhetes da sessão |
| `/admin` | Dashboard demonstrativo em layout separado |
| `/admin/campanhas` | Prévia da campanha |
| `/admin/bilhetes` | Estoque local com busca e paginação |
| `/admin/importacao` | Importação de CSV fictício |
| `/admin/vendedores` | Prévia do módulo de vendedores |
| `/admin/participantes` | Módulo indisponível até autenticação real |
| `/admin/relatorios` | Módulo indisponível até backend autenticado |
| `/admin/apuracoes` | Prévia do módulo de apurações |

As páginas do participante exigem um cadastro demonstrativo da sessão. Resumo e pagamento também exigem uma seleção. Esses redirecionamentos são controles de navegação da demonstração, **não autenticação**.

Em hospedagem de produção, configure o servidor para servir `index.html` nas rotas da aplicação (fallback de SPA). Vite dev e preview já resolvem as rotas diretamente.

## Sessão e limites da demonstração

- Não há Pix, cartão, QR Code de pagamento, checkout financeiro, cobrança, sorteio válido ou prêmio real.
- O catálogo mantém os **50 bilhetes previamente existentes**, agora em `src/data/tickets.json`. Escolher uma quantidade no fluxo público apenas seleciona registros cadastrados; a geração de novos números fica no painel administrativo.
- Nome e WhatsApp são armazenados em `sessionStorage`, junto de seleção, pedidos fictícios e bilhetes importados. Atualizar a página preserva a sessão. Encerrar a sessão limpa os dados demonstrativos. O tema fica em `localStorage`.
- Se o navegador bloquear o armazenamento, a aplicação funciona em memória e mostra que atualizar perderá os dados.
- Informar o mesmo nome e telefone recupera **somente a sessão já aberta nesta aba**. Não há busca de participantes por telefone. Alterar os dados inicia outra sessão e limpa os pedidos anteriores. Não há diretório de pessoas nem consulta a bilhetes de outras sessões.
- Um pedido exige seleção válida e participante da sessão. A confirmação é idempotente; cliques repetidos na mesma solicitação devolvem o mesmo pedido. A atribuição e a disponibilidade são atualizadas juntas, apenas no estado local.
- **Não existe reserva global segura ou garantia de concorrência entre abas, navegadores ou dispositivos.** Esses dados não devem ser usados como estoque real. Alguns navegadores copiam `sessionStorage` ao duplicar uma aba; isso continua sendo uma cópia local, sem reserva compartilhada.
- Os QR Codes dos bilhetes codificam apenas uma referência `bilhetou:demo:v1:<campanha>:<serial>`. Não contêm nome, WhatsApp, token de autenticação ou código de pagamento. Não representam validação oficial.
- A administração não aparece no menu público e tem layout próprio. Sem backend autenticado, ela expõe **apenas a prévia local fictícia**. A rota conhecida não concede acesso a dados reais. Gestão sensível, relatórios reais e dados pessoais administrativos continuam indisponíveis. Não há credencial fixa, senha de frontend ou flag de administrador.

## Organização

- `src/App.tsx`: rotas e carregamento separado da interface administrativa.
- `src/pages/`: cadastro, seleção, resumo, simulação, confirmação, meus bilhetes, resultados e prévia administrativa.
- `src/components/`: layouts, logotipo, botão de tema, `TicketCard`, importação CSV e guardas de navegação.
- `src/services/session.ts`: repositório local, cadastro da sessão, seleção, importação e confirmação atômica local.
- `src/services/tickets.ts`: interface paginada de consulta ao estoque.
- `src/services/demoOrders.ts`: adaptador de pedidos demonstrativos.
- `src/types/index.ts`: contratos de participantes, bilhetes, pedidos e serviços.
- `src/styles.css`, `src/theme.css`, `src/checkout.css`: estilos reaproveitados, modo escuro e novo fluxo responsivo.

## Importação CSV demonstrativa

### Criar lotes pelo painel

Em `/admin/bilhetes`, o formulário **Criar bilhetes** permite informar quantidade (1 a 1.000), prefixo do serial e a opção de não repetir números entre os bilhetes da campanha. Cada bilhete novo recebe quatro números distintos de `0000` a `9999`. Por padrão, um número pode aparecer em bilhetes diferentes. Confira a prévia antes de adicionar o lote e use **Baixar lote em CSV** para exportá-lo.

Há dois destinos explícitos:

- **Sessão do navegador:** adiciona os bilhetes ao estoque local, compartilhado com a simulação pública desta aba. Importação e geração compartilham o limite de 5.000 bilhetes adicionais da sessão.
- **API local · PostgreSQL:** consulta campanhas do backend, gera a prévia no servidor, confirma o lote transacionalmente e mostra o estoque do banco com paginação. Os bilhetes do banco não são copiados para a sessão local. Para usar, configure e inicie o backend `dia-de-sorte-api-starter/dia-de-sorte-api` conforme o README dele, habilitando a criação demonstrativa local. Não há autenticação administrativa real; os endpoints de criação ficam indisponíveis em produção.

O Vite encaminha `/api` para `http://127.0.0.1:3000`. Para outro endereço, defina `VITE_API_URL` em `.env.local` e reinicie o frontend. A API precisa permitir a origem do frontend no CORS. O serviço de integração fica em `src/services/ticketCreationApi.ts`.

O backend usa o schema Prisma existente; nenhuma migração adicional é necessária para criar lotes. Prévias expiram em 15 minutos e não reservam estoque. Se outro lote ocupar os seriais ou números antes da confirmação, a API informa o conflito e solicita uma nova prévia.

Os testes de criação em navegador ficam em `tests/e2e/ticket-creation.spec.ts`. O teste que grava na API exige `TEST_TICKET_API=1` e uma API demo conectada a banco descartável; os demais funcionam sem backend.

A funcionalidade existente foi preservada em `/admin/importacao`. Aceita vírgula ou ponto e vírgula, números com quatro dígitos e serial único. Registros inválidos são informados; os válidos podem ser importados após revisão. Limites: 1 MB, 5.000 linhas por arquivo e 5.000 bilhetes importados por sessão.

```csv
serial,number1,number2,number3,number4
DEMO-CSV-001,0001,1234,5678,9999
```

## Integração futura com NestJS e PostgreSQL

Este repositório contém o frontend. A criação de lotes já foi integrada ao backend NestJS em `dia-de-sorte-api-starter/dia-de-sorte-api`, exclusivamente para demonstração local. Cadastro, seleção e pedidos do fluxo público ainda usam os mocks. Os contratos `ParticipantService`, `TicketService` e `DemoOrderService` permitem substituir esses mocks por chamadas de API. Antes do uso real, o servidor deverá implementar:

1. **Identidade verificada:** fluxo de solicitação e confirmação de OTP via WhatsApp/SMS; criar sessão autenticada no servidor. O número digitado não comprova identidade. Os mocks identificam participantes como `demo-unverified`.
2. **Autorização e isolamento:** derivar o participante da sessão autenticada, e não confiar em `participantId` enviado pelo cliente. Filtrar pedidos e bilhetes por proprietário. Proteger todas as rotas/endpoints administrativos com autenticação real e autorização por papel.
3. **Catálogo paginado:** consulta por campanha, disponibilidade, serial/número e página no servidor; não devolver todo o estoque para o navegador.
4. **Pedidos transacionais:** executar criação, atribuição exclusiva de bilhetes e atualização do estoque na mesma transação PostgreSQL, com bloqueios/constraints adequados e chave de idempotência única por participante. Rejeitar conflitos e recalcular valores no servidor.
5. **Persistência e administração:** campanhas, estoque, importação validada no servidor, vendedores, participantes, resultados verificáveis, relatórios e auditoria. Os módulos sensíveis da prévia só deverão ser habilitados após isso.
6. **Validação de bilhetes:** endpoint com referência opaca/assinada e resposta limitada, sem exposição de dados pessoais. O QR atual é apenas uma referência demonstrativa.

Esta entrega não conecta mensageria, pagamentos nem provedores de sorteio.
