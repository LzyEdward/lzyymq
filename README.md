# LZYYMQ · 羽境 FEATHER COURT 6.3

离线第一人称 3D 羽毛球游戏，页面品牌名为 LZYYMQ。Three.js 与场景资源随包提供，不依赖 CDN。

## 七种快捷球路

- `1` 智能回球
- `2` 高远球
- `3` 吊球
- `4` 杀球
- `5` 网前搓球
- `6` 推后场
- `7` 勾对角

鼠标左键始终智能接球，右键始终杀球；空格跳跃，WASD 移动。暂停后鼠标归还页面。首页点击林丹、李宗伟、谌龙或陶菲克模式即可直接套用对应的玩家属性。

## 本地运行

```powershell
npm install
npm run build
$env:PORT=5180; node dist/server.mjs
```

默认只监听本机。若要让同一局域网访问，可在明确需要时运行 `$env:HOST='0.0.0.0'; $env:PORT=5180; node dist/server.mjs`，再用主机局域网地址访问。要发布到互联网域名（例如 `lzyymq`），还需要一个托管平台/服务器和域名 DNS 配置。
