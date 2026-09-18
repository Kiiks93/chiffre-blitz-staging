# 🎮 CHIFFRE BLITZ

**Jeu de réflexes multijoueur** — Repère. Clique. Triomphe. ⚡

## 🚀 État actuel

**Phases 1-9B** : ✅ Terminées
**Phase 10** : 🟡 En cours (assets + config Capacitor)
**Phase 11-12** : ⏳ À venir

---

## ✅ PHASES TERMINÉES

### Phase 1 — Fondations saisonnières
- Boule de neige offerte (Palier 15 S3)
- Nom du pass dynamique (S1/S2/S3)
- Modes exclusifs Halloween 🎃 + Noël 🎄
- Sélecteur de bande son SANS spoiler
- Dates début/fin des saisons modifiables
- Cosmétiques S3 (cadres, grilles, avatars, titres)
- Bugs corrigés (mute dupliqué, rule4/5, media query)

### Phase 2 — Passe de saison (DA "Brawl Stars")
- Horizontal PC / vertical mobile, fenêtre plein écran
- Cartes PREMIUM bleues à bordure OR + ruban « ⭐ PREMIUM »
- Cartes GRATUIT/FREE + ruban traduit
- Aperçus visuels réels (avatars Lottie/vidéo, cadres, swatchs, titres)
- Clic sur la tuile entière pour récupérer (badge ✔)
- Molette = scroll horizontal (PC)
- Position de scroll conservée après récupération
- Animation pop + burst d'emojis au déblocage

