# So Long – Web Edition (v3)

Port do projeto **so_long** da 42 Porto para browser, usando TypeScript + Vite + Canvas API.

## Stack
- **TypeScript** — lógica do jogo (tipada)
- **Canvas API** — rendering 2D, sem frameworks
- **Vite** — build + dev server com HMR

## Estrutura
```
src/
  types.ts       — interfaces, constantes, tipos
  assets.ts      — loader de sprites
  map.ts         — parser .ber, validação, flood-fill BFS
  game.ts        — movimento, inimigos, animações
  renderer.ts    — Canvas API, interpolação, HUD, overlays
  main.ts        — game loop, input, UI
public/assets/   — sprites PNG (96×96, convertidos de XPM)
public/maps/     — mapas .ber originais
```

## Desenvolvimento
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
# dist/ contém o jogo completo — abre dist/index.html no browser
```

## Deploy (Vercel)
1. Push para GitHub
2. Import no Vercel → Framework: **Vite** → Build: `npm run build` → Output: `dist`
3. Pronto — cross-platform, sem instalação

## Controlos
| Tecla | Ação |
|---|---|
| W / ↑ / Espaço | Mover para cima |
| S / ↓ | Mover para baixo |
| A / ← | Mover para a esquerda |
| D / → | Mover para a direita |
| Enter | Reiniciar (após vitória/derrota) |

## Mapas personalizados
Cole qualquer `.ber` válido no campo de texto da UI.
O parser valida: enclosure, chars válidos, 1 player, ≥1 coletável, 1 saída, solvabilidade.
