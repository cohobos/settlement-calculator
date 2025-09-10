const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 배경색 설정 (보라색)
  ctx.fillStyle = '#4f46e5';
  ctx.fillRect(0, 0, size, size);

  // 둥근 모서리 효과를 위한 클리핑
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.1);
  ctx.fill();

  // 다시 기본 합성 모드로 변경
  ctx.globalCompositeOperation = 'source-over';

  // 텍스트 설정
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.5}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 텍스트 그리기
  ctx.fillText('계', size / 2, size / 2);

  // PNG로 저장
  const buffer = canvas.toBuffer('image/png');
  const filepath = path.join(__dirname, 'public', filename);
  fs.writeFileSync(filepath, buffer);
  console.log(`Generated: ${filename} (${size}x${size})`);
}

// 아이콘들 생성
generateIcon(192, 'pwa-192x192.png');
generateIcon(512, 'pwa-512x512.png');
generateIcon(512, 'pwa-512x512-maskable.png');
generateIcon(180, 'apple-touch-icon.png');

console.log('All icons generated successfully!');
