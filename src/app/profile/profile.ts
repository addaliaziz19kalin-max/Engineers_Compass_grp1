import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../core/user.service';
import { ProfileImage, ProfileService } from '../core/profile.service';
import { MyPageService } from '../core/my-page.service';
import { NetworkService } from '../core/network.service';
import { PostsService, ago } from '../core/posts.service';
import { Icon } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';

@Component({
  selector: 'app-profile',
  imports: [RippleDirective, RouterLink, Icon],
  templateUrl: './profile.html',
  styleUrls: ['../account/account-shared.css', './profile.css'],
})
export class Profile {
  protected readonly profile = inject(ProfileService);
  protected readonly account = inject(UserService);
  protected readonly mine = inject(MyPageService);
  /** mes publications : visibles par tous sur mon profil */
  protected readonly posts = inject(PostsService);
  protected readonly ago = ago;

  // chiffres de « Mon réseau » : ils suivent la vraie liste (invitations reçues + envoyées, contacts)
  private readonly net = inject(NetworkService);
  protected readonly invitations = computed(() => this.net.invitations().length + this.net.sent().length);
  protected readonly contacts = computed(() => this.net.contacts().length);

  // nom, titre et présentation : profile.info() (modifiables depuis « Modifier le profil »)
  // le badge sous le nom suit le rôle vérifié du compte : account.badge()
  /** score de confiance : à zéro pour un compte neuf (TODO : calculé et contrôlé côté API) */
  protected readonly score = 0;

  protected readonly imageError = signal('');

  /** photo de profil (clic sur « PN ») ou de couverture (clic sur la couverture) */
  protected async onPick(kind: ProfileImage, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const ok = await this.profile.setImage(kind, file);
    this.imageError.set(ok ? '' : 'Choisissez une image (JPG, PNG ou WebP) de moins de 8 Mo.');
  }

  /** groupes par spécialité et compétences testées : vides pour un compte neuf (TODO : viennent de l'API, après les tests réussis) */
  protected readonly groups: string[] = [];
  protected readonly skills: { name: string; value: number }[] = [];
}
