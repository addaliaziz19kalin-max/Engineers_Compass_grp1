import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Pied de page commun (pages du compte et pages d'erreur). */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.css',
})
export class SiteFooter {
  protected readonly year = new Date().getFullYear();
}
