# User stories — Matriz

Backlog inicial: 22 user stories do MVP, que cobrem as funcionalidades Must (FN01–FN09, FN12–FN14, FN27–FN29), e 15 user stories **fora do MVP** (secção 5), com critérios de aceitação, casos-limite e regras de negócio. As regras PN são **decisões internas (DE) ou pressupostos**, todas por validar com o cliente. Os termos "conta", "função", "Gestor", "Membro" e "Administrador" seguem o [glossário do README](../README.md#glossário).

## 1. User stories

| ID | User story | FN | MoSCoW |
|---|---|---|---|
| US01 | Como **utilizador**, quero entrar com a minha conta, para aceder apenas aos projetos onde participo. | FN01 | Must |
| US02 | Como **Administrador**, quero criar e desativar contas, para que só pessoas da empresa usem a Matriz. | FN02 | Must |
| US03 | Como **Administrador**, quero criar projetos e atribuir-lhes um Gestor, para que cada projeto tenha um responsável pela sua organização. | FN03 | Must |
| US04 | Como **Gestor** de um projeto, quero adicionar e remover membros, para formar a equipa que nele trabalha e o vê. | FN04 | Must |
| US05 | Como **utilizador**, quero ver a lista dos projetos onde participo, para encontrar o meu trabalho. | FN05 | Must |
| US06 | Como **Gestor** de um projeto, quero criar, editar e eliminar tarefas e atribuir-lhes e remover-lhes responsáveis, para que se saiba o que há a fazer e quem o faz. | FN06 | Must |
| US07 | Como **membro** de um projeto (Gestor ou Membro), quero mudar o estado de uma tarefa, para mostrar em que ponto está o trabalho. | FN07 | Must |
| US08 | Como **membro** de um projeto, quero ver as tarefas agrupadas por estado, para perceber o que está por fazer, em curso e concluído. | FN08 | Must |
| US09 | Como **membro** de um projeto, quero ver um indicador de progresso, para saber quanto do trabalho está concluído. | FN09 | Must |
| US10 | Como **Gestor** de um projeto, quero editar e arquivar o projeto, para manter a sua informação correta e fechá-lo quando termina. | FN03 | Must |
| US11 | Como **Administrador**, quero dar e retirar a permissão de Administrador, para partilhar a gestão das contas. | FN02 | Must |
| US12 | Como **Administrador**, quero trocar o Gestor de um projeto, para que o projeto não fique sem gestão quando o Gestor sai. | FN27 | Must |
| US13 | Como **membro** de um projeto, quero comentar tarefas e editar ou apagar os meus comentários, para partilhar informação sobre o trabalho. | FN14 | Must |
| US14 | Como **Administrador**, quero consultar o registo das ações administrativas, para saber quem fez o quê e quando. | FN28 | Must |
| US15 | Como **utilizador**, quero sair da aplicação, para que mais ninguém use a minha conta no mesmo dispositivo. | FN01 | Must |
| US16 | Como **Administrador**, quero ver a lista de contas, para saber quem tem acesso e com que permissão. | FN02 | Must |
| US17 | Como **Administrador**, quero ver todos os projetos na área de administração, para saber quem é o Gestor de cada um e poder trocá-lo. | FN27 | Must |
| US18 | Como **membro** de um projeto, quero ver a descrição, o Gestor e a equipa do projeto, para saber com quem trabalho. | FN03, FN04 | Must |
| US19 | Como **membro** de um projeto, quero abrir uma tarefa, para ver a descrição, os responsáveis, o estado e os comentários. | FN06, FN14 | Must |
| US22 | Como **Gestor** de um projeto, quero dar uma prioridade a uma tarefa, para que a equipa saiba o que fazer primeiro. | FN12 | Must |
| US23 | Como **membro** de um projeto, quero filtrar as tarefas por estado e prioridade e vê-las por páginas, para encontrar uma tarefa rapidamente. | FN13 | Must |
| US31 | Como **responsável** de uma tarefa, quero pedir ao Gestor que adicione outro membro como responsável, para ter ajuda no trabalho. | FN29 | Must |

### Rastreabilidade FN → US

| FN | User stories |
|---|---|
| FN01 | US01, US15 |
| FN02 | US02, US11, US16 |
| FN03 | US03, US10, US18 |
| FN04 | US04, US18 |
| FN05 | US05 |
| FN06 | US06, US19 |
| FN07 | US07 |
| FN08 | US08 |
| FN09 | US09 |
| FN12 | US22 |
| FN13 | US23 |
| FN14 | US13, US19 |
| FN27 | US12, US17 |
| FN28 | US14 |

A rastreabilidade das funcionalidades fora do MVP está na [secção 5](#5-fora-do-mvp).

## 2. Critérios de aceitação

As 21 stories do MVP têm critérios em Dado / Quando / Então, cada uma com o caminho normal e pelo menos um caso de erro.

### US01: Entrar com a conta (FN01)

**Caminho normal**

- **Dado** que tenho uma conta ativa e participo em projetos como Gestor ou Membro,
- **Quando** entro com as minhas credenciais corretas,
- **Então** vejo a lista dos projetos onde sou Gestor ou Membro, e só esses.

**Caminho normal: Administrador sem projetos**

- **Dado** que a minha conta tem permissão de Administrador e não participo em nenhum projeto,
- **Quando** entro com as minhas credenciais corretas,
- **Então** vejo a lista de projetos vazia e tenho acesso à área de administração.

**Erro: credenciais erradas**

- **Dado** que tenho uma conta ativa,
- **Quando** entro com credenciais erradas,
- **Então** vejo uma mensagem de erro e não acedo a nenhum projeto.

**Erro: conta desativada**

- **Dado** que a minha conta foi desativada,
- **Quando** tento entrar com as credenciais que tinha,
- **Então** vejo uma mensagem a indicar que a conta está desativada e não acedo a nenhum projeto.

**Erro: conta pendente**

- **Dado** que a minha conta está "Pendente" porque ainda não defini a palavra-passe,
- **Quando** tento entrar com o meu email,
- **Então** vejo a mesma mensagem de erro que com credenciais erradas, para não revelar que o email existe, e não acedo a nenhum projeto (DE15).

### US02: Criar e desativar contas (FN02)

**Caminho normal: criar**

- **Dado** que sou Administrador,
- **Quando** crio uma conta com nome e endereço de email,
- **Então** a conta aparece na lista de contas com o estado "Pendente", sem permissão de Administrador e sem projetos, a pessoa recebe um email com um link de ativação válido durante 24 horas e a ação fica no registo (US14) (DE15).

**Caminho normal: ativar a conta**

- **Dado** que a Ana recebeu o link de ativação há menos de 24 horas,
- **Quando** abre o link e define uma palavra-passe com pelo menos 12 caracteres,
- **Então** a conta passa a "Ativa", a Ana consegue entrar (US01) e o link deixa de funcionar (DE15).

**Erro: palavra-passe curta**

- **Dado** que a Ana abriu um link de ativação válido,
- **Quando** define uma palavra-passe com menos de 12 caracteres,
- **Então** vê uma mensagem a indicar o comprimento mínimo, a conta continua "Pendente" e o link continua válido.

**Erro: link expirado**

- **Dado** que a Ana recebeu o link de ativação há mais de 24 horas,
- **Quando** o abre,
- **Então** vê uma mensagem a indicar que o link expirou e que deve pedir um novo convite ao Administrador, e a conta continua "Pendente".

**Erro: link já usado ou substituído**

- **Dado** que a Ana já ativou a conta com o link, ou que o Administrador reenviou o convite depois de esse link ter sido enviado,
- **Quando** abre esse link,
- **Então** vê uma mensagem a indicar que o link não é válido, e nem a conta nem a palavra-passe mudam.

**Caminho normal: reenviar o convite**

- **Dado** que sou Administrador e a conta da Ana está "Pendente",
- **Quando** reenvio o convite,
- **Então** a Ana recebe um email com um link novo, válido durante 24 horas, o link anterior deixa de funcionar e a ação fica no registo (US14) (DE15).

**Erro: reenviar o convite a uma conta que não está pendente**

- **Dado** que a conta do Rui está "Ativa" ou "Desativada",
- **Quando** procuro reenviar-lhe o convite,
- **Então** não existe essa ação e nenhum email é enviado.

**Caminho normal: desativar**

- **Dado** que existe uma conta ativa que não é a conta de sistema,
- **Quando** a desativo,
- **Então** o seu estado passa a "Desativada", essa pessoa deixa de conseguir entrar (US01) e a ação fica no registo (US14).

**Caminho normal: desativar uma conta pendente**

- **Dado** que a conta da Ana está "Pendente",
- **Quando** a desativo,
- **Então** o seu estado passa a "Desativada", o link de ativação deixa de funcionar e a ação fica no registo (US14) (DE15).

**Erro: email repetido**

- **Dado** que já existe uma conta, pendente, ativa ou desativada, com o email "ana@empresa.pt",
- **Quando** tento criar outra conta com o mesmo email,
- **Então** a conta não é criada e vejo uma mensagem a indicar que o email já está em uso.

**Erro: sem permissão**

- **Dado** que a minha conta não tem permissão de Administrador,
- **Quando** tento criar ou desativar uma conta,
- **Então** a ação é recusada e a lista de contas não muda.

**Caminho normal: desativar um responsável (CL4)**

- **Dado** que o Rui é responsável pela tarefa "Rever textos" ("Em curso") e pela tarefa "Criar logótipo" ("Concluída"),
- **Quando** desativo a conta do Rui,
- **Então** o Rui deixa de ser responsável por "Rever textos", que continua "Em curso" (e fica "Sem responsável" se ele era o único), e "Criar logótipo" continua a mostrar "Rui (conta desativada)" entre os responsáveis (PN08).

**Erro: desativar a conta de sistema**

- **Dado** que sou Administrador,
- **Quando** tento desativar a conta de sistema,
- **Então** a ação é recusada e a conta continua "Ativa".

**Erro: reativar uma conta**

- **Dado** que a conta do Rui está "Desativada",
- **Quando** procuro reativá-la,
- **Então** não existe essa ação e a conta continua "Desativada".

### US03: Criar um projeto e atribuir o Gestor (FN03)

**Caminho normal**

- **Dado** que sou Administrador e a Ana tem uma conta ativa,
- **Quando** crio o projeto "Site" com uma descrição e escolho a Ana como Gestor,
- **Então** o projeto fica "Ativo", a Ana é o seu Gestor e única membro, o projeto aparece na lista de projetos dela (US05) e a ação fica no registo (US14).

**Erro: sem Gestor**

- **Dado** que sou Administrador,
- **Quando** tento criar um projeto sem escolher Gestor,
- **Então** o projeto não é criado e vejo uma mensagem a indicar que o Gestor é obrigatório.

**Erro: nome vazio**

- **Dado** que sou Administrador,
- **Quando** tento criar um projeto sem nome,
- **Então** o projeto não é criado e vejo uma mensagem a indicar que o nome é obrigatório.

**Erro: Gestor com conta desativada**

- **Dado** que a conta do Rui está desativada,
- **Quando** tento criar um projeto com o Rui como Gestor,
- **Então** o projeto não é criado e o Rui não aparece entre as contas que posso escolher.

**Erro: sem permissão**

- **Dado** que a minha conta não tem permissão de Administrador,
- **Quando** tento criar um projeto,
- **Então** a ação é recusada e nenhum projeto é criado.

### US04: Adicionar e remover membros (FN04)

**Caminho normal: adicionar**

- **Dado** que sou Gestor do projeto ativo "Site" e a Ana tem uma conta ativa,
- **Quando** adiciono a Ana ao projeto,
- **Então** a Ana aparece na lista de membros e o projeto "Site" aparece na lista de projetos dela (US05).

**Caminho normal: remover**

- **Dado** que sou Gestor do projeto ativo "Site" e a Ana é Membro,
- **Quando** a removo,
- **Então** a Ana deixa de constar da lista de membros e o projeto deixa de aparecer na lista dela.

**Erro: sem permissão**

- **Dado** que sou Membro, mas não Gestor, do projeto "Site", com ou sem permissão de Administrador,
- **Quando** tento adicionar ou remover um membro,
- **Então** a ação é recusada e a lista de membros não muda.

**Caminho normal: remover um membro com tarefas (CL1)**

- **Dado** que sou Gestor do projeto ativo "Site" e o Rui, com a conta ativa ou desativada, é responsável por "Rever textos" ("Em curso") e por "Criar logótipo" ("Concluída"),
- **Quando** removo o Rui do projeto,
- **Então** o Rui deixa de ser responsável por "Rever textos" (que fica "Sem responsável" se ele era o único), "Criar logótipo" continua a mostrar o Rui entre os responsáveis, com a indicação "já não é membro" (ou "conta desativada", se for o caso), e o progresso não muda (PN07).

**Erro: conta desativada**

- **Dado** que sou Gestor do projeto ativo "Site" e a conta do Rui está desativada,
- **Quando** procuro uma conta para adicionar ao projeto,
- **Então** o Rui não aparece entre as contas que posso escolher e, se o pedido for feito na mesma, é recusado e a lista de membros não muda (PN08).

**Erro: projeto arquivado**

- **Dado** que sou Gestor do projeto "Site" e o projeto está arquivado,
- **Quando** tento adicionar ou remover um membro,
- **Então** a ação é recusada e a lista de membros não muda.

### US05: Ver a lista de projetos (FN05)

**Caminho normal**

- **Dado** que sou Gestor do projeto "Site", com 3 de 4 tarefas concluídas, e Membro do projeto "Campanha",
- **Quando** entro na aplicação,
- **Então** vejo os dois projetos no ecrã inicial, cada um com o nome, a minha função e o progresso (no "Site", "Por fazer: 1, Em curso: 0, Concluída: 3" e "75% concluído").

**Caso sem tarefas**

- **Dado** que participo num projeto sem tarefas,
- **Quando** abro o ecrã inicial,
- **Então** esse projeto mostra "Sem tarefas" e não mostra percentagem (PN13).

**Caso: projeto arquivado**

- **Dado** que participo no projeto arquivado "Intranet",
- **Quando** abro o ecrã inicial,
- **Então** o projeto aparece na lista com a indicação "Arquivado" e o seu progresso (CL3).

**Caso sem projetos**

- **Dado** que a minha conta não participa em nenhum projeto,
- **Quando** abro o ecrã inicial,
- **Então** a lista aparece vazia, com uma mensagem a indicar que ainda não participo em nenhum projeto.

**Erro: projeto onde não participo**

- **Dado** que não sou membro do projeto "Site", mesmo que tenha permissão de Administrador,
- **Quando** abro o ecrã inicial,
- **Então** o projeto "Site" não aparece na lista e não vejo nenhum dado dele (PN02).

### US06: Criar, editar, eliminar e atribuir tarefas (FN06)

**Caminho normal: criar**

- **Dado** que sou Gestor de um projeto ativo,
- **Quando** crio uma tarefa com título "Rever textos" e escolho a Ana e o Bruno, membros do projeto, como responsáveis,
- **Então** a tarefa aparece no projeto com esse título, a Ana e o Bruno como responsáveis e o estado "Por fazer".

**Caminho normal: sem responsável**

- **Dado** que sou Gestor de um projeto ativo,
- **Quando** crio uma tarefa sem escolher responsáveis,
- **Então** a tarefa é criada e mostra "Sem responsável".

**Caminho normal: atribuir mais um responsável**

- **Dado** que a tarefa "Rever textos" tem a Ana como responsável e o Bruno é membro do projeto com a conta ativa,
- **Quando** atribuo o Bruno à tarefa,
- **Então** a tarefa mostra a Ana e o Bruno como responsáveis (DE16).

**Caminho normal: remover um responsável**

- **Dado** que a tarefa "Rever textos" tem a Ana e o Bruno como responsáveis,
- **Quando** removo o Bruno,
- **Então** a tarefa mostra só a Ana; se remover também a Ana, mostra "Sem responsável".

**Caminho normal: remover de uma tarefa concluída quem já não é membro**

- **Dado** que a tarefa "Criar logótipo" está "Concluída" e mostra "Rui (já não é membro)",
- **Quando** removo o Rui dos responsáveis,
- **Então** a tarefa deixa de o mostrar e continua "Concluída" (DE14).

**Caminho normal: editar**

- **Dado** que sou Gestor de um projeto ativo e existe a tarefa "Rever textos",
- **Quando** altero o título para "Rever textos da página inicial",
- **Então** a tarefa mostra o novo título e mantém os responsáveis e o estado.

**Caminho normal: eliminar**

- **Dado** que sou Gestor de um projeto ativo com 4 tarefas, uma delas "Rever textos",
- **Quando** elimino a tarefa "Rever textos",
- **Então** a tarefa deixa de aparecer no projeto e o indicador de progresso (US09) passa a contar 3 tarefas.

**Erro: título vazio**

- **Dado** que sou Gestor e estou a criar uma tarefa,
- **Quando** deixo o título vazio e confirmo,
- **Então** a tarefa não é criada e vejo uma mensagem a indicar que o título é obrigatório.

**Erro: responsável repetido**

- **Dado** que a tarefa "Rever textos" tem a Ana como responsável,
- **Quando** tento atribuir outra vez a Ana,
- **Então** a ação é recusada e a tarefa continua a mostrar a Ana uma só vez (DE16).

**Erro: responsável fora do projeto (criar)**

- **Dado** que sou Gestor e o Rui não é membro do projeto,
- **Quando** crio uma tarefa,
- **Então** o Rui não aparece entre as pessoas que posso escolher como responsáveis.

**Erro: responsável fora do projeto (atribuir)**

- **Dado** que a tarefa "Rever textos" tem a Ana como responsável e o Rui não é membro do projeto,
- **Quando** tento atribuir o Rui à tarefa,
- **Então** a ação é recusada e a Ana continua a ser a única responsável.

**Erro: responsável com conta desativada (criar)**

- **Dado** que sou Gestor e o Rui é membro do projeto, mas a conta dele foi desativada,
- **Quando** crio uma tarefa,
- **Então** o Rui não aparece entre as pessoas que posso escolher como responsáveis (PN08).

**Erro: responsável com conta desativada (atribuir)**

- **Dado** que a tarefa "Rever textos" tem a Ana como responsável e a conta do Rui, membro do projeto, está desativada,
- **Quando** tento atribuir o Rui à tarefa,
- **Então** a ação é recusada e a Ana continua a ser a única responsável.

**Erro: Membro tenta criar, editar, eliminar ou mudar os responsáveis**

- **Dado** que sou Membro, mas não Gestor, de um projeto ativo,
- **Quando** tento criar uma tarefa, alterar o título ou a descrição de uma tarefa, atribuir ou remover responsáveis, ou eliminá-la,
- **Então** a ação é recusada e a tarefa (ou a lista de tarefas) não muda.

### US07: Mudar o estado de uma tarefa (FN07)

**Caminho normal**

- **Dado** que sou Membro do projeto ativo "Site" e a tarefa "Rever textos" está em "Por fazer",
- **Quando** a mudo para "Em curso",
- **Então** a tarefa mostra o estado "Em curso" e passa para o grupo "Em curso" (US08).

**Caminho normal: reabrir**

- **Dado** que sou Membro do projeto ativo "Site", que tem 4 tarefas, 3 delas em "Concluída" (75% concluído),
- **Quando** mudo uma tarefa de "Concluída" para "Em curso",
- **Então** o estado muda e o indicador de progresso (US09) passa a mostrar "50% concluído".

**Caminho normal: reabrir uma tarefa de conta desativada**

- **Dado** que a tarefa "Criar logótipo" está "Concluída" e mostra a Ana e "Rui (conta desativada)" como responsáveis,
- **Quando** a mudo para "Em curso",
- **Então** a tarefa passa a "Em curso", o Rui deixa de ser responsável e a Ana continua (PN08, PN10).

**Caminho normal: reabrir uma tarefa de quem já não é membro**

- **Dado** que o Rui foi removido do projeto e a tarefa "Criar logótipo" está "Concluída" e mostra só "Rui (já não é membro)",
- **Quando** a mudo para "Em curso",
- **Então** a tarefa passa a "Em curso" e a "Sem responsável" (PN07, PN10).

**Erro: projeto arquivado**

- **Dado** que o projeto está arquivado,
- **Quando** tento mudar o estado de uma tarefa,
- **Então** a ação é recusada e a tarefa não muda.

### US08: Ver as tarefas agrupadas por estado (FN08)

**Caminho normal**

- **Dado** que sou membro de um projeto com tarefas nos três estados,
- **Quando** abro o projeto,
- **Então** vejo três grupos, "Por fazer", "Em curso" e "Concluída", e cada tarefa aparece no grupo do seu estado com o título e o responsável.

**Caso: grupo vazio**

- **Dado** que nenhuma tarefa do projeto está "Em curso",
- **Quando** abro o projeto,
- **Então** o grupo "Em curso" aparece vazio.

**Caso: projeto arquivado**

- **Dado** que o projeto está arquivado,
- **Quando** o abro,
- **Então** vejo os grupos e as tarefas, mas não posso alterá-los (CL3).

**Erro: sem acesso**

- **Dado** que não sou membro do projeto, mesmo que tenha permissão de Administrador,
- **Quando** tento ver as tarefas,
- **Então** o acesso é recusado.

### US09: Indicador de progresso (FN09)

**Caminho normal**

- **Dado** que sou membro de um projeto com 4 tarefas: 1 "Por fazer", 0 "Em curso" e 3 "Concluída",
- **Quando** abro o projeto,
- **Então** o indicador mostra "Por fazer: 1, Em curso: 0, Concluída: 3" e "75% concluído".

**Caso sem tarefas**

- **Dado** que sou membro de um projeto sem tarefas,
- **Quando** abro o projeto,
- **Então** o indicador mostra "Sem tarefas" e não mostra percentagem.

**Erro: sem acesso**

- **Dado** que não sou membro do projeto, mesmo que tenha permissão de Administrador,
- **Quando** tento ver o progresso desse projeto,
- **Então** o acesso é recusado e não vejo nenhum dado do projeto.

### US10: Editar e arquivar o projeto (FN03)

**Caminho normal: editar**

- **Dado** que sou Gestor do projeto ativo "Site",
- **Quando** altero a descrição do projeto,
- **Então** o projeto mostra a nova descrição.

**Caminho normal: arquivar**

- **Dado** que sou Gestor do projeto ativo "Site",
- **Quando** arquivo o projeto,
- **Então** o estado passa a "Arquivado" e o projeto continua visível para os membros, só de leitura (CL3).

**Erro: sem permissão**

- **Dado** que sou Membro, mas não Gestor, do projeto "Site", com ou sem permissão de Administrador,
- **Quando** tento editar ou arquivar o projeto,
- **Então** a ação é recusada e o projeto não muda.

### US11: Dar e retirar a permissão de Administrador (FN02)

**Caminho normal: dar**

- **Dado** que sou Administrador e o Rui tem uma conta ativa sem permissão de Administrador,
- **Quando** lhe dou a permissão de Administrador,
- **Então** a conta do Rui aparece como Administrador, o Rui passa a poder criar contas e a ação fica no registo (US14).

**Caminho normal: retirar**

- **Dado** que sou Administrador e o Rui tem permissão de Administrador,
- **Quando** lha retiro,
- **Então** o Rui deixa de poder fazer ações administrativas, mantém as suas funções nos projetos e a ação fica no registo (US14).

**Erro: conta de sistema**

- **Dado** que sou Administrador,
- **Quando** tento retirar a permissão de Administrador à conta de sistema,
- **Então** a ação é recusada e a conta de sistema continua Administrador.

**Erro: conta desativada**

- **Dado** que a conta do Rui está desativada,
- **Quando** tento dar-lhe a permissão de Administrador,
- **Então** a ação é recusada.

**Erro: sem permissão**

- **Dado** que a minha conta não tem permissão de Administrador,
- **Quando** tento dar ou retirar a permissão a alguém,
- **Então** a ação é recusada e nenhuma conta muda.

### US12: Trocar o Gestor de um projeto (FN27)

**Caminho normal: novo Gestor já é membro**

- **Dado** que sou Administrador, a Ana é Gestor do projeto "Site" e o Rui é Membro com conta ativa,
- **Quando** nomeio o Rui Gestor do projeto,
- **Então** o Rui passa a Gestor, a Ana passa a Membro e a ação fica no registo (US14).

**Caminho normal: novo Gestor ainda não é membro**

- **Dado** que sou Administrador, a Ana é Gestor do projeto "Site", não há outro membro adequado e a Sofia tem uma conta ativa,
- **Quando** adiciono a Sofia à equipa e a nomeio Gestor,
- **Então** a Sofia aparece na lista de membros como Gestor, a Ana passa a Membro e as duas ações ficam no registo (US14).

**Caminho normal: Gestor com conta desativada (CL8)**

- **Dado** que a conta da Ana, Gestor do projeto "Site", foi desativada e o Rui é Membro com conta ativa,
- **Quando** nomeio o Rui Gestor do projeto,
- **Então** o Rui passa a Gestor e volta a haver quem possa gerir membros, tarefas e o projeto.

**Erro: novo Gestor com conta desativada**

- **Dado** que a conta do Rui está desativada,
- **Quando** tento nomear o Rui Gestor do projeto,
- **Então** a ação é recusada e o Gestor não muda.

**Erro: sem permissão**

- **Dado** que sou Gestor ou Membro do projeto, mas não tenho permissão de Administrador,
- **Quando** tento trocar o Gestor,
- **Então** a ação é recusada e o Gestor não muda.

### US13: Comentar tarefas (FN14)

**Caminho normal: comentar**

- **Dado** que sou Membro do projeto ativo "Site",
- **Quando** escrevo um comentário na tarefa "Rever textos",
- **Então** o comentário aparece na tarefa com o meu nome, a data e a hora.

**Caminho normal: editar e apagar o meu comentário**

- **Dado** que escrevi um comentário numa tarefa de um projeto ativo,
- **Quando** o edito ou o apago,
- **Então** a tarefa mostra o comentário alterado ou deixa de o mostrar.

**Erro: comentário de outra pessoa**

- **Dado** que a Ana escreveu um comentário numa tarefa,
- **Quando** tento editá-lo ou apagá-lo, sendo eu outra pessoa, mesmo que Gestor,
- **Então** a ação é recusada e o comentário não muda.

**Erro: comentário vazio**

- **Dado** que sou membro de um projeto ativo,
- **Quando** tento gravar um comentário vazio,
- **Então** o comentário não é criado.

**Erro: projeto arquivado**

- **Dado** que o projeto está arquivado,
- **Quando** tento comentar, ou editar ou apagar um comentário,
- **Então** a ação é recusada e os comentários não mudam.

### US14: Registo das ações administrativas (FN28)

**Caminho normal**

- **Dado** que o Administrador Paulo criou a conta da Ana,
- **Quando** consulto o registo como Administrador,
- **Então** vejo uma entrada com o autor "Paulo", a ação "Criar conta", o alvo "Ana", a data e a hora.

**Erro: sem permissão**

- **Dado** que a minha conta não tem permissão de Administrador,
- **Quando** tento consultar o registo,
- **Então** o acesso é recusado.

**Erro: alterar o registo**

- **Dado** que sou Administrador,
- **Quando** tento alterar ou apagar uma entrada do registo,
- **Então** a ação não existe ou é recusada e a entrada não muda.

### US15: Sair da aplicação (FN01)

**Caminho normal**

- **Dado** que entrei com a minha conta,
- **Quando** escolho "Sair",
- **Então** volto ao ecrã de entrada e, para voltar a ver os meus projetos, tenho de entrar outra vez (US01).

**Erro: voltar atrás depois de sair**

- **Dado** que saí da aplicação,
- **Quando** uso o botão "voltar" do navegador ou abro o endereço de um projeto,
- **Então** não vejo nenhum dado do projeto e sou levado para o ecrã de entrada.

### US16: Ver a lista de contas (FN02)

**Caminho normal**

- **Dado** que sou Administrador e existem as contas da Ana (ativa, Administrador) e do Rui (desativada),
- **Quando** abro a lista de contas,
- **Então** vejo, para cada conta, o nome, o email, o estado ("Pendente", "Ativa" ou "Desativada") e se tem permissão de Administrador, e a conta de sistema aparece identificada como tal.

**Erro: sem permissão**

- **Dado** que a minha conta não tem permissão de Administrador,
- **Quando** tento abrir a lista de contas,
- **Então** o acesso é recusado.

### US17: Ver os projetos na área de administração (FN27)

**Caminho normal**

- **Dado** que sou Administrador e não participo no projeto "Site", cujo Gestor é a Ana,
- **Quando** abro a lista de projetos da área de administração,
- **Então** vejo o "Site" com o nome, o estado, o Gestor "Ana" e os membros, e posso trocar o Gestor (US12).

**Erro: conteúdo do projeto**

- **Dado** que sou Administrador e não participo no projeto "Site",
- **Quando** tento ver as tarefas, os comentários ou o progresso a partir da área de administração,
- **Então** o acesso é recusado (PN02, CL6).

**Erro: sem permissão**

- **Dado** que a minha conta não tem permissão de Administrador,
- **Quando** tento abrir a área de administração,
- **Então** o acesso é recusado.

### US18: Ver o projeto e a equipa (FN03, FN04)

**Caminho normal**

- **Dado** que sou Membro do projeto "Site", cujo Gestor é a Ana,
- **Quando** abro o projeto,
- **Então** vejo o nome, a descrição, o estado, o Gestor "Ana" e a lista de membros com a função de cada um.

**Caso: membro com conta desativada**

- **Dado** que a conta do Rui, membro do "Site", foi desativada,
- **Quando** abro a equipa do projeto,
- **Então** o Rui aparece com a indicação "conta desativada" (PN08).

**Erro: projeto onde não participo**

- **Dado** que não sou membro do projeto "Site", mesmo que tenha permissão de Administrador,
- **Quando** tento abri-lo,
- **Então** o acesso é recusado e não vejo nenhum dado do projeto.

### US19: Ver o detalhe de uma tarefa (FN06, FN14)

**Caminho normal**

- **Dado** que sou Membro do projeto "Site" e a tarefa "Rever textos" tem descrição, o Bruno e a Ana como responsáveis e 2 comentários,
- **Quando** abro a tarefa,
- **Então** vejo o título, a descrição, os responsáveis por ordem do nome (Ana, Bruno), o estado e os 2 comentários, do mais antigo para o mais recente, cada um com o autor, a data e a hora.

**Caso: pedidos pendentes**

- **Dado** que há um pedido pendente para adicionar o Rui como responsável da tarefa (US31),
- **Quando** abro a tarefa,
- **Então** vejo o pedido, com quem o fez e a data.

**Caso: sem responsável**

- **Dado** que a tarefa não tem responsáveis,
- **Quando** a abro,
- **Então** vejo "Sem responsável".

**Erro: sem acesso**

- **Dado** que não sou membro do projeto, mesmo que tenha permissão de Administrador,
- **Quando** tento abrir uma tarefa desse projeto,
- **Então** o acesso é recusado.

### US22: Prioridade (FN12)

Passou para o MVP em 2026-11-10 (decisão interna); os valores e a permissão eram pressupostos e ficam como decisão interna.

**Caminho normal: criar**

- **Dado** que sou Gestor de um projeto ativo,
- **Quando** crio a tarefa "Rever textos" com a prioridade "Alta",
- **Então** a tarefa aparece com a prioridade "Alta".

**Caminho normal: sem prioridade escolhida**

- **Dado** que sou Gestor de um projeto ativo,
- **Quando** crio uma tarefa sem escolher a prioridade,
- **Então** a tarefa fica com a prioridade "Média".

**Caminho normal: mudar**

- **Dado** que a tarefa "Rever textos" tem a prioridade "Média",
- **Quando**, como Gestor, a mudo para "Baixa",
- **Então** a tarefa mostra "Baixa" e mantém o título, o responsável e o estado.

**Erro: Membro tenta mudar a prioridade**

- **Dado** que sou Membro, mas não Gestor, de um projeto ativo,
- **Quando** tento mudar a prioridade de uma tarefa,
- **Então** a ação é recusada e a prioridade não muda.

**Erro: projeto arquivado**

- **Dado** que o projeto está arquivado,
- **Quando** o Gestor tenta mudar a prioridade de uma tarefa,
- **Então** a ação é recusada e a prioridade não muda (PN09).

### US23: Filtrar as tarefas por estado e prioridade (FN13)

Passou para o MVP em 2026-11-10 (decisão interna), só com o filtro por estado e prioridade e a paginação; a pesquisa por texto e o filtro por responsável ficam na US37 (FN30), fora do MVP.

**Caminho normal: filtrar por prioridade**

- **Dado** que sou membro de um projeto com 6 tarefas, 2 delas com prioridade "Alta" (uma "Por fazer" e uma "Concluída"),
- **Quando** filtro pela prioridade "Alta",
- **Então** só vejo essas 2 tarefas, cada uma no grupo do seu estado, e os totais dos grupos são "Por fazer" 1, "Em curso" 0 e "Concluída" 1.

**Caminho normal: filtrar por estado**

- **Dado** que sou membro de um projeto com tarefas nos três estados,
- **Quando** filtro pelo estado "Em curso",
- **Então** só vejo as tarefas "Em curso".

**Caminho normal: lista paginada**

- **Dado** que um projeto tem 25 tarefas "Por fazer",
- **Quando** abro o projeto,
- **Então** o grupo "Por fazer" mostra as primeiras 20 e o total 25, e posso ver as restantes 5 sem perder as anteriores.

**Caso: sem resultados**

- **Dado** que nenhuma tarefa do projeto tem a prioridade "Baixa",
- **Quando** filtro pela prioridade "Baixa",
- **Então** os três grupos aparecem vazios, com o total 0.

**Erro: sem acesso**

- **Dado** que não sou membro do projeto, mesmo que tenha permissão de Administrador,
- **Quando** tento ver ou filtrar as tarefas,
- **Então** o acesso é recusado.

### US31: Pedir ao Gestor que adicione um responsável (FN29, DE13)

**Caminho normal: pedir**

- **Dado** que sou responsável pela tarefa "Rever textos" do projeto ativo "Site" e o Rui é membro do projeto com a conta ativa,
- **Quando** peço que o Rui seja adicionado como responsável,
- **Então** o pedido fica pendente e aparece na tarefa e na lista de pedidos do Gestor; o Rui ainda não é responsável (PN21).

**Caminho normal: o Gestor aceita**

- **Dado** que sou Gestor do "Site" e há um pedido pendente para adicionar o Rui à tarefa "Rever textos",
- **Quando** aceito o pedido,
- **Então** o Rui passa a responsável pela tarefa e o pedido fica "Aceite".

**Caminho normal: o Gestor recusa**

- **Dado** que sou Gestor e há um pedido pendente para adicionar o Rui,
- **Quando** recuso o pedido,
- **Então** o pedido fica "Recusado" e os responsáveis não mudam.

**Caminho normal: cancelar o meu pedido**

- **Dado** que fiz um pedido que ainda está pendente,
- **Quando** o cancelo,
- **Então** o pedido fica "Cancelado" e deixa de aparecer como pendente.

**Erro: não sou responsável**

- **Dado** que sou membro do projeto, mas não sou responsável pela tarefa "Rever textos",
- **Quando** tento pedir que o Rui seja adicionado,
- **Então** a ação é recusada e não é criado nenhum pedido.

**Erro: pessoa não elegível**

- **Dado** que sou responsável pela tarefa e o Rui não é membro do projeto, tem a conta pendente ou desativada, ou já é responsável pela tarefa,
- **Quando** tento pedir que o Rui seja adicionado,
- **Então** a ação é recusada e não é criado nenhum pedido.

**Erro: pedido repetido**

- **Dado** que já há um pedido pendente para adicionar o Rui à tarefa,
- **Quando** eu ou outro responsável tentamos pedir outra vez o Rui,
- **Então** a ação é recusada e continua a haver um só pedido pendente.

**Erro: a pessoa deixou de ser elegível**

- **Dado** que há um pedido pendente para adicionar o Rui e, entretanto, o Rui foi removido do projeto ou a conta dele foi desativada,
- **Quando** o Gestor tenta aceitar o pedido,
- **Então** a ação é recusada, o Rui não passa a responsável e o pedido continua pendente; o Gestor pode recusá-lo (CL13).

**Erro: só o Gestor decide e só quem pediu cancela**

- **Dado** que há um pedido pendente,
- **Quando** um Membro tenta aceitá-lo ou recusá-lo, ou alguém que não o fez tenta cancelá-lo,
- **Então** a ação é recusada e o pedido não muda.

**Erro: pedido já decidido**

- **Dado** que um pedido já foi aceite, recusado ou cancelado,
- **Quando** alguém tenta aceitá-lo, recusá-lo ou cancelá-lo,
- **Então** a ação é recusada e o pedido não muda.

**Erro: projeto arquivado**

- **Dado** que o projeto está arquivado,
- **Quando** tento fazer, aceitar, recusar ou cancelar um pedido,
- **Então** a ação é recusada e os pedidos não mudam (PN09).

## 3. Casos-limite

Onze dos treze casos têm comportamento definido; CL10 e CL11 ficam em aberto.

| ID | Situação | Comportamento esperado | Regra |
|---|---|---|---|
| CL1 | O Gestor remove um membro que é responsável por tarefas, com a conta ativa ou desativada. | A remoção acontece. A pessoa deixa de ser responsável pelas suas tarefas nesse projeto que não estão "Concluída"; os outros responsáveis mantêm-se e o estado não muda (se era a única, a tarefa fica "Sem responsável"). Nas tarefas "Concluída", continua entre os responsáveis, com a indicação "já não é membro" (ou "conta desativada", se a conta estiver desativada); se uma delas for reaberta, a pessoa sai dos responsáveis. Os números do progresso não mudam. | PN07 |
| CL2 | Um Membro tenta eliminar uma tarefa. | A ação é recusada e a tarefa continua no projeto (ver US06). | PN05 |
| CL3 | Alguém tenta criar, editar, mudar o estado ou os responsáveis, eliminar ou comentar uma tarefa, editar ou apagar um comentário, fazer, decidir ou cancelar um pedido de responsável, ou mudar os membros, num projeto arquivado. | A ação é recusada. O projeto, as tarefas e os comentários continuam visíveis para os membros, e o progresso continua a ser mostrado. | PN09 |
| CL4 | É desativada a conta de alguém que é responsável por tarefas. | A pessoa deixa de conseguir entrar. Deixa de ser responsável pelas suas tarefas que não estão "Concluída", em todos os projetos; os outros responsáveis mantêm-se (se era a única, a tarefa fica "Sem responsável"). Nas tarefas "Concluída", continua entre os responsáveis, com a indicação "conta desativada"; se uma delas for reaberta, a pessoa sai dos responsáveis. Os números do progresso não mudam. Essa conta deixa de poder ser adicionada a projetos ou atribuída como responsável. | PN08 |
| CL5 | O Gestor tenta remover-se a si próprio do projeto. | A ação é recusada. O Gestor só deixa de o ser quando o Administrador o troca (US12). | PN04 |
| CL6 | Uma conta com permissão de Administrador tenta abrir um projeto onde não participa. | O acesso às tarefas, aos comentários e ao progresso é recusado. Na área de administração vê só o nome, o estado, o Gestor e os membros do projeto. | PN02 |
| CL7 | Um projeto teve tarefas e todas foram eliminadas. | O indicador passa a "Sem tarefas", como em US09. | PN13 |
| CL8 | É desativada a conta do Gestor de um projeto ativo. | Os membros continuam a mudar estados e a comentar. Ninguém pode criar tarefas, gerir membros ou arquivar o projeto até o Administrador nomear um novo Gestor (US12). | PN14 |
| CL9 | Alguém tenta desativar a conta de sistema ou retirar-lhe a permissão de Administrador. | A ação é recusada. Como a conta de sistema é sempre um Administrador ativo, nunca se fica sem Administrador. | PN16 |
| CL10 | O Administrador nomeia-se a si próprio Gestor de um projeto onde não participa (US12). | **Não resolvido.** Se for permitido, passa a ver o conteúdo do projeto, o que contorna R10. | PN14 |
| CL11 | Uma pessoa cuja conta foi desativada volta à empresa. | **Não resolvido.** A conta não pode ser reativada (PN17) e o email único (PN11) impede criar outra conta com o mesmo email. | PN11, PN17 |
| CL12 | O autor de comentários é removido do projeto ou a sua conta é desativada. | Os comentários mantêm-se, com o nome do autor e, se for o caso, a indicação "conta desativada". | PN15 |
| CL13 | Há um pedido pendente para adicionar um responsável e, entretanto, a pessoa pedida sai do projeto, fica com a conta desativada ou já foi atribuída pelo Gestor, ou quem fez o pedido deixa de ser responsável. | O pedido não é cancelado automaticamente. Ao aceitar, as condições sobre a pessoa pedida são verificadas outra vez: se já não se cumprem, a aceitação é recusada e o pedido continua pendente, para o Gestor o recusar. Que quem fez o pedido continue responsável não é verificado outra vez. | PN21 |

## 4. Regras de negócio (PN01–PN21)

Nenhuma regra foi validada pelo cliente. A coluna "Origem" indica se a regra concretiza uma decisão interna (DE) ou é um pressuposto nosso.

| ID | Regra | Origem | Usado em |
|---|---|---|---|
| PN01 | Uma conta não tem papel próprio. Em cada projeto onde participa, é Gestor ou Membro; a mesma conta pode ter funções diferentes em projetos diferentes. | DE01 | US01, US05 |
| PN02 | A permissão de Administrador pertence à conta e acumula com funções em projetos. Não dá acesso a tarefas, comentários ou progresso de projetos onde a conta não participa. Na área de administração, o Administrador vê de cada projeto só o nome, o estado, o Gestor e os membros, para poder trocar o Gestor. | DE02; a área de administração é pressuposto | US01, US09, CL6 |
| PN03 | Cada projeto tem exatamente um Gestor, que é também membro do projeto. É atribuído pelo Administrador quando cria o projeto. | DE06 | US03, US04 |
| PN04 | O Gestor não pode ser removido do projeto nem remover-se. Só deixa de ser Gestor quando o Administrador o troca; passa então a Membro. | DE08; "passa a Membro" é pressuposto | US12, CL5 |
| PN05 | Só o Gestor cria tarefas, edita o título, a descrição e a prioridade, atribui e remove responsáveis e elimina tarefas. Qualquer membro, incluindo o Gestor, pode mudar o estado e comentar. Um responsável pode pedir ao Gestor que adicione outro responsável (PN21). | DE09, DE10, DE13 | US06, US07, US13, US22, US31, CL2 |
| PN06 | Cada tarefa tem zero ou mais responsáveis, sem limite; sem nenhum, mostra "Sem responsável". A mesma pessoa não pode ser responsável duas vezes pela mesma tarefa. Cada responsável tem de ser membro do projeto com conta ativa (nem pendente nem desativada) no momento em que é atribuído. Uma tarefa "Concluída" pode manter entre os responsáveis quem já não é membro ou tem a conta desativada (PN07, PN08). O Gestor pode remover qualquer responsável, também numa tarefa "Concluída". Os responsáveis são mostrados por ordem do nome. | DE09, DE14, DE15, DE16 | US06, US19 |
| PN07 | Quando o Gestor remove um membro, com a conta ativa ou desativada, essa pessoa deixa de ser responsável pelas suas tarefas nesse projeto que não estão "Concluída"; os outros responsáveis mantêm-se. As tarefas "Concluída" mantêm-na entre os responsáveis, com a indicação "já não é membro"; se a conta estiver desativada, mostra-se só "conta desativada" (PN08). A indicação desaparece se a pessoa voltar a ser adicionada ao projeto. | DE14 | US04, US07, CL1 |
| PN08 | Quando uma conta é desativada, essa pessoa deixa de ser responsável pelas suas tarefas que não estão "Concluída", em todos os projetos; os outros responsáveis mantêm-se. As tarefas "Concluída" mantêm-na entre os responsáveis, com a indicação "conta desativada"; se uma delas for reaberta, a pessoa sai dos responsáveis. A conta continua na equipa dos projetos, com a indicação "conta desativada", até o Gestor a remover. Uma conta desativada não pode ser adicionada a um projeto nem atribuída como responsável. | DE14 | US02, US04, US06, US07, US18, CL4 |
| PN09 | Um projeto arquivado fica só de leitura: tarefas, estados, responsáveis, membros, comentários e pedidos de responsável não podem ser alterados. | DE11; resto é pressuposto | US04, US07, US13, US31, CL3 |
| PN10 | Uma tarefa nova começa sempre em "Por fazer". Qualquer estado pode passar a qualquer outro, incluindo reabrir uma tarefa concluída. Ao reabrir uma tarefa "Concluída", saem dos responsáveis as pessoas com a conta desativada ou que já não são membros do projeto; os outros mantêm-se (PN07, PN08). | Pressuposto; reabertura com conta desativada ou de quem já não é membro: DE14 | US06, US07 |
| PN11 | Cada conta é identificada por um endereço de email único, incluindo as contas desativadas. | Pressuposto | US02, CL11 |
| PN12 | O nome do projeto é obrigatório, com 3 a 100 caracteres, e a sua descrição é opcional, até 1000. O título da tarefa é obrigatório, com 3 a 150 caracteres, e a sua descrição é opcional, até 2000. Nomes e títulos só com espaços são recusados. O nome do projeto e o título da tarefa contam e ficam guardados sem os espaços das pontas; uma descrição vazia ou só com espaços fica "sem descrição". | Pressuposto; limites do exemplo da Aula 02 (decisão interna, 2026-11-08); espaços e descrição vazia do projeto (decisão interna, 2026-11-09) e da tarefa (decisão interna, 2026-11-10) | US03, US06, US10 |
| PN13 | A percentagem de conclusão é tarefas concluídas ÷ total de tarefas × 100, arredondada à unidade. Sem tarefas, mostra "Sem tarefas". | Pressuposto | US09, CL7 |
| PN14 | O Administrador pode trocar o Gestor de um projeto. O novo Gestor tem de ser membro do projeto com conta ativa ou pendente (DE15). Se não houver membro adequado, o Administrador pode adicionar uma conta ativa ou pendente à equipa e nomeá-la Gestor. Num projeto arquivado, o Gestor não pode ser trocado (PN09). **Em aberto:** se o Administrador se pode nomear a si próprio (CL10). | DE08, DE15 | US12, CL8, CL10 |
| PN15 | Qualquer membro do projeto pode comentar tarefas. Só o autor pode editar ou apagar os seus comentários. Os comentários mantêm-se quando o autor sai do projeto ou a conta é desativada. Um comentário tem de 1 a 2000 caracteres e não pode ser só espaços. | DE11; autoria e permanência são pressupostos; limites do exemplo da Aula 02 (decisão interna, 2026-11-08) | US13, CL12 |
| PN16 | A conta de sistema (primeira conta de Administrador) não pode ser desativada nem perder a permissão de Administrador. Não é possível retirar a permissão nem desativar o último Administrador ativo. | DE04, DE05 | US02, US11, CL9 |
| PN17 | Uma conta desativada não pode ser reativada. | DE03 | US02, CL11 |
| PN19 | Cada tarefa tem uma prioridade: Baixa, Média ou Alta. Uma tarefa nova fica "Média" se o Gestor não escolher outra. Só o Gestor a define e muda. | decisão interna, 2026-11-10 | US22 |
| PN20 | A lista de tarefas de um projeto pode ser filtrada por estado e por prioridade, em conjunto ou não, e é paginada (20 tarefas por página por omissão, no máximo 100), ordenada da mais antiga para a mais recente. Com ela vêm o total de tarefas que correspondem aos filtros e o número de tarefas em cada estado com o filtro de prioridade aplicado, para cada grupo mostrar o total real. | decisão interna, 2026-11-10 | US08, US23 |
| PN18 | O registo de ações administrativas guarda: criar e desativar contas, reenviar convites, dar e retirar a permissão de Administrador, criar projetos, atribuir e trocar o Gestor e adicionar membros pelo Administrador. Cada entrada tem autor, ação, alvo, data e hora. Só os Administradores o consultam e ninguém o pode alterar ou apagar. | DE12, DE15; conteúdo e acesso são pressupostos | US14 |
| PN21 | Um responsável de uma tarefa pode pedir que outro membro do projeto seja adicionado como responsável. A pessoa pedida tem de ser membro do projeto com conta ativa e ainda não ser responsável, quando o pedido é feito e quando é aceite. Só pode haver um pedido pendente por tarefa e por pessoa. Um pedido está "Pendente", "Aceite", "Recusado" ou "Cancelado". Só o Gestor aceita ou recusa; ao aceitar, a pessoa passa a responsável. Só quem fez o pedido o pode cancelar, enquanto estiver pendente. Qualquer membro do projeto vê os pedidos pendentes de uma tarefa; o Gestor vê também todos os pedidos pendentes do projeto. O pedido não tem mensagem nem gera notificações. Os pedidos não são cancelados automaticamente; são eliminados com a tarefa. Os pedidos decididos ou cancelados ficam guardados e não entram no registo administrativo (PN18). Num projeto arquivado, não se criam, decidem nem cancelam pedidos (PN09). | DE13; decisão interna, 2026-11-11 | US19, US31, CL13 |

## 5. Fora do MVP

Estas user stories correspondem a funcionalidades **fora do MVP** (Should, Could e Won't). Não entram no backlog do MVP. Os critérios assentam em pressupostos, marcados com *(pressuposto)*, que têm de ser revistos antes de a funcionalidade entrar num incremento.

| ID | User story | FN | MoSCoW | MVP |
|---|---|---|---|---|
| US20 | Como **Gestor**, quero dar um prazo a uma tarefa, para que se percebam os atrasos. | FN10 | Should | Fora do MVP |
| US21 | Como **utilizador**, quero ver as minhas tarefas de todos os projetos, para organizar o meu dia. | FN11 | Should | Fora do MVP |
| US24 | Como **membro**, quero receber notificações, para saber quando algo muda nas minhas tarefas. | FN15 | Could | Fora do MVP |
| US25 | Como **membro**, quero anexar ficheiros a uma tarefa, para guardar a documentação junto ao trabalho. | FN16 | Could | Fora do MVP |
| US26 | Como **Gestor**, quero criar subtarefas e dependências, para dividir trabalho complexo. | FN17 | Could | Fora do MVP |
| US27 | Como **membro**, quero ver o histórico de uma tarefa, para saber quem alterou o quê e quando. | FN18 | Could | Fora do MVP |
| US28 | Como **Gestor**, quero exportar um relatório de progresso, para o partilhar fora da aplicação. | FN19 | Could | Fora do MVP |
| US29 | Como **Gestor**, quero configurar os estados do projeto, para seguir o fluxo da minha equipa. | FN20 | Could | Fora do MVP |
| US30 | Como **membro**, quero ver as tarefas num calendário, para planear pelos prazos. | FN21 | Could | Fora do MVP |
| US32 | Como **Gestor**, quero convidar pessoas de fora da empresa, para colaborar com parceiros. | FN22 | Won't | Fora do MVP |
| US33 | Como **membro**, quero registar o tempo gasto numa tarefa, para medir o esforço. | FN23 | Won't | Fora do MVP |
| US34 | Como **Gestor**, quero organizar as tarefas em sprints e backlog, para trabalhar de forma ágil. | FN24 | Won't | Fora do MVP |
| US35 | Como **Administrador**, quero importar dados de outras ferramentas, para não perder o histórico. | FN25 | Won't | Fora do MVP |
| US36 | Como **utilizador**, quero escolher a língua da interface, para trabalhar na minha língua. | FN26 | Won't | Fora do MVP |
| US37 | Como **membro**, quero pesquisar tarefas por texto e filtrá-las por responsável, para encontrar uma tarefa rapidamente. | FN30 | Should | Fora do MVP |

### Critérios de aceitação (Should e Could)

As stories Won't (US32–US36) não têm critérios: dependem de perguntas ao cliente ainda sem resposta (2, 7, 20, 28, 29).

#### US20: Prazo (FN10)

- **Caminho normal:** **Dado** que sou Gestor de um projeto ativo, **Quando** dou o prazo 15/12 à tarefa "Rever textos", **Então** a tarefa mostra esse prazo.
- **Caminho normal: atraso:** **Dado** que o prazo já passou e a tarefa não está "Concluída", **Quando** abro o projeto, **Então** a tarefa aparece como "Atrasada" *(pressuposto)*.
- **Erro: sem permissão:** **Dado** que sou Membro, mas não Gestor, **Quando** tento mudar o prazo, **Então** a ação é recusada *(pressuposto, por analogia com DE09)*.

#### US21: As minhas tarefas (FN11)

- **Caminho normal:** **Dado** que sou responsável por tarefas em "Site" e "Campanha", **Quando** abro "As minhas tarefas", **Então** vejo-as todas, cada uma com o projeto e o estado.
- **Caso sem tarefas:** **Dado** que não sou responsável por nenhuma tarefa, **Quando** abro a vista, **Então** vejo uma mensagem a indicar que não tenho tarefas.
- **Erro: projeto de onde saí:** **Dado** que fui removido de um projeto, **Quando** abro a vista, **Então** não aparece nenhuma tarefa desse projeto, nem as "Concluída" que mantêm o meu nome (PN07, R10).

#### US37: Pesquisar e filtrar por responsável (FN30)

- **Caminho normal:** **Dado** que estou num projeto com 20 tarefas, **Quando** filtro por responsável "Ana" ou pesquiso "textos", **Então** só vejo as tarefas correspondentes.
- **Caso sem resultados:** **Dado** que nenhuma tarefa corresponde, **Quando** pesquiso, **Então** vejo a mensagem "Nenhuma tarefa encontrada".
- **Erro: sem acesso:** a pesquisa nunca mostra tarefas de projetos onde não participo.

#### US24: Notificações (FN15)

- **Caminho normal:** **Dado** que sou membro de um projeto, **Quando** o Gestor me torna responsável por uma tarefa ou alguém comenta uma tarefa minha, **Então** recebo uma notificação. O canal fica por decidir (D01).
- **Erro: sem acesso:** não recebo notificações de projetos onde não participo.

#### US25: Anexos (FN16)

- **Caminho normal:** **Dado** que sou membro de um projeto ativo, **Quando** anexo um ficheiro a uma tarefa, **Então** o anexo aparece na tarefa com o nome, o autor e a data.
- **Erro: projeto arquivado:** **Dado** que o projeto está arquivado, **Quando** tento anexar, **Então** a ação é recusada (PN09). Os limites de tamanho e de tipo ficam por definir.

#### US26: Subtarefas e dependências (FN17)

- **Caminho normal:** **Dado** que sou Gestor, **Quando** crio 3 subtarefas em "Rever textos" e concluo uma, **Então** a tarefa mostra "1 de 3 subtarefas concluídas".
- **Erro: dependência por concluir:** **Dado** que a tarefa B depende da A e a A não está concluída, **Quando** tento concluir a B, **Então** vejo um aviso *(pressuposto: ainda falta decidir se é aviso ou bloqueio)*.
- **Em aberto:** se as subtarefas contam para o progresso (PN13).

#### US27: Histórico da tarefa (FN18)

- **Caminho normal:** **Dado** que a Ana mudou o estado e o Gestor mudou o responsável, **Quando** abro o histórico, **Então** vejo as duas entradas com o autor, a alteração, a data e a hora.
- **Erro: alterar o histórico:** ninguém pode alterar nem apagar entradas do histórico.

#### US28: Relatórios e exportação (FN19)

- **Caminho normal:** **Dado** que sou Gestor, **Quando** exporto o progresso do projeto, **Então** obtenho um ficheiro com o número de tarefas por estado e a percentagem de conclusão. O formato fica por definir.
- **Erro: sem acesso:** uma conta que não é membro do projeto não pode exportar, mesmo com permissão de Administrador.

#### US29: Estados configuráveis (FN20)

- **Caminho normal:** **Dado** que sou Gestor, **Quando** acrescento o estado "Em revisão", **Então** o estado fica disponível nas tarefas do projeto.
- **Erro: estado em uso:** **Dado** que há tarefas num estado, **Quando** tento eliminar esse estado, **Então** a ação é recusada *(pressuposto)*.
- **Em aberto:** contraria R8 e obriga a rever PN13 (o que conta como "concluída").

#### US30: Calendário (FN21, depende de FN10)

- **Caminho normal:** **Dado** que há tarefas com prazo, **Quando** abro o calendário, **Então** cada tarefa aparece no dia do seu prazo.
- **Caso sem prazo:** as tarefas sem prazo não aparecem no calendário.
