/* Smoke test simples, sem dependencias externas de teste, so pra validar que a app sobe
   e responde no endpoint raiz. Nao faz parte da analise de seguranca (isso fica pro SAST/SCA/DAST). */
const http = require('http');

process.env.PORT = process.env.PORT || 3999;
const app = require('../src/app');

setTimeout(() => {
  http
    .get(`http://localhost:${process.env.PORT}/`, (res) => {
      if (res.statusCode === 200) {
        console.log('Smoke test OK: app respondeu 200 na rota raiz');
        process.exit(0);
      } else {
        console.error(`Smoke test FALHOU: status ${res.statusCode}`);
        process.exit(1);
      }
    })
    .on('error', (err) => {
      console.error('Smoke test FALHOU:', err.message);
      process.exit(1);
    });
}, 500);
