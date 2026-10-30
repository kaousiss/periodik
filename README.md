# Periodik

Jeu gratuit pour apprendre le tableau périodique par cœur : niveaux, défis chrono, mode classé avec rangs
(Noob, Bronze, Argent, Or, Pro, Expert, Céleste, Divin, Error), multijoueur local avec suspense, défi du jour,
révision intelligente, skins débloquables et créateur de skins, photo de profil.

**Un seul code (HTML + JavaScript, aucune dépendance) pour toutes les plateformes :**

| Plateforme | Technologie d'emballage | Fichier produit |
|---|---|---|
| Site web (et iPhone tout de suite, via « Sur l'écran d'accueil ») | aucune, le dossier `www/` suffit | un site |
| Android | Capacitor | `.apk` (et `.aab` pour le Play Store) |
| iPhone / iPad | Capacitor | projet Xcode, puis `.ipa` |
| Windows | Electron | `.exe` (installateur + version portable) |
| Linux | Electron | `.AppImage` et `.deb` |

## Ce qui est vérifié, et ce qui ne l'est pas

Vérifié automatiquement (`npm test`, `npm run test:ui`) : les 118 éléments (symboles, positions, familles), 1 500+ questions
générées sans doublon ni ambiguïté, rangs et promotion/relégation, et un parcours complet dans un navigateur (tous les écrans,
quiz, chrono, dialogues, import/export de skin, multijoueur avec suspense de 10 s et podium).

**Non testé** : la fabrication de l'APK, des programmes Windows/Linux et du projet iPhone. Ces étapes ont besoin d'outils
(Android SDK, Xcode, Electron) qui n'étaient pas accessibles là où le projet a été écrit. La configuration et le fichier
`.github/workflows/build.yml` sont prêts, mais le premier lancement peut demander un petit ajustement : regarde le journal
de l'onglet « Actions » et corrige l'étape en rouge.

## 1. Lancer le jeu chez toi

Ouvre un terminal dans ce dossier :

```
node tests/core.test.js        # tests de la logique, aucune installation requise
npx serve www                  # puis ouvre l'adresse affichée
```

## 2. Publier sur un site (première étape, sans argent)

Le dossier `www/` est le site complet. Trois options gratuites :

- **GitHub Pages** : mets le projet sur GitHub, Réglages → Pages → Source « GitHub Actions ». Le fichier `build.yml` publie à chaque push sur `main`.
- **Netlify Drop** : glisse le dossier `www/` sur app.netlify.com/drop. C'est le plus rapide.
- **Cloudflare Pages / Vercel** : dossier de sortie `www`, aucune commande de build.

Le site fonctionne ensuite **hors ligne** (service worker) et peut être **installé** :
- Android / Chrome : menu → « Installer l'application ».
- **iPhone** : Safari → bouton Partager → « Sur l'écran d'accueil ». C'est la façon de l'avoir sur iPhone sans payer Apple.
- Windows / Linux : icône d'installation dans la barre d'adresse de Chrome ou Edge.

## 3. Fabriquer les applications (APK, Windows, Linux, iPhone)

### Le plus simple : GitHub Actions (rien à installer chez toi)

1. Crée un dépôt GitHub et envoie ce dossier dedans.
2. Onglet **Actions** → **Construire Periodik** → **Run workflow**.
3. Quand c'est vert, télécharge les fichiers dans **Artifacts** :
   `Periodik-Android-test.apk`, `Periodik-Windows` (.exe), `Periodik-Linux` (.AppImage, .deb), `Periodik-iOS-simulateur`.
4. Pour une version publique : `git tag v1.1.0 && git push --tags` crée une *Release* avec les fichiers.

L'APK « test » s'installe directement sur un téléphone Android (autorise les sources inconnues). Il est signé avec une clé
de débogage : bon pour tester et distribuer sur ton site, **pas** pour le Play Store.

### Sur ta machine

```
npm install
npm run android:init     # crée le dossier android/ et les icônes
npm run android:apk      # produit android/app/build/outputs/apk/debug/app-debug.apk  (JDK 21 + Android SDK requis)
npm run dist:win         # Windows  → dist/*.exe   (à lancer sous Windows)
npm run dist:linux       # Linux    → dist/*.AppImage et *.deb
npm run ios:init && npm run ios:open   # Mac + Xcode uniquement
```

