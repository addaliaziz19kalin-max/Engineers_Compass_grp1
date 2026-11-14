import { Injectable } from '@angular/core';
import { UserRole } from './user.service';

/** Document attendu pour chaque rôle (images de public/verification). « Autre » n'a pas de document de référence. */
const REFERENCE: Partial<Record<UserRole, string>> = {
  student: '/verification/carte-etudiant.jpeg',
  engineer: '/verification/diplome-ingenieur.png',
  employer: '/verification/certificat-travail.png',
};

/** Nombre maximum de différences (sur 64) entre deux empreintes pour considérer que c'est la même image. */
const MAX_DIFF = 12;

/**
 * Test de vérification de la preuve de rôle : instantané, il compare l'image envoyée à l'image attendue.
 * TODO : remplacer par la vérification réelle (lecture du document par IA côté API).
 */
@Injectable({ providedIn: 'root' })
export class ProofCheckService {
  /** true si le document correspond au rôle choisi */
  async check(role: UserRole, file: File): Promise<boolean> {
    const url = REFERENCE[role];
    if (!url) return true;
    if (!file.type.startsWith('image/')) return false;
    try {
      const reference = await (await fetch(url)).blob();
      const [a, b] = await Promise.all([this.fingerprint(file), this.fingerprint(reference)]);
      return a.filter((bit, i) => bit !== b[i]).length <= MAX_DIFF;
    } catch {
      return false;
    }
  }

  /** empreinte de l'image : image réduite à 9×8 pixels gris, chaque bit compare un pixel à son voisin de droite */
  private async fingerprint(image: Blob): Promise<boolean[]> {
    const bitmap = await createImageBitmap(image);
    const big = this.draw(bitmap, 72, 64);
    const small = this.draw(big, 9, 8);
    const px = small.getContext('2d')!.getImageData(0, 0, 9, 8).data;
    const grey = (i: number) => px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114;
    const bits: boolean[] = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits.push(grey(y * 9 + x) > grey(y * 9 + x + 1));
    return bits;
  }

  private draw(source: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, w, h);
    return canvas;
  }
}
