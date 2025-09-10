const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 배경 그라데이션 설정 (파란색 계열)
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, '#3B82F6');
  gradient.addColorStop(1, '#1E40AF');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // 둥근 모서리 효과를 위한 클리핑
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.15);
  ctx.fill();

  // 다시 기본 합성 모드로 변경
  ctx.globalCompositeOperation = 'source-over';

  // 집 아이콘 그리기
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.02;
  
  // 집 지붕
  ctx.beginPath();
  ctx.moveTo(size * 0.3, size * 0.45);
  ctx.lineTo(size * 0.5, size * 0.25);
  ctx.lineTo(size * 0.7, size * 0.45);
  ctx.closePath();
  ctx.fill();
  
  // 집 몸체
  ctx.fillRect(size * 0.35, size * 0.45, size * 0.3, size * 0.3);
  
  // 문
  ctx.fillStyle = '#1E40AF';
  ctx.fillRect(size * 0.45, size * 0.6, size * 0.1, size * 0.15);
  
  // 창문
  ctx.fillRect(size * 0.37, size * 0.5, size * 0.06, size * 0.06);
  ctx.fillRect(size * 0.57, size * 0.5, size * 0.06, size * 0.06);

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