### Icônes

`python3 tools/make-icons.py` régénère toutes les icônes depuis un seul dessin (la case « Pk 119 »). Pour changer le logo,
modifie la fonction `tile()` dans ce fichier.

## 4. Quand tu auras les fonds : Google Play et App Store

- **Google Play** : compte développeur unique de 25 USD. Il faut une clé de signature : crée-la une fois
  (`keytool -genkeypair -v -keystore periodik.jks -alias periodik -keyalg RSA -keysize 2048 -validity 10000`), garde-la en lieu sûr
  (la perdre bloque les mises à jour), puis ajoute les 4 secrets décrits en haut de `build.yml`. Le workflow produit alors un APK signé
  et un `.aab`, le format que Google Play demande.
- **App Store** : compte Apple Developer à 99 USD/an et un Mac (ou un Mac loué dans le cloud). `npm run ios:open`, puis
  Xcode → Signing → ton équipe → Product → Archive → Distribute. Apple refuse parfois les « simples sites emballés » : ajoute
  si besoin une fonction native (vibrations, notifications du défi du jour) via un plugin Capacitor.
- Pense à une **page de politique de confidentialité** (obligatoire sur les deux stores). Le jeu ne collecte rien aujourd'hui : tout reste sur l'appareil.

## 5. Mettre à jour le jeu

Modifie `www/`, incrémente `CACHE` dans `www/sw.js` et `version` dans `package.json`, puis publie. Les joueurs du site reçoivent la
mise à jour au lancement suivant ; pour les apps, publie un nouveau tag.

## 6. Plan du mode en ligne (mise à jour suivante)

Le jeu stocke déjà tout dans un seul objet (`S` dans `www/app.js`, clé `periodik_v1`). Pour passer en ligne :

1. **Compte et sauvegarde** : Supabase ou Firebase (offre gratuite suffisante au départ), connexion par e-mail ou Google.
2. **Classement mondial** : une table `scores(joueur, rp, rang, meilleur_score, date)` et un écran qui lit le top 100.
3. **Duels classés** : même moteur de questions (`nextQuestion` avec graine commune, déjà utilisé pour le défi du jour),
   les deux joueurs jouent les mêmes questions, le serveur compare les scores et met à jour les RP.
4. **Anti-triche** : les scores ne doivent jamais être calculés uniquement sur l'appareil. Le serveur rejoue ou vérifie les réponses.
5. **Concours du meilleur skin** : le code de skin (bouton « Copier le code ») est déjà un petit texte partageable ; il suffit de le stocker et de proposer un vote.

Revenus sans achat intégré : publicités récompensées (AdMob), parrainage du concours mondial par une marque ou une école,
dons. Le texte des réglages dit « gratuit, sans achat intégré » : n'y ajoute pas « sans publicité » si tu en mets.

## Structure

```
www/               le jeu (c'est tout ce qui est publié)
  index.html  style.css  core.js  app.js  sw.js  manifest.webmanifest  icons/
  core.js          données des 118 éléments, questions, rangs, niveaux, skins (sans DOM, testé)
  app.js           interface et boucle de jeu
electron/main.js   coque Windows / Linux
capacitor.config.json   coque Android / iPhone
.github/workflows/build.yml   fabrique tout dans le cloud
tests/             core.test.js (logique) et ui.test.py (navigateur, Playwright)
tools/make-icons.py
```

## Sources et limites des données

Noms français, masses atomiques arrondies (IUPAC) et familles suivant la présentation courante du tableau :
groupe 3 = Sc, Y, Lu, Lr ; lanthanides = La à Lu, actinides = Ac à Lr dans les statistiques de familles ;
Zn, Cd, Hg classés métaux de transition ; Po « métal pauvre » ; At « halogène ». Les éléments 113 à 118 ont des propriétés
chimiques prédites, pas mesurées. Les neutrons affichés sont une approximation (masse arrondie moins Z).
