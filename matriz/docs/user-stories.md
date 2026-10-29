# User stories — Matriz

Backlog inicial do MVP: 14 user stories que cobrem **apenas as funcionalidades Must** (FN01–FN09, FN14, FN27, FN28), com critérios de aceitação, casos-limite e regras de negócio. As regras PN são **decisões internas (DE) ou pressupostos**, todas por validar com o cliente. Os termos "conta", "função", "Gestor", "Membro" e "Administrador" seguem o [glossário do README](../README.md#glossário).

## 1. User stories

| ID | User story | FN | MoSCoW |
|---|---|---|---|
| US01 | Como **utilizador**, quero entrar com a minha conta, para aceder apenas aos projetos onde participo. | FN01 | Must |
| US02 | Como **Administrador**, quero criar e desativar contas, para que só pessoas da empresa usem a Matriz. | FN02 | Must |
| US03 | Como **Administrador**, quero criar projetos e atribuir-lhes um Gestor, para que cada projeto tenha um responsável pela sua organização. | FN03 | Must |
| US04 | Como **Gestor** de um projeto, quero adicionar e remover membros, para formar a equipa que nele trabalha e o vê. | FN04 | Must |
| US05 | Como **utilizador**, quero ver a lista dos projetos onde participo, para encontrar o meu trabalho. | FN05 | Must |
| US06 | Como **Gestor** de um projeto, quero criar, editar e eliminar tarefas e atribuir-lhes um responsável, para que se saiba o que há a fazer e quem o faz. | FN06 | Must |
| US07 | Como **membro** de um projeto (Gestor ou Membro), quero mudar o estado de uma tarefa, para mostrar em que ponto está o trabalho. | FN07 | Must |
| US08 | Como **membro** de um projeto, quero ver as tarefas agrupadas por estado, para perceber o que está por fazer, em curso e concluído. | FN08 | Must |
| US09 | Como **membro** de um projeto, quero ver um indicador de progresso, para saber quanto do trabalho está concluído. | FN09 | Must |
| US10 | Como **Gestor** de um projeto, quero editar e arquivar o projeto, para manter a sua informação correta e fechá-lo quando termina. | FN03 | Must |
| US11 | Como **Administrador**, quero dar e retirar a permissão de Administrador, para partilhar a gestão das contas. | FN02 | Must |
| US12 | Como **Administrador**, quero trocar o Gestor de um projeto, para que o projeto não fique sem gestão quando o Gestor sai. | FN27 | Must |
| US13 | Como **membro** de um projeto, quero comentar tarefas e editar ou apagar os meus comentários, para partilhar informação sobre o trabalho. | FN14 | Must |
| US14 | Como **Administrador**, quero consultar o registo das ações administrativas, para saber quem fez o quê e quando. | FN28 | Must |

### Rastreabilidade FN → US

| FN | User stories |
|---|---|
| FN01 | US01 |
| FN02 | US02, US11 |
| FN03 | US03, US10 |
| FN04 | US04 |
| FN05 | US05 |
| FN06 | US06 |
| FN07 | US07 |
| FN08 | US08 |
| FN09 | US09 |
| FN14 | US13 |
| FN27 | US12 |
| FN28 | US14 |

## 2. Critérios de aceitação

Doze stories têm critérios em Dado / Quando / Então, cada uma com o caminho normal e pelo menos um caso de erro. US05 e US08 ainda não têm critérios definidos.

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

### US02: Criar e desativar contas (FN02)

**Caminho normal: criar**

- **Dado** que sou Administrador,
- **Quando** crio uma conta com nome e endereço de email,
- **Então** a conta aparece na lista de contas com o estado "Ativa", sem permissão de Administrador e sem projetos, e a ação fica no registo (US14).

**Caminho normal: desativar**

- **Dado** que existe uma conta ativa que não é a conta de sistema,
- **Quando** a desativo,
- **Então** o seu estado passa a "Desativada", essa pessoa deixa de conseguir entrar (US01) e a ação fica no registo (US14).

**Erro: email repetido**

- **Dado** que já existe uma conta, ativa ou desativada, com o email "ana@empresa.pt",
- **Quando** tento criar outra conta com o mesmo email,
- **Então** a conta não é criada e vejo uma mensagem a indicar que o email já está em uso.

**Erro: sem permissão**

- **Dado** que a minha conta não tem permissão de Administrador,
- **Quando** tento criar ou desativar uma conta,
- **Então** a ação é recusada e a lista de contas não muda.

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

**Erro: conta desativada**

- **Dado** que a conta do Rui está desativada,
- **Quando** tento adicionar o Rui ao projeto,
- **Então** a ação é recusada e o Rui não aparece na lista de membros.

**Erro: projeto arquivado**

- **Dado** que sou Gestor do projeto "Site" e o projeto está arquivado,
- **Quando** tento adicionar ou remover um membro,
- **Então** a ação é recusada e a lista de membros não muda.

### US06: Criar, editar, eliminar e atribuir tarefas (FN06)

**Caminho normal: criar**

- **Dado** que sou Gestor de um projeto ativo,
- **Quando** crio uma tarefa com título "Rever textos" e escolho a Ana, que é membro do projeto, como responsável,
- **Então** a tarefa aparece no projeto com esse título, a Ana como responsável e o estado "Por fazer".

**Caminho normal: sem responsável**

- **Dado** que sou Gestor de um projeto ativo,
- **Quando** crio uma tarefa sem escolher responsável,
- **Então** a tarefa é criada e mostra "Sem responsável".

**Caminho normal: editar**

- **Dado** que sou Gestor de um projeto ativo e existe a tarefa "Rever textos",
- **Quando** altero o título para "Rever textos da página inicial",
- **Então** a tarefa mostra o novo título e mantém o responsável e o estado.

**Caminho normal: eliminar**

- **Dado** que sou Gestor de um projeto ativo com 4 tarefas, uma delas "Rever textos",
- **Quando** elimino a tarefa "Rever textos",
- **Então** a tarefa deixa de aparecer no projeto e o indicador de progresso (US09) passa a contar 3 tarefas.

**Erro: título vazio**

- **Dado** que sou Gestor e estou a criar uma tarefa,
- **Quando** deixo o título vazio e confirmo,
- **Então** a tarefa não é criada e vejo uma mensagem a indicar que o título é obrigatório.

**Erro: responsável fora do projeto (criar)**

- **Dado** que sou Gestor e o Rui não é membro do projeto,
- **Quando** crio uma tarefa,
- **Então** o Rui não aparece entre as pessoas que posso escolher como responsável.

**Erro: responsável fora do projeto (editar)**

- **Dado** que a tarefa "Rever textos" tem a Ana como responsável e o Rui não é membro do projeto,
- **Quando** tento mudar o responsável para o Rui,
- **Então** a alteração é recusada e a Ana continua a ser a responsável.

**Erro: Membro tenta criar, editar ou eliminar**

- **Dado** que sou Membro, mas não Gestor, de um projeto ativo,
- **Quando** tento criar uma tarefa, alterar o título, a descrição ou o responsável de uma tarefa, ou eliminá-la,
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

**Erro: projeto arquivado**

- **Dado** que o projeto está arquivado,
- **Quando** tento mudar o estado de uma tarefa,
- **Então** a ação é recusada e a tarefa não muda.

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

## 3. Casos-limite

Dez dos doze casos têm comportamento definido; CL10 e CL11 ficam em aberto.

| ID | Situação | Comportamento esperado | Regra |
|---|---|---|---|
| CL1 | O Gestor remove um membro que é responsável por tarefas. | A remoção acontece. Todas as tarefas dessa pessoa nesse projeto passam a "Sem responsável" e mantêm o estado. Os números do progresso não mudam. | PN07 |
| CL2 | Um Membro tenta eliminar uma tarefa. | A ação é recusada e a tarefa continua no projeto (ver US06). | PN05 |
| CL3 | Alguém tenta criar, editar, mudar o estado, eliminar ou comentar uma tarefa, editar ou apagar um comentário, ou mudar os membros, num projeto arquivado. | A ação é recusada. O projeto, as tarefas e os comentários continuam visíveis para os membros, e o progresso continua a ser mostrado. | PN09 |
| CL4 | É desativada a conta de alguém que é responsável por tarefas. | A pessoa deixa de conseguir entrar. As tarefas mantêm-na como responsável, com a indicação "conta desativada". Essa conta deixa de poder ser escolhida como responsável. | PN08 |
| CL5 | O Gestor tenta remover-se a si próprio do projeto. | A ação é recusada. O Gestor só deixa de o ser quando o Administrador o troca (US12). | PN04 |
| CL6 | Uma conta com permissão de Administrador tenta abrir um projeto onde não participa. | O acesso às tarefas, aos comentários e ao progresso é recusado. Na área de administração vê só o nome, o estado, o Gestor e os membros do projeto. | PN02 |
| CL7 | Um projeto teve tarefas e todas foram eliminadas. | O indicador passa a "Sem tarefas", como em US09. | PN13 |
| CL8 | É desativada a conta do Gestor de um projeto ativo. | Os membros continuam a mudar estados e a comentar. Ninguém pode criar tarefas, gerir membros ou arquivar o projeto até o Administrador nomear um novo Gestor (US12). | PN14 |
| CL9 | Alguém tenta desativar a conta de sistema ou retirar-lhe a permissão de Administrador. | A ação é recusada. Como a conta de sistema é sempre um Administrador ativo, nunca se fica sem Administrador. | PN16 |
| CL10 | O Administrador nomeia-se a si próprio Gestor de um projeto onde não participa (US12). | **Não resolvido.** Se for permitido, passa a ver o conteúdo do projeto, o que contorna R10. | PN14 |
| CL11 | Uma pessoa cuja conta foi desativada volta à empresa. | **Não resolvido.** A conta não pode ser reativada (PN17) e o email único (PN11) impede criar outra conta com o mesmo email. | PN11, PN17 |
| CL12 | O autor de comentários é removido do projeto ou a sua conta é desativada. | Os comentários mantêm-se, com o nome do autor e, se for o caso, a indicação "conta desativada". | PN15 |

## 4. Regras de negócio (PN01–PN18)

Nenhuma regra foi validada pelo cliente. A coluna "Origem" indica se a regra concretiza uma decisão interna (DE) ou é um pressuposto nosso.

| ID | Regra | Origem | Usado em |
|---|---|---|---|
| PN01 | Uma conta não tem papel próprio. Em cada projeto onde participa, é Gestor ou Membro; a mesma conta pode ter funções diferentes em projetos diferentes. | DE01 | US01, US05 |
| PN02 | A permissão de Administrador pertence à conta e acumula com funções em projetos. Não dá acesso a tarefas, comentários ou progresso de projetos onde a conta não participa. Na área de administração, o Administrador vê de cada projeto só o nome, o estado, o Gestor e os membros, para poder trocar o Gestor. | DE02; a área de administração é pressuposto | US01, US09, CL6 |
| PN03 | Cada projeto tem exatamente um Gestor, que é também membro do projeto. É atribuído pelo Administrador quando cria o projeto. | DE06 | US03, US04 |
| PN04 | O Gestor não pode ser removido do projeto nem remover-se. Só deixa de ser Gestor quando o Administrador o troca; passa então a Membro. | DE08; "passa a Membro" é pressuposto | US12, CL5 |
| PN05 | Só o Gestor cria tarefas, edita o título e a descrição, escolhe ou muda o responsável e elimina tarefas. Qualquer membro, incluindo o Gestor, pode mudar o estado e comentar. | DE09, DE10 | US06, US07, US13, CL2 |
| PN06 | Cada tarefa tem no máximo um responsável, que tem de ser membro do projeto. A tarefa pode ficar "Sem responsável". | DE09 | US06 |
| PN07 | Ao remover um membro, as suas tarefas nesse projeto passam a "Sem responsável". | Pressuposto | CL1 |
| PN08 | Uma conta desativada continua visível como responsável das suas tarefas, com a indicação "conta desativada", mas não pode receber novas atribuições. | Pressuposto | CL4 |
| PN09 | Um projeto arquivado fica só de leitura: tarefas, estados, membros e comentários não podem ser alterados. | DE11; resto é pressuposto | US04, US07, US13, CL3 |
| PN10 | Uma tarefa nova começa sempre em "Por fazer". Qualquer estado pode passar a qualquer outro, incluindo reabrir uma tarefa concluída. | Pressuposto | US06, US07 |
| PN11 | Cada conta é identificada por um endereço de email único, incluindo as contas desativadas. | Pressuposto | US02, CL11 |
| PN12 | O nome do projeto e o título da tarefa são obrigatórios; as descrições são opcionais. | Pressuposto | US03, US06 |
| PN13 | A percentagem de conclusão é tarefas concluídas ÷ total de tarefas × 100, arredondada à unidade. Sem tarefas, mostra "Sem tarefas". | Pressuposto | US09, CL7 |
| PN14 | O Administrador pode trocar o Gestor de um projeto. O novo Gestor tem de ser membro do projeto com conta ativa. Se não houver membro adequado, o Administrador pode adicionar uma conta ativa à equipa e nomeá-la Gestor. **Em aberto:** se o Administrador se pode nomear a si próprio (CL10). | DE08 | US12, CL8, CL10 |
| PN15 | Qualquer membro do projeto pode comentar tarefas. Só o autor pode editar ou apagar os seus comentários. Os comentários mantêm-se quando o autor sai do projeto ou a conta é desativada. Um comentário não pode estar vazio. | DE11; autoria, permanência e "não vazio" são pressupostos | US13, CL12 |
| PN16 | A conta de sistema (primeira conta de Administrador) não pode ser desativada nem perder a permissão de Administrador. Não é possível retirar a permissão nem desativar o último Administrador ativo. | DE04, DE05 | US02, US11, CL9 |
| PN17 | Uma conta desativada não pode ser reativada. | DE03 | US02, CL11 |
| PN18 | O registo de ações administrativas guarda: criar e desativar contas, dar e retirar a permissão de Administrador, criar projetos, atribuir e trocar o Gestor e adicionar membros pelo Administrador. Cada entrada tem autor, ação, alvo, data e hora. Só os Administradores o consultam e ninguém o pode alterar ou apagar. | DE12; conteúdo e acesso são pressupostos | US14 |
