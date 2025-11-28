export function pickExtFromMime(mime: string): string | null {
    if (!mime) return null;
    if (mime.includes('jpeg')) return 'jpg';
    if (mime.includes('png')) return 'png';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('avif')) return 'avif';
    return null;
}

export async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
    try {
        return await createImageBitmap(file);
    } catch {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }
}

export async function renderToSquare(
    source: ImageBitmap | HTMLImageElement,
    w: number,
    h: number,
    mime: string,
    q: number
): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const hRatio = canvas.width / source.width;
    const vRatio = canvas.height / source.height;
    const ratio = Math.max(hRatio, vRatio);
    const dx = (canvas.width - source.width * ratio) / 2;
    const dy = (canvas.height - source.height * ratio) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
        source,
        0, 0, source.width, source.height,
        dx, dy, source.width * ratio, source.height * ratio
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas toBlob failed'));
            },
            mime,
            q
        );
    });
}
