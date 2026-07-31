// Stamps a brand's logo onto a generated image, bottom-right, with no plate
// behind it — the logo's own transparency is preserved so it reads as part of
// the image rather than a pasted-on sticker. A soft shadow keeps the mark from
// dissolving into busy or same-tone backgrounds. Runs entirely in-browser via
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

// Mean perceptual luminance of the area the logo will cover, sampled from the
// already-drawn base image. Every pixel is read once at watermark time, so the
// cost is negligible next to decoding the image itself.
function isRegionDark(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): boolean {
  try {
    const { data } = ctx.getImageData(x, y, w, h);
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      total += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    return total / (data.length / 4) < 128;
  } catch {
    return false; // getImageData throws on a tainted canvas; assume light.
  }
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

    const margin = Math.round(canvas.width * 0.045);
    const logoW = Math.max(56, Math.round(canvas.width * 0.13));
    const logoH = Math.round(logoW * (logo.naturalHeight / logo.naturalWidth));
    const logoX = canvas.width - logoW - margin;
    const logoY = canvas.height - logoH - margin;

    ctx.save();
    // Diffuse shadow rather than a solid plate: lifts the mark off the
    // background without boxing it in. A dark shadow is invisible against a
    // dark background, so pick the shadow tone from what's actually behind
    // the logo — the mark's own colours stay untouched either way.
    ctx.shadowColor = isRegionDark(ctx, logoX, logoY, logoW, logoH)
      ? 'rgba(255, 255, 255, 0.45)'
      : 'rgba(0, 0, 0, 0.30)';
    ctx.shadowBlur = Math.round(logoW * 0.10);
    ctx.globalAlpha = 0.95;
    ctx.drawImage(logo, logoX, logoY, logoW, logoH);
    ctx.restore();

    // JPEG, not PNG: the canvas is a fully-opaque photo composite (no
    // transparency to preserve), and PNG's lossless encoding of photographic
    // content runs 5-10x larger — enough to trip the server's JSON body
    // limit on saves.
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return imageUrl;
  }
}
