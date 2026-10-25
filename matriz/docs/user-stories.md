# User stories — Matriz

Backlog inicial do MVP: 9 user stories que cobrem **apenas FN01–FN09** (as funcionalidades Must), com critérios de aceitação, casos-limite e as regras de negócio assumidas. Todas as regras PN são **pressupostos** por validar.

## 1. User stories

| ID | User story | FN | MoSCoW |
|---|---|---|---|
| US01 | Como **Membro**, quero entrar com a minha conta, para aceder apenas aos projetos onde participo. | FN01 | Must |
| US02 | Como **Administrador**, quero criar e desativar contas, para que só pessoas da empresa usem a Matriz. | FN02 | Must |
| US03 | Como **Gestor de projeto**, quero criar, editar e arquivar projetos, para organizar o trabalho da equipa. | FN03 | Must |
| US04 | Como **Gestor de projeto**, quero adicionar e remover membros do meu projeto, para controlar quem nele trabalha e quem o vê. | FN04 | Must |
| US05 | Como **Membro**, quero ver a lista dos projetos a que pertenço, para encontrar o trabalho em que participo. | FN05 | Must |
| US06 | Como **Gestor de projeto**, quero criar tarefas e atribuir-lhes um responsável, para que se saiba o que há a fazer e quem o faz. | FN06 | Must |
| US07 | Como **Membro**, quero editar uma tarefa e mudar o seu estado, para manter a informação atualizada e mostrar em que ponto está o trabalho. | FN06, FN07 | Must |
| US08 | Como **Membro**, quero ver as tarefas de um projeto agrupadas por estado, para perceber o que está por fazer, em curso e concluído. | FN08 | Must |
| US09 | Como **Gestor de projeto**, quero ver um indicador de progresso do projeto, para saber quanto do trabalho está concluído. | FN09 | Must |

### Rastreabilidade FN → US

| FN | User stories |
|---|---|
| FN01 | US01 |
| FN02 | US02 |
| FN03 | US03 |
| FN04 | US04 |
| FN05 | US05 |
| FN06 | US06, US07 |
| FN07 | US07 |
| FN08 | US08 |
| FN09 | US09 |

## 2. Critérios de aceitação

Seis stories têm critérios em Dado / Quando / Então, cada uma com o caminho normal e pelo menos um caso de erro. US03, US05 e US08 ainda não têm critérios definidos.

### US01: Entrar com a conta (FN01)

**Caminho normal**

- **Dado** que tenho uma conta ativa,
- **Quando** entro com as minhas credenciais corretas,
- **Então** vejo a lista dos projetos onde sou membro, e só esses.

**Erro: credenciais erradas**

- **Dado** que tenho uma conta ativa,
- **Quando** entro com credenciais erradas,
- **Então** vejo uma mensagem de erro e não acedo a nenhum projeto.

**Erro: conta desativada**

- **Dado** que a minha conta foi desativada,
- **Quando** tento entrar com as credenciais que tinha,
- **Então** vejo uma mensagem a indicar que a conta está desativada e não acedo a nenhum projeto.

### US02: Criar e desativar contas (FN02)

**Caminho normal: criar**

- **Dado** que sou Administrador,
- **Quando** crio uma conta com nome, endereço de email e papel (Gestor de projeto ou Membro),
- **Então** a conta aparece na lista de contas com o estado "Ativa" e o papel escolhido.

**Caminho normal: desativar**

- **Dado** que existe uma conta ativa,
- **Quando** a desativo,
- **Então** o seu estado passa a "Desativada" e essa pessoa deixa de conseguir entrar (US01).

**Erro: email repetido**

- **Dado** que já existe uma conta com o email "ana@empresa.pt",
- **Quando** tento criar outra conta com o mesmo email,
- **Então** a conta não é criada e vejo uma mensagem a indicar que o email já está em uso.

**Erro: sem permissão**

- **Dado** que sou Membro ou Gestor de projeto,
- **Quando** tento criar ou desativar uma conta,
- **Então** a ação é recusada e a lista de contas não muda.

### US04: Adicionar e remover membros (FN04)

**Caminho normal: adicionar**

- **Dado** que sou Gestor do projeto "Site" e a Ana tem uma conta ativa,
- **Quando** adiciono a Ana ao projeto,
- **Então** a Ana aparece na lista de membros e o projeto "Site" aparece na lista de projetos dela (US05).

