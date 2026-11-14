/** Sujets proposés pour le test de connaissance d'un projet ou d'un certificat. */
export interface Topic { id: string; label: string }
export interface Question { q: string; options: string[]; answer: number }

export const TOPICS: Topic[] = [
  { id: 'iot', label: 'IoT et réseaux' },
  { id: 'web', label: 'Web et logiciel' },
  { id: 'data', label: 'Data et IA' },
  { id: 'elec', label: 'Électronique et énergie' },
];

// TODO : à terme, les questions sont générées par l'IA à partir du texte et du sujet de la publication.
// Dans chaque question, la bonne réponse est écrite en premier ; l'ordre est mélangé à chaque test (voir buildQuiz).
const BANK: Record<string, [string, string, string, string, string][]> = {
  iot: [
    ['Quel protocole léger est très utilisé en IoT pour publier des mesures de capteurs ?', 'MQTT', 'FTP', 'SMTP', 'SSH'],
    ['LoRa est surtout adapté à…', 'Des liaisons longue portée à faible débit', 'Du streaming vidéo', 'Des transferts de gros fichiers', 'La téléphonie 5G'],
    ['Que désigne le « QoS » dans MQTT ?', 'Le niveau de garantie de livraison', 'Le chiffrement du message', 'La taille du message', 'Le nom du topic'],
    ['Pour réduire la consommation d’un capteur sur batterie, on utilise surtout…', 'La mise en veille profonde', 'Un polling permanent', 'Une fréquence d’échantillonnage maximale', 'Un écran allumé'],
    ['Un tableau de bord « temps réel » reçoit généralement les données via…', 'WebSocket ou abonnement MQTT', 'Un fichier CSV envoyé par e-mail', 'Une impression papier', 'Un export mensuel'],
    ['Quel est le rôle d’une passerelle (gateway) LoRaWAN ?', 'Relayer les trames radio vers le réseau IP', 'Alimenter les capteurs', 'Stocker les mots de passe', 'Compiler le code'],
    ['Dans un capteur, l’ADC sert à…', 'Convertir un signal analogique en numérique', 'Chiffrer les données', 'Augmenter la tension', 'Synchroniser l’horloge'],
    ['Quelle unité mesure un débit de données ?', 'Octets par seconde', 'Hertz', 'Watts', 'Ohms'],
    ['Que fait le protocole HTTPS en plus de HTTP ?', 'Il chiffre les échanges (TLS)', 'Il compresse les images', 'Il accélère le Wi-Fi', 'Il stocke les cookies'],
    ['Un « topic » MQTT est…', 'Un canal nommé où l’on publie et s’abonne', 'Un mot de passe', 'Un type de capteur', 'Une adresse IP'],
  ],
  web: [
    ['Que décrit une API REST ?', 'Des ressources accessibles par des URL et des méthodes HTTP', 'Un langage de programmation', 'Un type de base de données', 'Un protocole de messagerie'],
    ['Quel code HTTP indique qu’une ressource est introuvable ?', '404', '200', '500', '301'],
    ['En Git, quelle commande enregistre les changements indexés dans l’historique ?', 'git commit', 'git clone', 'git fetch', 'git init'],
    ['En JavaScript, que renvoie typeof null ?', '"object"', '"null"', '"undefined"', '"number"'],
    ['À quoi sert un index dans une base de données SQL ?', 'À accélérer les recherches', 'À chiffrer les données', 'À dupliquer la table', 'À réduire la taille du disque'],
    ['Dans Angular, comment un composant obtient-il un service ?', 'Par l’injection de dépendances', 'Par le routage', 'Par les pipes', 'Par les animations'],
    ['À quoi sert CORS dans un navigateur ?', 'À contrôler les requêtes envoyées vers une autre origine', 'À compresser le code', 'À chiffrer le disque', 'À gérer la mémoire du serveur'],
    ['Quelle est la complexité d’une recherche dichotomique dans un tableau trié ?', 'O(log n)', 'O(n)', 'O(n²)', 'O(1)'],
    ['Docker sert principalement à…', 'Exécuter une application dans un conteneur isolé', 'Écrire du CSS', 'Compresser des images', 'Surveiller le Wi-Fi'],
    ['Quelle méthode HTTP sert normalement à créer une ressource ?', 'POST', 'GET', 'HEAD', 'TRACE'],
  ],
  data: [
    ['Un modèle en surapprentissage (overfitting)…', 'Réussit sur les données d’entraînement mais généralise mal', 'Échoue sur toutes les données', 'Apprend trop lentement', 'N’utilise aucune donnée'],
    ['Pour mesurer la capacité de généralisation d’un modèle, on utilise…', 'Un jeu de test séparé', 'Uniquement le jeu d’entraînement', 'Le hasard', 'Le nombre de lignes'],
    ['Quelle métrique convient à un problème de régression ?', 'L’erreur quadratique moyenne (MSE)', 'La matrice de confusion', 'Le rappel', 'Le taux de classes'],
    ['Que fait la descente de gradient ?', 'Elle ajuste les paramètres pour réduire la fonction de coût', 'Elle trie les données', 'Elle chiffre le modèle', 'Elle supprime les doublons'],
    ['Dans pandas, quelle structure représente un tableau à colonnes nommées ?', 'DataFrame', 'Tuple', 'Thread', 'Socket'],
    ['Le rappel (recall) est…', 'La part des cas positifs réels correctement détectés', 'La part des prédictions négatives', 'Le temps de calcul', 'Le nombre de paramètres'],
    ['Quel apprentissage cherche des groupes dans des données non étiquetées ?', 'L’apprentissage non supervisé', 'L’apprentissage supervisé', 'La compilation', 'Le chiffrement'],
    ['Pourquoi normaliser les variables numériques avant certains modèles ?', 'Pour que les grandes échelles ne dominent pas l’apprentissage', 'Pour augmenter le nombre de lignes', 'Pour changer le format du fichier', 'Pour supprimer des colonnes'],
    ['Que montre une matrice de confusion ?', 'Les prédictions correctes et erronées par classe', 'La corrélation entre colonnes', 'Le coût du matériel', 'Les poids du réseau'],
    ['Un réseau de neurones est entraîné grâce à…', 'La rétropropagation du gradient', 'La compilation', 'La défragmentation', 'Le routage'],
  ],
  elec: [
    ['Quelle est la loi d’Ohm ?', 'U = R × I', 'P = U / R²', 'I = U × R', 'R = U × I'],
    ['Quelle est l’unité de la puissance ?', 'Le watt', 'Le volt', 'L’ohm', 'Le farad'],
    ['À quoi sert un condensateur de découplage ?', 'À filtrer les variations de la tension d’alimentation', 'À augmenter la fréquence', 'À produire de l’énergie', 'À mesurer le courant'],
    ['Un transformateur sert à…', 'Modifier le niveau d’une tension alternative', 'Stocker l’énergie', 'Convertir le continu en alternatif', 'Mesurer la fréquence'],
    ['Quelle est la fréquence du réseau électrique tunisien ?', '50 Hz', '60 Hz', '100 Hz', '1 kHz'],
    ['L’impédance d’entrée d’un amplificateur opérationnel idéal est…', 'Infinie', 'Nulle', 'Égale à 50 Ω', 'Égale à celle de la sortie'],
    ['Que fait un onduleur ?', 'Il convertit un courant continu en alternatif', 'Il convertit l’alternatif en continu', 'Il réduit la fréquence', 'Il mesure la température'],
    ['Selon Shannon, on échantillonne un signal à…', 'Au moins deux fois sa fréquence maximale', 'Exactement sa fréquence', 'La moitié de sa fréquence', 'Une fréquence aléatoire'],
    ['Quelle source d’énergie est renouvelable ?', 'Le solaire photovoltaïque', 'Le charbon', 'Le gaz naturel', 'Le fioul'],
    ['Une diode…', 'Laisse passer le courant dans un seul sens', 'Amplifie le courant', 'Stocke une charge', 'Mesure une résistance'],
  ],
};

export function topicLabel(id: string): string {
  return TOPICS.find((t) => t.id === id)?.label ?? TOPICS[0].label;
}

/** Les questions du sujet, avec les réponses dans un ordre mélangé. */
export function buildQuiz(topicId: string): Question[] {
  const rows = BANK[topicId] ?? BANK['iot'];
  return rows.map(([q, good, ...bad]) => {
    const options = [good, ...bad];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return { q, options, answer: options.indexOf(good) };
  });
}
