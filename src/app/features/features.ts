import { Component } from '@angular/core';
import { RevealDirective } from '../shared/reveal.directive';

interface Feature {
  title: string;
  text: string;
}

@Component({
  selector: 'app-features',
  imports: [RevealDirective],
  templateUrl: './features.html',
  styleUrl: './features.css',
})
export class Features {
  protected readonly items: Feature[] = [
    { title: 'Rôles vérifiés', text: "Carte d'étudiant, diplôme ou contrat : chaque profil est justifié." },
    { title: 'Compétences prouvées', text: 'Un test par IA valide tes projets et certificats avant partage.' },
    { title: 'Défis et stages', text: 'Des défis dans tous les domaines et des offres de stage et de PFE suivies.' },
  ];
}