### Phase 3 — Personnalisation & économie
- Équip instantané cadre/thème/titre à la sélection
- Sélecteur de packs (grille + cadre) traduit
- `ownsItemOrPack()` (équiper un objet d'un pack possédé)

### Phase 4 — Performance & stabilité
- Popup récompense throttlée + auto-fermeture
- Fuites mémoire / superposition de sons corrigées
- Barres d'émoticônes reconstruites (emojis manquants)
- Anti match-contre-soi (file dédupliquée + vérif même pseudo)
- `server.js` complet ré-équilibré

### Phase 5 — Traduction FR/EN complète
- Auto-détection de la langue de l'appareil
- Override manuel 🌐 FR ↔ EN
- 8 fichiers traduits + patches
- Compteur en ligne sans texte à traduire

### Phase 6 — Admin avancé
- Fenêtre `admin.html` indépendante
- Annonces globales, cadeaux
- Override saison + dates saisons (persistées Supabase)
- Ajuster Pièces/Points/Trophées
- Compteur joueurs réellement en ligne
- Attribuer objet/trophée
- Événements planifiés (Coin Rush, Rank Shield, Expresso, Chaos, Jackpot, Tug-of-War, Halloween, Noël)

### Phase 7 — Traces, sécurité & modération
- Table `player_logs` (Supabase) : chaque mouvement d'économie horodaté
- Console admin « 📜 Journal des transactions »
- Compteur en ligne public dans la barre de stats
- Anti-triche : rate-limit clics 1v1 + catch, validation serveur
- RGPD : hachage SHA-256 des codes secrets + migration legacy
- Récupération de compte : clé de sécurité par pseudo + changement de code
- Reset code par admin (vérif clé) + déconnexion forcée

### Phase 8 — Audit & consolidation
Tous les fichiers front audités, optimisés et documentés :
- `style.css` (variables, 21 sections, -45%)
- `admin.html` (structure corrigée)
- `admin.js` (réduit à l'essentiel)
- `package.json` (métadonnées, scripts, versions)
- `index.html` (doublon supprimé, 12 sections)
- `i18n.js` (15 sections, clés récupération)
- `audio.js` (20 sections, constantes)
- `fx.js` (factory canvas, 4 sections)
- `jeu.js` (20 sections, constantes)
- `passe.js` (12 sections, createShopCard)
- `profil.js` (14 sections, avatarMap)
- `social.js` (10 sections, SOCIAL_STYLES)
- `saisons.css` (18 sections, bug orpheline corrigé)
- `saisons.js` (16 sections, cloneLottieData)
- `son-saisons.js` (10 sections, constantes musicales)
- `modes-catch.js` (11 sections, CATCH_CONFIG)

### Phase 9 — Préparation publication
- Compte Google Play Console créé + 25$ payés
- Adresse email dédiée créée
- Serveur Discord créé

### Phase 9B — Mode Aventure & Mobile
**Mode de jeu complet : Tour Aventure**
- 9 mondes de 200 étages (1800 étages au total)
- Courbe de difficulté calibrée par monde + « souffle » aux 10 premiers étages
- 9 modes de jeu en rotation : classic, reverse, color, pairs, sprint, parity, forbidden, memory, nofail
- Mode Mémoire : chiffres visibles ~3s puis masqués, clic de mémoire, étoiles basées sur erreurs
- Gardiens (boss) aux étages 50, 100, 150, 200 avec barre de vie
- Système de vies : max 10, régénération 1/20min, achat boutique aventure
- Jokers : ⏱️ +10s temps, 🛡️ bouclier (absorbe erreur/clic interdit)
- Boutique aventure : +3 vies, packs IAP (1/3/5€), jokers
- DA procédurale des 9 mondes (CSS/HTML généré, cache par monde)
- Musique par monde : M1 = mp3 Néon, M2 = mélodie cristal, M3 = mp3 coffre-fort
- Musique de saison verrouillée : override en aventure, coupe en arrière-plan
- Déblocage mondes saisonniers : flags permanents via Tier 1 du pass

**Mobile & session**
- Cache-busting automatique : `?v=timestamp` dans `index.html`
- Reprise de session : `sessionStorage` pour dernière page active
- Page explications au lancement frais (app tuée → écran de bienvenue)
- Partage natif : `navigator.share` + fallback modale
- Service Worker network-only : plus jamais de fichiers périmés sur mobile

**Audio**
- Volume M1 (Néon) baissé à 0.30
- Volume Halloween +50% (menu + jeu)
- Mode Paires avec révélation 3s
- Musiques par monde (M1, M2, M3) avec fallback si mp3 absent

---

## 🟡 PHASE 10 — FINALISATION MOBILE (EN COURS)

**Assets**
- ✅ Icône 192×192 (PWA/manifest)
- ✅ Icône 512×512 (Play Store)
- ✅ Feature graphic 1024×500 (Play Store)
- 🟡 Icône 1024×1024 (source Capacitor) — à générer
- 🟡 Splash 2732×2732 (écran démarrage) — à générer

**Configuration**
- ✅ `capacitor.config.json` avec bloc `plugins.SplashScreen`
- 🟡 `@capacitor/assets` installé
- 🟡 `npx @capacitor/assets generate --android` à exécuter

**Plugins natifs**
- 🟡 `@capacitor-community/admob` à installer
- 🟡 `@capacitor-community/in-app-purchase` à installer
- 🟡 `@capacitor/share` à installer

**Test & soumission**
- ⏳ Test fermé Play Console — 12 testeurs : 3/14 jours
- 🟡 Soumission production (après les 14 jours + build final)

---

## ⏳ PHASE 11 — MONÉTISATION (À VENIR)

**Google Play Billing**
- 🟡 Produits à créer dans Play Console :
  - `blitz_pass_premium` (3€) — Passe Premium saison en cours
  - `pack_vies_1` (1€) — Pack 10 vies
  - `pack_mixte_3` (3€) — Pack Mixte (5 vies + 2 jokers)
  - `pack_blitz_5` (5€) — Pack Blitz (10 vies + 5 jokers)
- 🟡 Code client `iap.js` : `buyPassPremium()` / `buyPack(id)`
- 🟡 Handler serveur `iap_grant` : octroi avec dédup token anti-double-crédit
- 🟡 Vérification du reçu d'achat côté serveur (anti-triche)

**Activation automatique**
- ✅ `isSeasonPassLive()` : pass s'active automatiquement le 01/10/2026
- 🟡 Tests d'achat réel (gratuit) avec un testeur

**Publicités**
- ✅ `ads.js` : abstraction AdMob (natif = réel, web = simulé)
- 🟡 IDs AdMob à configurer (interstitial + rewarded)
- 🟡 Tests pub réelle dans l'APK

**Multi-plateforme**
- 🟡 PWA iOS (sans App Store, gratuit)
- 🟡 Microsoft Store (PC, ~19€)

---

## ⏳ PHASE 12 — LIVE OPS (À VENIR)

- 🟡 Quêtes quotidiennes/hebdo (rétention)
- 🟡 Tournois (bouton "bientôt" → réel)
- 🟡 Saison 4 (thème, cosmétiques, pass)
- 🟡 Bot Discord (annonces, support, codes promo)
- 🟡 Traduction EN 100% (après freeze du texte)
- 🟡 Audit final (RGPD, sécurité, doublons, performance)

---

## 🛠️ STACK

**Frontend**
- HTML5, CSS3, JS vanilla
- Socket.io (temps réel)
- Lottie (avatars animés)

**Backend**
- Node.js, Express, Socket.io (Render)
- Supabase (PostgreSQL) : `players`, `friendships`, `settings`, `player_logs`

**Mobile**
- Capacitor (Android)
- Plugins : AdMob, In-App-Purchase, Share

**Assets**
- Icônes : 192×192, 512×512, 1024×1024
- Splash : 2732×2732
- Feature graphic : 1024×500

**Audio**
- M1 Néon : `sound/neon-city.mp3` (Pixabay)
- M3 Banque : `sound/coffre-fort.mp3` (Pixabay)
- M2 Cristal : mélodie procédurale
- Saisons : Halloween/Noël procédurales

---

## 📝 CHANGELOG RÉCENT

**Session du 13 septembre 2026**
- ✅ Musiques par monde (M1, M2, M3) avec mp3 + fallback
- ✅ Volume M1 baissé (0.85 → 0.30)
- ✅ Volume Halloween +50%
- ✅ Mode Paires avec révélation 3s
- ✅ Déblocage saisons serveur (flags via Tier 1 pass)
- ✅ Activation automatique du pass au 01/10/2026
- ✅ Carte Mode Aventure dans page explicative
- ✅ Modale "Soutenir le créateur" avec countdown 5s
- ✅ Correction "100% gratuit" → "gratuit à jouer (achats optionnels)"
- ✅ Menu explicatif sans scroll (responsive)
- ✅ Salle trophées optimisée (blur supprimé, animations simplifiées)

---

## 🎯 PROCHAINES ÉTAPES

1. **Demain** : générer assets + config Capacitor + install plugins
2. **Cette semaine** : finir test fermé (14 jours)
3. **Semaine prochaine** : bloc natif final (Billing + AdMob + Share)
4. **Avant rebuild** : audit final + freeze traduction
5. **Rebuild unique** : upload Play Console + création produits + test achat
6. **Production** : soumission + lancement le 01/10/2026

---

**Développé avec ❤️ par un créateur indépendant**
