import { Component, computed, input } from '@angular/core';

/** Icônes (une seule path par icône, grille 24×24, trait). Usage : <app-icon name="home" /> */
export const ICONS = {
  user: 'M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8M4 21a8 8 0 0 1 16 0',
  users: 'M9 4a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 3.5 6',
  mail: 'M5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9A2.5 2.5 0 0 1 5.5 5ZM3.5 7l8.5 6 8.5-6',
  lock: 'M7 10.5h10a2.5 2.5 0 0 1 2.5 2.5v5A2.5 2.5 0 0 1 17 20.5H7A2.5 2.5 0 0 1 4.5 18v-5A2.5 2.5 0 0 1 7 10.5ZM8 10.5V8a4 4 0 0 1 8 0v2.5',
  eye: 'M2.5 12C3.5 9 7 5 12 5s8.5 4 9.5 7c-1 3-4.5 7-9.5 7s-8.5-4-9.5-7ZM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6',
  'eye-off': 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4 9.5 7a11.6 11.6 0 0 1-2.6 3.8M6.2 6.3A11.6 11.6 0 0 0 2.5 12c1 3 4.5 7 9.5 7a9.6 9.6 0 0 0 4-.9',
  globe: 'M12 2.5a9.5 9.5 0 1 0 0 19a9.5 9.5 0 1 0 0-19M2.5 12h19M12 2.5c2.6 2.7 4 6 4 9.5s-1.4 6.8-4 9.5c-2.6-2.7-4-6-4-9.5s1.4-6.8 4-9.5Z',
  'chev-down': 'm6 9 6 6 6-6',
  'chev-right': 'm9 6 6 6-6 6',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6 6 18',
  pin: 'M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11ZM12 8a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5',
  calendar: 'M5 5h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 5 5ZM3.5 10h17M8 3v4M16 3v4',
  graduation: 'M12 4 2 9l10 5 10-5-10-5ZM6 11.5V16c0 1.2 2.7 3 6 3s6-1.8 6-3v-4.5M22 9v6',
  cog: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  briefcase: 'M5 7.5h14A1.5 1.5 0 0 1 20.5 9v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18V9A1.5 1.5 0 0 1 5 7.5ZM9 7.5v-2a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2M3.5 13h17',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v3a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-3',
  file: 'M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM14 3v5h5',
  home: 'M3 10.5 12 3l9 7.5V19a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2v-8.5Z',
  target: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10M12 11.2a.8.8 0 1 0 0 1.6a.8.8 0 1 0 0-1.6',
  bell: 'M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9ZM10 20a2 2 0 0 0 4 0',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M20.5 20.5 16 16',
  bookmark: 'M6.5 3.5h11v17L12 16.5l-5.5 4v-17Z',
  chart: 'M4 20V10M10 20V4M16 20v-7M2 20h20',
  shield: 'M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6L12 3Z',
  settings: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  moon: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z',
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  help: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01',
  image: 'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM3 16l5-5 4 4 3-3 6 6M8.5 8.5h.01',
  video: 'M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2ZM16 10.5l6-3.5v10l-6-3.5',
  award: 'M12 3a6 6 0 1 0 0 12a6 6 0 1 0 0-12M8.5 14 7 21l5-3 5 3-1.5-7',
  heart: 'M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20Z',
  comment: 'M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  share: 'M4 12v7h16v-7M12 3v12M7.5 7.5 12 3l4.5 4.5',
  message: 'M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 20.5l1.4-5.4A8.5 8.5 0 1 1 21 11.5Z',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  send: 'M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z',
  alert: 'M12 4 2.5 20h19L12 4ZM12 10v4M12 17h.01',
  building: 'M6 3h12v18H6ZM9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2',
  grid: 'M4 4h7v7H4ZM13 4h7v7h-7ZM4 13h7v7H4ZM13 13h7v7h-7Z',
  copy: 'M9 9h11v11H9ZM5 15V4h11',
  compass: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M15.5 8.5l-2 5-5 2 2-5Z',
  'wifi-off': 'M3 3l18 18M8.5 16a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 3.5-2M12 20h.01M16 10.5a10 10 0 0 1 3 2',
  server: 'M4 5h16v6H4ZM4 13h16v6H4ZM8 8h.01M8 16h.01',
  refresh: 'M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l3 2',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M12 8.5l1.5 2 2 1.5-2 1.5-1.5 2-1.5-2-2-1.5 2-1.5Z',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  logout: 'M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 8l4 4-4 4M20 12H9',
  'user-plus': 'M10 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8M2.5 21a7.5 7.5 0 0 1 15 0M19 8v6M16 11h6',
} as const;

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="d()" /></svg>`,
  styles: `:host { display: inline-flex; width: 1em; height: 1em; flex: none; } svg { width: 100%; height: 100%; }`,
})
export class Icon {
  readonly name = input.required<IconName>();
  protected readonly d = computed(() => ICONS[this.name()]);
}
