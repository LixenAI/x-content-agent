// Stamps a brand's logo onto a generated image, bottom-right, on a soft white
// pill for contrast against any background. Runs entirely in-browser via
// canvas — no server dependency. Data-URL inputs (the normal case: Pollinations
// and Gemini both return base64 images, and uploaded logos are read as data
// URLs) never taint the canvas, so toDataURL() always succeeds for the
// common path; anything else falls back to the original image untouched.

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 60)}`));
    img.src = src;
  });
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function applyWatermark(imageUrl: string, logoUrl: string): Promise<string> {
  try {
    const [base, logo] = await Promise.all([loadImage(imageUrl), loadImage(logoUrl)]);
    const canvas = document.createElement('canvas');
    canvas.width = base.naturalWidth;
    canvas.height = base.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return imageUrl;

    ctx.drawImage(base, 0, 0, canvas.width, canvas.height);

    const margin = Math.round(canvas.width * 0.035);
    const logoW = Math.max(56, Math.round(canvas.width * 0.14));
    const logoH = Math.round(logoW * (logo.naturalHeight / logo.naturalWidth));
    const pad = Math.round(logoW * 0.16);
    const boxW = logoW + pad * 2;
    const boxH = logoH + pad * 2;
    const boxX = canvas.width - boxW - margin;
    const boxY = canvas.height - boxH - margin;
    const radius = Math.round(boxH * 0.22);

    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = '#ffffff';
    roundRectPath(ctx, boxX, boxY, boxW, boxH, radius);
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = 0.97;
    ctx.drawImage(logo, boxX + pad, boxY + pad, logoW, logoH);
    ctx.globalAlpha = 1;

    return canvas.toDataURL('image/png');
  } catch {
    return imageUrl;
  }
}
