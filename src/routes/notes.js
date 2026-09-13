const express = require('express');
// ⚠️ VULNERABILIDADE PROPOSITAL (3): dependência desatualizada e vulnerável.
// lodash 4.17.15 possui CVEs conhecidos (ex: CVE-2020-8203 - prototype pollution).
// Objetivo didático: mostrar o SCA (npm audit) encontrando essa dependência vulnerável.
// Correção recomendada: atualizar para "^4.17.21" (ou versão mais recente sem CVEs abertos).
const _ = require('lodash');

const router = express.Router();

let notes = [];
let nextId = 1;

router.get('/', (req, res) => {
  res.json(notes);
});

router.get('/:id', (req, res) => {
  const note = notes.find((n) => n.id === Number(req.params.id));
  if (!note) return res.status(404).json({ error: 'Nota nao encontrada' });
  return res.json(note);
});

router.post('/', (req, res) => {
  const { title, content } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Titulo e obrigatorio' });
  const note = { id: nextId++, title, content: content || '' };
  notes.push(note);
  return res.status(201).json(note);
});

router.put('/:id', (req, res) => {
  const note = notes.find((n) => n.id === Number(req.params.id));
  if (!note) return res.status(404).json({ error: 'Nota nao encontrada' });
  _.merge(note, req.body || {});
  return res.json(note);
});

router.delete('/:id', (req, res) => {
  const idx = notes.findIndex((n) => n.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Nota nao encontrada' });
  notes.splice(idx, 1);
  return res.status(204).send();
});

module.exports = router;
