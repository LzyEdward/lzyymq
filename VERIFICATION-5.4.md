# 羽境 5.4 验证记录

回归验证：

- `npm test`：通过，覆盖 1–6 球路、E 吊球、K 高远球、击球动作差异、落点与短发球轨迹。
- `node --check game.js`、`node --check build.mjs`：通过。
- `npm run build`：通过，更新便携版 `dist/`。
- 比赛默认仍由 CSS 隐藏操作面板，只留比分；H 展开时显示四个常用动作按钮。
