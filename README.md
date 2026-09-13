# DevSecOps Scan — Pipeline de Segurança Automatizada no CI/CD

## 1. Sobre o projeto

Este repositório demonstra a integração de **análise de segurança automatizada** dentro do processo de desenvolvimento, aplicando os conceitos de **DevSecOps** e **Shift Left**.

O "produto" em si é propositalmente simples: uma pequena **API web em Node.js/Express** (`devsecops-scan-demo`) com um CRUD de notas em memória e um endpoint de calculadora. A aplicação **não é o foco da atividade** — ela existe apenas como alvo real para a pipeline de segurança rodar em cima.

Para tornar a demonstração honesta (em vez de mostrar só uma pipeline "verde" sem sentido), o código contém **3 vulnerabilidades propositais**, uma para cada tipo de análise pedida na atividade:

| # | Vulnerabilidade | Onde | Tipo de análise que encontra |
|---|---|---|---|
| 1 | `eval()` sobre entrada do usuário (execução remota de código) | `src/app.js`, rota `POST /api/calc` | SAST (Semgrep) |
| 2 | Segredo/API key hardcoded no código-fonte | `src/app.js`, constante `JWT_SECRET` | SAST (Semgrep — regras de secrets) |
| 3 | Dependência desatualizada e vulnerável (`lodash@4.17.15`, com CVEs de prototype pollution / command injection) | `package.json` | SCA (npm audit) |

