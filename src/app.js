const express = require('express');
const notesRouter = require('./routes/notes');

const app = express();
const PORT = process.env.PORT || 3000;

// ⚠️ VULNERABILIDADE PROPOSITAL (1): segredo/credencial hardcoded no código-fonte.
// Objetivo didático: mostrar o SAST/scanner de segredos encontrando isso antes do merge.
// Correção recomendada: mover para variável de ambiente / secret manager (ex: process.env.JWT_SECRET).
const JWT_SECRET = 'hardcoded-jwt-secret-trocar-para-env-var-987654321';
app.use(express.json());

app.get('/', (req, res) => {
  res.send(
    '<h1>DevSecOps Demo App</h1>' +
      '<p>API simples de notas usada como alvo da pipeline de seguranca (SAST, SCA, DAST).</p>' +
      '<p>Rotas: GET/POST /api/notes, GET/PUT/DELETE /api/notes/:id, POST /api/calc</p>'
  );
});

app.use('/api/notes', notesRouter);

// ⚠️ VULNERABILIDADE PROPOSITAL (2): uso de eval() sobre entrada do usuário (RCE).
// Objetivo didático: mostrar o SAST (Semgrep) encontrando um "eval-detected"/injection.
// Correção recomendada: remover o eval e usar uma lib seguraaa de avaliação matemática (ex: mathjs)
// ou uma whitelist de operações permitidas.
app.post('/api/calc', (req, res) => {
  const { expression } = req.body || {};
  try {
    const result = eval(expression);
    res.json({ result });
  } catch (err) {
    res.status(400).json({ error: 'Expressao invalida' });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`App rodando em http://localhost:${PORT}`);
});

module.exports = app;
