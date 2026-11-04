/**
 * Utilitaires professionnels pour le traitement, la compression et la normalisation des photographies.
 * Garantit que les images téléversées respectent les quotas de stockage, ont des types MIME valides
 * pour Supabase Storage et persistent de manière pérenne sans dépendre d'URLs temporaires blob:.
 */

export interface OptimizedImageResult {
  file: File;
  blob: Blob;
  dataUrl: string;
  filename: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'image/heic' | 'image/avif';
  sizeBytes: number;
  width: number;
  height: number;
}

/**
 * Normalise strictement le type MIME pour être 100% accepté par Supabase Storage
 * (qui rejette image/jpg ou application/octet-stream avec une erreur 415 InvalidMimeType).
 */
export function normalizeMimeType(
  filename = 'photo.jpg',
  rawMime?: string
): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'image/heic' | 'image/avif' {
  const mime = (rawMime || '').toLowerCase().trim();
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (mime === 'image/png' || ext === 'png') return 'image/png';
  if (mime === 'image/webp' || ext === 'webp') return 'image/webp';
  if (mime === 'image/gif' || ext === 'gif') return 'image/gif';
  if (mime === 'image/heic' || ext === 'heic' || ext === 'heif') return 'image/heic';
  if (mime === 'image/avif' || ext === 'avif') return 'image/avif';

  // Par défaut absolu pour tout JPEG, JPG, JFIF, PJPEG ou format inconnu
  return 'image/jpeg';
}

/**
 * Convertit un File ou Blob en chaîne DataURL base64 de manière asynchrone
 */
export function fileToDataUrl(fileOrBlob: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Compresse et optimise une photographie avant son enregistrement.
 * Réduit les photos d'appareils photo/smartphones (souvent 8-15 Mo) à ~100-250 Ko
 * tout en maintenant une netteté professionnelle (max 1600x1600).
 */
export async function optimizeImageFile(
  fileOrBlob: File | Blob,
  customFilename?: string,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.85
): Promise<OptimizedImageResult> {
  const originalName = customFilename || (fileOrBlob instanceof File ? fileOrBlob.name : 'photo.jpg');
  const targetMime = normalizeMimeType(originalName, fileOrBlob.type);

  // Si nous ne sommes pas dans un navigateur avec support Canvas, renvoyer un fallback sécurisé
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const dataUrl = await fileToDataUrl(fileOrBlob);
    const file = fileOrBlob instanceof File
      ? fileOrBlob
      : new File([fileOrBlob], originalName, { type: targetMime });
    return {
      file,
      blob: fileOrBlob,
      dataUrl,
      filename: originalName,
      mimeType: targetMime,
      sizeBytes: fileOrBlob.size,
      width: 800,
      height: 600,
    };
  }

  // Lecture et chargement de l'image dans un élément Image
  const dataUrl = await fileToDataUrl(fileOrBlob);

  return new Promise<OptimizedImageResult>((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calcul des dimensions proportionnelles
      if (width > maxWidth || height > maxHeight) {
        if (width / maxWidth > height / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          maxHeight = height;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback sans canvas
        const file = fileOrBlob instanceof File
          ? fileOrBlob
          : new File([fileOrBlob], originalName, { type: targetMime });
        resolve({
          file,
          blob: fileOrBlob,
          dataUrl,
          filename: originalName,
          mimeType: targetMime,
          sizeBytes: fileOrBlob.size,
          width: img.width,
          height: img.height,
        });
        return;
      }

      // Rendu haute qualité
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fond blanc pour les JPEG (évite les fonds noirs sur transparences converties)
      if (targetMime === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Génération de la DataURL compressée
      const optimizedDataUrl = canvas.toDataURL(targetMime, quality);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            const file = fileOrBlob instanceof File
              ? fileOrBlob
              : new File([fileOrBlob], originalName, { type: targetMime });
            resolve({
              file,
              blob: fileOrBlob,
              dataUrl: optimizedDataUrl,
              filename: originalName,
              mimeType: targetMime,
              sizeBytes: fileOrBlob.size,
              width,
              height,
            });
            return;
          }

          // Nettoyer l'extension pour correspondre au type MIME réel
          let cleanName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
          if (targetMime === 'image/jpeg' && !cleanName.match(/\.(jpe?g)$/i)) {
            cleanName = cleanName.replace(/\.[a-zA-Z0-9]+$/, '') + '.jpg';
          }

          const optimizedFile = new File([blob], cleanName, { type: targetMime });

          resolve({
            file: optimizedFile,
            blob,
            dataUrl: optimizedDataUrl,
            filename: cleanName,
            mimeType: targetMime,
            sizeBytes: blob.size,
            width,
            height,
          });
        },
        targetMime,
        quality
      );
    };

    img.onerror = () => {
      // En cas d'erreur de rendu, fallback sur le fichier d'origine
      const file = fileOrBlob instanceof File
        ? fileOrBlob
        : new File([fileOrBlob], originalName, { type: targetMime });
      resolve({
        file,
        blob: fileOrBlob,
        dataUrl,
        filename: originalName,
        mimeType: targetMime,
        sizeBytes: fileOrBlob.size,
        width: 800,
        height: 600,
      });
    };

    img.src = dataUrl;
  });
}