**Caminho normal: remover**

- **Dado** que a Ana é membro do projeto "Site",
- **Quando** a removo,
- **Então** a Ana deixa de constar da lista de membros e o projeto deixa de aparecer na lista dela.

**Erro: sem permissão**

- **Dado** que sou Membro, mas não Gestor, do projeto "Site",
- **Quando** tento adicionar ou remover um membro,
- **Então** a ação é recusada e a lista de membros não muda.

**Erro: conta desativada**

- **Dado** que a conta do Rui está desativada,
- **Quando** tento adicionar o Rui ao projeto,
- **Então** a ação é recusada e o Rui não aparece na lista de membros.

### US06: Criar e atribuir tarefas (FN06)

**Caminho normal: criar**

- **Dado** que sou Gestor de um projeto ativo,
- **Quando** crio uma tarefa com título "Rever textos" e escolho a Ana, que é membro do projeto, como responsável,
- **Então** a tarefa aparece no projeto com esse título, a Ana como responsável e o estado "Por fazer".

**Caminho normal: sem responsável**

- **Dado** que sou Gestor de um projeto ativo,
- **Quando** crio uma tarefa sem escolher responsável,
- **Então** a tarefa é criada e mostra "Sem responsável".

**Erro: título vazio**

- **Dado** que estou a criar uma tarefa,
- **Quando** deixo o título vazio e confirmo,
- **Então** a tarefa não é criada e vejo uma mensagem a indicar que o título é obrigatório.

**Erro: responsável fora do projeto**

- **Dado** que o Rui não é membro do projeto,
- **Quando** tento escolhê-lo como responsável,
- **Então** a atribuição é recusada e a tarefa mantém o responsável anterior.

**Erro: eliminar sem permissão**

- **Dado** que sou Membro, mas não Gestor, do projeto,
- **Quando** tento eliminar uma tarefa,
- **Então** a ação é recusada e a tarefa continua no projeto.

**Erro: Membro tenta criar uma tarefa**

- **Dado** que sou Membro, mas não Gestor, de um projeto ativo,
- **Quando** tento criar uma tarefa,
- **Então** a ação é recusada e nenhuma tarefa é criada.

### US07: Editar uma tarefa e mudar o seu estado (FN06, FN07)

**Caminho normal**

- **Dado** que uma tarefa está em "Por fazer",
- **Quando** a mudo para "Em curso",
- **Então** a tarefa mostra o estado "Em curso" e passa para o grupo "Em curso" (US08).

**Caminho normal: editar a descrição**

- **Dado** que sou Membro, mas não Gestor, de um projeto ativo,
- **Quando** altero a descrição de uma tarefa,
- **Então** a tarefa mostra a nova descrição e mantém o responsável e o estado.

**Caminho normal: reabrir**

- **Dado** que uma tarefa está em "Concluída",
- **Quando** a mudo para "Em curso",
- **Então** o estado muda e a percentagem de conclusão do projeto (US09) é recalculada.

**Erro: projeto arquivado**

- **Dado** que o projeto está arquivado,
- **Quando** tento editar uma tarefa ou mudar o seu estado,
- **Então** a ação é recusada e a tarefa não muda.

**Erro: Membro muda o responsável**

- **Dado** que sou Membro, mas não Gestor, do projeto,
- **Quando** tento mudar o responsável de uma tarefa,
- **Então** a ação é recusada e a tarefa mantém o responsável anterior.

### US09: Indicador de progresso (FN09)

**Caminho normal**

- **Dado** que o projeto tem 4 tarefas: 1 "Por fazer", 0 "Em curso" e 3 "Concluída",
- **Quando** abro o projeto,
- **Então** o indicador mostra "Por fazer: 1, Em curso: 0, Concluída: 3" e "75% concluído".

**Caso sem tarefas**

- **Dado** que o projeto não tem tarefas,
- **Quando** abro o projeto,
- **Então** o indicador mostra "Sem tarefas" e não mostra percentagem.

**Erro: sem acesso**

- **Dado** que não sou membro do projeto, incluindo se for Administrador,
- **Quando** tento ver o progresso desse projeto,
- **Então** o acesso é recusado e não vejo nenhum dado do projeto.

