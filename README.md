# GRA · Corridas

Só a aba de Corridas (lista + mapa com os percursos) do site GRA Cidade Alta.
Somente leitura, sem login e sem backend: os 139 percursos estão em `public/data/corridas.json`.

## Rodar local
    npm install
    npm run dev

## Publicar na Vercel
    npx vercel --prod
(ou suba esta pasta num repositório e importe na Vercel: preset Vite, build `npm run build`, saída `dist`.)