Além disso, a aplicação não usa nenhum middleware de headers de segurança (tipo `helmet`), então o **DAST (OWASP ZAP)** encontra alertas de runtime como headers de segurança ausentes (`X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, etc).

## 2. Estrutura do repositório

```
devsecops-scan/
├── src/
│   ├── app.js              # servidor Express + rota vulnerável /api/calc
│   └── routes/
│       └── notes.js        # CRUD de notas em memória (usa lodash)
├── tests/
│   └── smoke-test.js       # teste simples de fumaça (app sobe e responde)
├── package.json
├── package-lock.json
├── .github/
│   └── workflows/
│       └── security.yml    # pipeline de segurança (SAST + SCA + DAST)
├── .gitignore
└── README.md
```

## 3. Ferramentas utilizadas

| Ferramenta | Tipo de análise | O que verifica |
|---|---|---|
| **Semgrep** (`p/security-audit`, `p/secrets`, `p/owasp-top-ten`) | **SAST** | Padrões de código inseguro no código-fonte (eval, injeção, segredos hardcoded, OWASP Top 10) |
| **npm audit** | **SCA** | Vulnerabilidades conhecidas (CVEs) nas dependências do `package.json`/`package-lock.json` |
| **OWASP ZAP** (Baseline Scan) | **DAST** | Ataca a aplicação em execução, como um usuário externo, procurando falhas em runtime (headers, cookies, exposição de informação) |

Nenhuma dessas ferramentas exige conta paga ou chave de API — todas rodam de forma 100% automatizada dentro do próprio GitHub Actions.

## 4. Funcionamento da pipeline

**O que dispara a pipeline?**
Todo `push` ou `pull request` direcionado à branch `main` (também dá pra rodar manualmente via `workflow_dispatch`).

**Em qual etapa ocorre a análise?**
A pipeline (`.github/workflows/security.yml`) tem 4 jobs, nessa ordem lógica:

```
Push / Pull Request
        ↓
   ┌─────────┐
   │  SAST   │  Semgrep analisa o código-fonte
   └────┬────┘
        ↓
   ┌─────────┐
   │  SCA    │  npm audit analisa as dependências
   └────┬────┘
        ↓
   ┌─────────┐
   │  DAST   │  OWASP ZAP ataca a aplicação em execução
   └────┬────┘
        ↓
   ┌─────────────┐
   │  Resultado  │  Job final consolida os 3 resultados
   └──────┬──────┘
          ↓
     PASS / FAIL
```

(SAST e SCA rodam em paralelo na prática, já que não dependem um do outro; o job de DAST espera os dois `needs: [sast, sca]`, e o job de `resultado` espera todos.)

**O que acontece quando são encontrados problemas?**
- O Semgrep (`--error`) faz o job de SAST falhar quando encontra findings nas severidades configuradas.
- O `npm audit --audit-level=moderate` faz o job de SCA falhar quando existe dependência vulnerável em nível moderado ou acima.
- A action do OWASP ZAP faz o job de DAST falhar quando encontra alertas de risco.
- O job final `resultado` verifica o status dos três jobs anteriores: se qualquer um deles não tiver sido bem-sucedido, ele falha explicitamente com uma mensagem `❌ FAIL`, encerrando a pipeline com status vermelho no GitHub. Se os três passarem, ele imprime `✅ PASS`.

Isso é o **Shift Left** na prática: a vulnerabilidade é barrada *antes* do merge/deploy, e não descoberta depois, em produção.

## 5. Resultados / Evidências

> Esta seção deve ser preenchida com prints reais depois que a pipeline rodar no GitHub Actions do repositório (veja a seção 7 - "Como gerar as evidências").

- **Execução da pipeline:** _(print da aba Actions mostrando os 4 jobs rodando)_
- **SAST (Semgrep):** _(print do log/artefato `semgrep-results.json` mostrando os findings do `eval()` e do segredo hardcoded)_
- **SCA (npm audit):** _(print do log mostrando a vulnerabilidade encontrada em `lodash@4.17.15`)_
- **DAST (OWASP ZAP):** _(print do relatório do ZAP com os alertas de headers de segurança ausentes)_
- **Resultado final:** _(print do job "Resultado Final" mostrando FAIL antes da correção e PASS depois de corrigir)_

### Achados esperados (validados localmente antes do push)

Rodando localmente durante o desenvolvimento, antes de qualquer correção:

```
$ npm audit
lodash  <=4.17.23
Severity: high
Command Injection in lodash - GHSA-35jh-r3h4-6jhm
Prototype Pollution in lodash - GHSA-p6mc-m468-83gw
...
3 vulnerabilities (2 moderate, 1 high)
```

```
$ semgrep scan --config p/security-audit ...
src/app.js
  ❯❯❱ eval-detected
      Uso de eval() detectado - risco de execução remota de código (RCE)
      31┆ const result = eval(expression);
```

### Como corrigir (para ver a pipeline passar de FAIL para PASS)

1. **SAST** — trocar o `eval(expression)` por uma lib seguraaa de avaliação matemática (ex: `mathjs`) ou uma whitelist de operações; mover `JWT_SECRET` para uma variável de ambiente (`process.env.JWT_SECRET`) em vez de deixar hardcoded.
2. **SCA** — atualizar o lodash: `npm install lodash@^4.17.21` (ou versão mais recente) e rodar `npm audit fix`.
3. **DAST** — adicionar o middleware [`helmet`](https://www.npmjs.com/package/helmet) (`app.use(helmet())`) para que a aplicação passe a enviar os headers de segurança que o ZAP cobrou.

Depois de corrigir e dar `push` de novo, a mesma pipeline deve rodar e fechar como `✅ PASS`.

## 6. Como rodar localmente

```bash
npm install
npm start          # sobe em http://localhost:3000
npm audit          # roda a SCA localmente
```

Para rodar o Semgrep localmente (opcional, requer Python):
```bash
pip install semgrep
semgrep scan --config p/security-audit --config p/secrets --config p/owasp-top-ten .
```

## 7. Como gerar as evidências (passo a passo)

1. Faça o `push` deste repositório para o GitHub.
2. Abra a aba **Actions** do repositório — a pipeline "Security Pipeline (DevSecOps)" deve iniciar automaticamente.
3. Tire um print da lista de jobs (SAST, SCA, DAST, Resultado) rodando/concluídos.
4. Entre no job **SAST - Semgrep** e tire um print do log mostrando os findings.
5. Entre no job **SCA - npm audit** e tire um print do log mostrando a vulnerabilidade do lodash.
6. Entre no job **DAST - OWASP ZAP** e tire um print do relatório gerado pela action (ou do log de alertas).
7. Aplique as correções da seção 5 acima, dê outro `push`, e tire um print do job **Resultado Final** mostrando `✅ PASS`.
8. Cole os prints nesta seção do README (substituindo os placeholders acima).

## 8. Conclusão

Esta implementação aplica **DevSecOps** ao incorporar segurança como parte automática do fluxo de entrega, e não como uma etapa manual separada executada só antes do deploy (ou pior, só depois de um incidente). As três camadas de análise (SAST, SCA, DAST) cobrem, respectivamente, o código-fonte, as dependências de terceiros e o comportamento da aplicação em execução — o que dá uma cobertura bem mais completa do que qualquer uma delas isoladamente.

O princípio de **Shift Left** aparece no fato de a análise rodar **a cada push/PR**, direto na pipeline, antes do código chegar à branch principal — ou seja, o desenvolvedor recebe o feedback de segurança em minutos, no mesmo lugar onde já recebe o feedback de build/testes, em vez de esse problema ser descoberto (e custar muito mais caro para corrigir) só depois de já estar em produção.