## 3. Casos-limite

Sete dos oito casos têm comportamento definido; o CL8 fica em aberto até o cliente decidir (PN14).

| ID | Situação | Comportamento esperado | Pressuposto |
|---|---|---|---|
| CL1 | O Gestor remove um membro que é responsável por tarefas. | A remoção acontece. Todas as tarefas dessa pessoa nesse projeto passam a "Sem responsável" e mantêm o estado. Os números do progresso não mudam. | PN07 |
| CL2 | Um Membro tenta eliminar uma tarefa. | A ação é recusada e a tarefa continua no projeto (ver US06). | PN05 |
| CL3 | Alguém tenta criar, editar, mudar o estado ou eliminar uma tarefa num projeto arquivado. | A ação é recusada. O projeto e as tarefas continuam visíveis para os membros, e o progresso continua a ser mostrado. | PN09 |
| CL4 | É desativada a conta de alguém que é responsável por tarefas. | A pessoa deixa de conseguir entrar. As tarefas mantêm-na como responsável, com a indicação "conta desativada". Essa conta deixa de poder ser escolhida como responsável. | PN08 |
| CL5 | O Gestor tenta remover-se a si próprio do projeto. | A ação é recusada, porque o projeto ficaria sem Gestor. | PN04 |
| CL6 | O Administrador tenta abrir um projeto onde não é membro. | O acesso é recusado (R10). | PN02 |
| CL7 | Um projeto tem tarefas, mas todas foram eliminadas. | O indicador passa a "Sem tarefas", como em US09. | PN13 |
| CL8 | É desativada a conta do Gestor de um projeto ativo. | **Não resolvido.** O projeto fica sem ninguém que possa gerir membros ou arquivá-lo. | PN14 |

## 4. Pressupostos de regras de negócio (PN01–PN14)

Todos são decisões nossas, **sem validação do cliente**.

| ID | Pressuposto | Usado em |
|---|---|---|
| PN01 | O papel (Gestor de projeto ou Membro) é atribuído pelo Administrador quando cria a conta. Só contas com papel Gestor podem criar projetos. | US02, US03 |
| PN02 | O Administrador gere contas, mas não é membro de nenhum projeto nem vê o seu conteúdo (concretiza R10). | US09, CL6 |
| PN03 | Cada projeto tem exatamente um Gestor, que é também membro do projeto: quem o criou. Num projeto onde só foi adicionada, uma conta com papel Gestor de projeto atua como Membro. | US03, US04 |
| PN04 | O Gestor não pode ser removido do seu próprio projeto. | CL5 |
| PN05 | Só o Gestor do projeto pode criar tarefas, escolher ou mudar o responsável e eliminar tarefas. Qualquer membro, incluindo o Gestor, pode editar o título e a descrição de uma tarefa e mudar o seu estado. | US06, US07, CL2 |
| PN06 | Cada tarefa tem no máximo um responsável, que tem de ser membro do projeto. A tarefa pode ficar "Sem responsável". | US06 |
| PN07 | Ao remover um membro, as suas tarefas nesse projeto passam a "Sem responsável". | CL1 |
| PN08 | Uma conta desativada continua visível como responsável das suas tarefas, com a indicação "conta desativada", mas não pode receber novas atribuições. | CL4 |
| PN09 | Um projeto arquivado fica só de leitura: tarefas, estados e membros não podem ser alterados. | US07, CL3 |
| PN10 | Uma tarefa nova começa sempre em "Por fazer". Qualquer estado pode passar a qualquer outro, incluindo reabrir uma tarefa concluída. | US06, US07 |
| PN11 | Cada conta é identificada por um endereço de email único. | US02 |
| PN12 | O título da tarefa é obrigatório; a descrição é opcional. | US06 |
| PN13 | A percentagem de conclusão é tarefas concluídas ÷ total de tarefas × 100, arredondada à unidade. Sem tarefas, mostra "Sem tarefas". | US09, CL7 |
| PN14 | **Questão em aberto:** o que acontece a um projeto cujo Gestor é desativado (CL8)? Proposta a validar: o Administrador passa a poder escolher um novo Gestor entre os membros, vendo apenas o nome do projeto e a lista de membros. | CL8 |
