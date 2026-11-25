function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

export function drawScorecard(context, width, height, data) {
  context.save();
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#fff8e7');
  background.addColorStop(1, '#e8f1dc');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.fillStyle = '#234b3c';
  context.beginPath();
  context.arc(width - 65, 85, 170, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#f2cb67';
  context.font = '800 25px Nunito, "Microsoft YaHei", sans-serif';
  context.fillText('来拍！ BADMINTON CLUB', 72, 100);
  context.fillStyle = '#fff9e9';
  context.font = '900 61px Nunito, "Microsoft YaHei", sans-serif';
  context.fillText(data.champion ? '冠军到手！' : data.won ? '漂亮拿下！' : '下一场再赢！', 72, 205);

  context.fillStyle = '#244438';
  roundedRect(context, 58, 285, width - 116, 490, 32);
  context.fill();
  context.fillStyle = '#d9e7d1';
  context.font = '600 27px Nunito, "Microsoft YaHei", sans-serif';
  context.textAlign = 'center';
  context.fillText(data.event, width / 2, 345);
  context.textAlign = 'left';
  context.fillStyle = '#fff9e9';
  context.font = '800 42px Nunito, "Microsoft YaHei", sans-serif';
  context.fillText(data.player, 112, 465);
  context.textAlign = 'right';
  context.fillText(data.opponent, width - 112, 465);
  context.textAlign = 'center';
  context.fillStyle = '#f2cb67';
  context.font = '900 116px Nunito, "Microsoft YaHei", sans-serif';
  context.fillText(`${data.score[0]} : ${data.score[1]}`, width / 2, 615);
  context.fillStyle = '#d9e7d1';
  context.font = '600 25px Nunito, "Microsoft YaHei", sans-serif';
  context.fillText(`世界排名  #${data.rank}     ·     最快球速  ${data.speed} km/h`, width / 2, 710);

  context.fillStyle = '#fffdf4';
  roundedRect(context, 58, 825, width - 116, 236, 25);
  context.fill();
  context.textAlign = 'left';
  context.fillStyle = '#52735d';
  context.font = '800 24px Nunito, "Microsoft YaHei", sans-serif';
  context.fillText('本场高光', 92, 880);
  context.fillStyle = '#234b3c';
  context.font = '700 32px Nunito, "Microsoft YaHei", sans-serif';
  const highlight = data.highlight || (data.won ? '稳定发挥，把胜利收入囊中！' : '每一拍都是下一次进步。');
  const words = [...highlight];
  let line = '', lineY = 940;
  for (const character of words) {
    if (context.measureText(line + character).width > width - 188 && line) {
      context.fillText(line, 92, lineY);
      line = character;
      lineY += 48;
    } else line += character;
  }
  context.fillText(line, 92, lineY);

  context.textAlign = 'center';
  context.fillStyle = '#234b3c';
  context.font = '800 27px Nunito, "Microsoft YaHei", sans-serif';
  context.fillText(`制胜 ${data.winners} 球     ·     最长回合 ${data.rally} 拍`, width / 2, 1150);
  context.fillStyle = '#607464';
  context.font = '600 22px Nunito, "Microsoft YaHei", sans-serif';
  context.fillText('深圳天才高中生 · 林楠', width / 2, 1220);
  context.fillText('LZYYMQ · 羽境球场', width / 2, 1270);
  context.restore();
}

export async function createScorecardBlob(data) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  drawScorecard(canvas.getContext('2d'), canvas.width, canvas.height, data);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

export function drawPlayerCard(context, width, height, data) {
  context.save();
  context.fillStyle = '#fff7e4';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#234b3c';
  context.beginPath();
  context.roundRect(36, 36, width - 72, height - 72, 40);
  context.fill();
  context.fillStyle = '#f2cb67';
  context.font = '800 27px Nunito, "Microsoft YaHei", sans-serif';
  context.textAlign = 'center';
  context.fillText('LZYYMQ · PLAYER CARD', width / 2, 120);
  context.fillStyle = '#fff9e9';
  context.font = '900 68px Nunito, "Microsoft YaHei", sans-serif';
  context.fillText('林楠', width / 2, 245);
  context.fillStyle = '#d9e7d1';
  context.font = '700 31px Nunito, "Microsoft YaHei", sans-serif';
  context.fillText('深圳天才高中生', width / 2, 300);

  context.font = '128px "Segoe UI Emoji", sans-serif';
  context.fillText(data.emoji || '🏸', width / 2, 485);
  context.fillStyle = '#f2cb67';
  context.font = '800 38px Nunito, "Microsoft YaHei", sans-serif';
  context.fillText(data.costume, width / 2, 548);
  context.fillStyle = '#fff9e9';
  context.font = '700 100px Nunito, "Microsoft YaHei", sans-serif';
  context.fillText(`#${data.rank}`, width / 2, 735);
  context.fillStyle = '#d9e7d1';
  context.font = '700 26px Nunito, "Microsoft YaHei", sans-serif';
  context.fillText(`世界排名     ·     ${data.rating} 积分`, width / 2, 790);

  const blocks = [
    ['比赛胜利', `${data.wins} 场`],
    ['最长连胜', `${data.bestStreak} 场`],
    ['赛事冠军', `${data.titles} 座`],
  ];
  blocks.forEach(([label, value], index) => {
    const x = 86 + index * 304;
    context.fillStyle = '#fff9e9';
    context.beginPath();
    context.roundRect(x, 880, 276, 155, 20);
    context.fill();
    context.fillStyle = '#52735d';
    context.font = '700 22px Nunito, "Microsoft YaHei", sans-serif';
    context.fillText(label, x + 138, 928);
    context.fillStyle = '#234b3c';
    context.font = '900 35px Nunito, "Microsoft YaHei", sans-serif';
    context.fillText(value, x + 138, 991);
  });
  context.fillStyle = '#fff9e9';
  context.font = '700 24px Nunito, "Microsoft YaHei", sans-serif';
  context.fillText('来球尽管来，下一拍见！', width / 2, 1155);
  context.fillStyle = '#d9e7d1';
  context.font = '600 21px Nunito, "Microsoft YaHei", sans-serif';
  context.fillText('BADMINTON CLUB · 林楠', width / 2, 1220);
  context.restore();
}

export async function createPlayerCardBlob(data) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  drawPlayerCard(canvas.getContext('2d'), canvas.width, canvas.height, data);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}
