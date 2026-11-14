import { userKey } from './storage';
import { Injectable, computed, signal } from '@angular/core';
import { initialsOf } from './my-page.service';

export type EntryKind = 'experience' | 'formation' | 'certificat';

export interface ProfileEntry {
  id: number;
  kind: EntryKind;
  title: string;
  sub: string;
}

/** Informations affichées en tête du profil (modifiables depuis « Modifier le profil »). */
export interface ProfileInfo { name: string; role: string; about: string }

export type ProfileImage = 'avatar' | 'cover';

const IMAGES_KEY = 'ec-profile-images';
const INFO_KEY = 'ec-profile';
/** taille maximale du fichier choisi */
export const MAX_IMAGE = 8 * 1024 * 1024;

/** un compte neuf n'a ni nom, ni titre, ni expérience : le nom vient de l'inscription (voir `init`) */
const DEFAULT_INFO: ProfileInfo = { name: '', role: '', about: '' };

/** Expériences, formations et certificats du profil. La plus récente est affichée en bio. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly saved = this.readSaved();

  /** nom, titre et présentation du compte (TODO : remplacer par les données du compte, API) */
  readonly info = signal<ProfileInfo>({ ...DEFAULT_INFO, ...this.saved.info });
  readonly initials = computed(() => initialsOf(this.info().name) || 'EC');

  // TODO : remplacer par les données du compte (API)
  readonly entries = signal<ProfileEntry[]>(this.saved.entries ?? []);

  /** photo de profil et photo de couverture (image réduite, gardée en local) */
  readonly avatar = signal<string | null>(this.readImages().avatar ?? null);
  readonly cover = signal<string | null>(this.readImages().cover ?? null);

  /** expérience la plus récente (affichée en bio) */
  readonly latest = computed(() => this.entries().find((e) => e.kind === 'experience') ?? null);

  /** nouveau compte : le nom saisi à l'inscription et le rôle vérifié ; profil vide à part cela (TODO : API) */
  init(name: string, role: string): void {
    this.info.set({ name: name.trim(), role, about: '' });
    this.entries.set([]);
    this.avatar.set(null);
    this.cover.set(null);
    this.save();
    this.saveImages();
  }

  add(e: Omit<ProfileEntry, 'id'>): void {
    this.entries.update((l) => [{ ...e, id: Math.max(10, ...l.map((x) => x.id + 1)) }, ...l]);
    this.save();
  }

  /**
   * Enregistre les modifications du profil : infos + liste des expériences, formations et certificats.
   * TODO : envoyer les modifications à l'API
   */
  update(info: ProfileInfo, entries: ProfileEntry[]): void {
    this.info.set(info);
    this.entries.set(entries);
    this.save();
  }

  /**
   * Choisit la photo de profil (carrée) ou de couverture : l'image est réduite puis mémorisée.
   * TODO : envoyer l'image à l'API. Renvoie false si le fichier n'est pas une image lisible.
   */
  async setImage(kind: ProfileImage, file: File): Promise<boolean> {
    if (!file.type.startsWith('image/') || file.size > MAX_IMAGE) return false;
    try {
      const bmp = await createImageBitmap(file);
      const max = kind === 'avatar' ? 256 : 1200;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      if (kind === 'avatar') {
        // on garde le centre de l'image, en carré
        const side = Math.min(bmp.width, bmp.height);
        canvas.width = canvas.height = max;
        ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, max, max);
      } else {
        const ratio = Math.min(1, max / Math.max(bmp.width, bmp.height));
        canvas.width = Math.round(bmp.width * ratio);
        canvas.height = Math.round(bmp.height * ratio);
        ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      }
      bmp.close();
      (kind === 'avatar' ? this.avatar : this.cover).set(canvas.toDataURL('image/jpeg', 0.85));
      this.saveImages();
      return true;
    } catch { return false; }
  }

  private readSaved(): { info?: Partial<ProfileInfo>; entries?: ProfileEntry[] } {
    try {
      const saved = JSON.parse(localStorage.getItem(userKey(INFO_KEY)) ?? 'null');
      if (saved) return { info: saved.info, entries: Array.isArray(saved.entries) ? saved.entries : undefined };
    } catch { /* stockage indisponible ou illisible */ }
    return {};
  }

  private save(): void {
    try { localStorage.setItem(userKey(INFO_KEY), JSON.stringify({ info: this.info(), entries: this.entries() })); } catch { /* stockage indisponible */ }
  }

  private readImages(): { avatar?: string; cover?: string } {
    try { return JSON.parse(localStorage.getItem(userKey(IMAGES_KEY)) ?? '{}') ?? {}; } catch { return {}; }
  }

  private saveImages(): void {
    try { localStorage.setItem(userKey(IMAGES_KEY), JSON.stringify({ avatar: this.avatar(), cover: this.cover() })); } catch { /* stockage plein ou indisponible */ }
  }
}
