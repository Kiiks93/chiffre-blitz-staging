/* ============================================================
I18N.JS — SYSTÈME DE TRADUCTION FR/EN
============================================================ */

const i18n = {

  /* ============================================================
  1. FRANÇAIS
  ============================================================ */
  fr: {
    /* ----- Général ----- */
    coins: "Pièces", trophies: "Trophées", subtitle: "Repère. Clique. Triomphe.",
    btn_play: "JOUER ⚡", close: "Fermer", back: "⬅️ Retour", back_menu: "⬅️ Retour Menu",
    loading: "Chargement...", cancel: "❌ Annuler",

    /* ----- Règles ----- */
    rule1_title: "⚡ Principe du jeu",
    rule1_desc: "Repère la CIBLE affichée et clique-la à la vitesse de l'éclair ! Ordre croissant ou désordre total : seul le plus rapide survit. ⚡",
    rule2_title: "🏋️ Entraînement Solo",
    rule2_desc: "Classique, Aléatoire ou Avalanche : enchaîne les chiffres, bats tes records et fais le plein de pièces (🪙).",
    rule3_title: "⚔️ Duel 1v1 Online",
    rule3_desc: "Affronte un joueur en temps réel (non classé, classé SBMM ou salon privé). Le meilleur score en 30s l'emporte !",
    rule4_title: "👑 Rangs & Couronnes",
    rule4_desc: "Grimpe en classé pour gagner des couronnes 👑 et débloque les 16 trophées 🏆 de ta Salle des Trophées !",
    rule5_title: "🎯 Mode Tournoi",
    tourney_teaser_desc: "En cours de réflexion et de développement... Les tournois récompenseront en couronnes 👑 !",
    rule_tower_title: "🏰 Mode Aventure",
    rule_tower_desc: "Progression à travers 9 mondes thématiques : complète 200 niveaux par monde, affronte les Gardiens tous les 50 niveaux, et débloque des récompenses exclusives !",

    /* ----- Menu principal ----- */
    menu_solo: "🏋️ ENTRAÎNEMENT SOLO", menu_1v1: "⚔️ DUEL 1v1 ONLINE", menu_tow: "🪢 Mode Corde Raide (Tug-of-War)",
    menu_friends: "👥 SALONS & AMIS", menu_shop: "🛍️ BOUTIQUE", menu_lb: "👑 CLASSEMENT",
    menu_tourney: "🎯 TOURNOIS", menu_info: "ℹ️ Informations & Règles",
    menu_halloween: "🎃 Mode Exclusif Halloween", menu_noel: "🎄 Mode Exclusif Noël",

    /* ----- Solo ----- */
    solo_menu_title: "MODES D'ENTRAÎNEMENT",
    solo_classic: "⚡ Classique (Croissant)", solo_random: "🎲 Aléatoire (Cibles variées)", solo_avalanche_btn: "🧊 Avalanche (Difficultés)",
    avalanche_menu_title: "🧊 AVALANCHE (Difficultés)",
    diff_easy: "Facile", diff_medium: "Moyen", diff_hard: "Difficile 💀",
    solo_training_done: "🏋️ ENTRAÎNEMENT TERMINÉ", solo_score_label: "Score :",
    solo_perfection_banner: "💥 PERFECTION x35 !", solo_perfection_reason: "PERFECTION ! Récompense maximale + Succès ⭐",

    /* ----- 1v1 ----- */
    hub_title: "⚔️ DUEL 1v1 ONLINE", hub_subtitle: "Choisis ton mode de jeu :",
    hub_random: "🎲 Matchmaking non classé", hub_ranked: "⚔️ Matchmaking Classé (SBMM)",
    ranked_modal_title: "⚔️ PRÉPARATION CLASSÉE", ranked_modal_sub: "Choisis 2 objets de ton inventaire pour le match classé :",
    ranked_start_btn: "Lancer le Classé ⚡",
    ranked_empty: "Inventaire vide !", ranked_summary: "Objets sélectionnés : X/2", ranked_ready: "✅ Prêt à lancer",
    ranked_warning: "⚠️ Tu dois sélectionner exactement 2 objets", ranked_selected: "Sélectionné :",
    ranked_add: "+ Ajouter", ranked_remove: "- Retirer", ranked_no_stock: "Tu ne possèdes pas assez d'exemplaires de cet objet.",
    ranked_must_2: "En mode classé, tu dois sélectionner exactement 2 objets.",
    searching: "Recherche d'adversaire...", waiting_opponent: "En attente d'un adversaire...",
    opp_wants_rematch: "⚔️ L'adversaire souhaite une revanche !", malus_received: "💥 PIÈGE ADVERSAIRE REÇU !",
    rematch_btn: "Revanche ⚔️",

    /* ----- Salons & Amis ----- */
    rooms_title: "👥 Jouer entre amis", rooms_create: "✨ Créer un salon personnalisé",
    rooms_join_code: "🔑 Rejoindre avec un code", rooms_open_list: "Salons ouverts :",
    join_title: "🔑 Rejoindre un Salon", join_subtitle: "Entre le code et le mot de passe (si requis) :",
    room_code_label: "ROOM CODE", room_pass_label: "PASSWORD (Optional)", join_btn: "Rejoindre ⚡",
    room_header: "Salon", rooms_join: "Rejoindre", rooms_room: "Salon",
    rooms_name_short: "Nom de salon trop court.", rooms_invalid_code: "Entrer un code valide.",
    share_label: "INVITATION RAPIDE (SMS / WhatsApp) :", share_btn: "📤 Partager le lien",
    copy_btn: "Copier 📋", link_copied: "Lien du salon copié dans le presse-papier !",
    players_in_room: "Joueurs dans le salon :", leave_room: "❌ Quitter le salon",
    create_modal_title: "✨ CRÉER UN SALON", create_modal_sub: "Personnalise ton salon privé :", create_btn: "Créer ⚡",
    no_rooms: "Aucun salon ouvert.", no_players: "Aucun joueur.",
    room_name_ph: "NOM DU SALON", room_pass_ph: "MOT DE PASSE (Optionnel)", room_code_ph: "CODE DU SALON",
    share_text: "Viens m'affronter sur Chiffre Blitz !",

    friends_title: "👥 Liste d'Amis", friends_btn: "👥 Amis", add_btn: "Ajouter",
    no_friends: "Aucun ami pour le moment.",
    friends_tab_requests: "Demandes", friends_tab_invites: "Invitations",
    friend_online: "En ligne", friend_offline: "Hors-ligne",
    friend_accept: "✅ Accepter", friend_pending: "⏳ En attente",
    friend_invite: "Inviter", friend_remove: "Supprimer", friend_cancel: "Annuler la demande",
    friend_sent_req: "Demande envoyée", friend_wants: "Veut être ton ami !",
    friend_received: "📥 REÇUES", friend_sent_label: "📤 ENVOYÉES",
    friend_no_requests: "Aucune demande en attente.", friend_no_invites: "Aucune invitation en attente.",
    friend_view_trophy: "Voir sa salle des trophées", friend_room_created: "📤 Salon créé et invitation envoyée !",
    friend_game_invite_from: "📩 Invitation de jeu de", friend_join_room: "Rejoindre le salon ⚡",
    friend_join: "Rejoindre ⚡", friend_room: "Salon :",
    friends_center_title: "👥 Centre d'Amis", friends_placeholder: "Pseudo exact...",

    /* ----- Boutique ----- */
    shop_title: "🛍️ BOUTIQUE",
    shop_tab_bonus: "🟢 Bonus (pour soi)", shop_tab_malus: "🔴 Malus (adversaire)",
    not_enough_coins: "Tu n'as pas assez de pièces 🪙 pour acheter cet objet !",

    /* ----- Classement ----- */
    lb_title: "👑 CLASSEMENT",
    lb_reg: "📍 Région", lb_nat: "🇫🇷 France", lb_glb: "🌍 Monde",
    lb_cat_points: "🏅 Points", lb_cat_trophies: "👑 Couronnes", lb_cat_coins: "🪙 Argent", lb_cat_combined: "⭐ Combiné",
    lb_combined_desc: "💡 Combiné : Couronnes prioritaires, départagées par les points",
    lb_regional_label: "Régional", lb_no_players: "Aucun joueur.",

    /* ----- Tournois ----- */
    tourney_screen_title: "🎯 Tournoi Blitz",
    tourney_teaser_title: "Bientôt disponible !",
    tourney_rewards: "Récompenses : 200 🪙 + 1 👑 + 50 ⭐",

    /* ----- Profil & Compte ----- */
    welcome_title: "⚡ IDENTITÉ BLITZ ⚡", welcome_sub: "Personnalise ton profil compétitif :",
    pseudo_label: "PSEUDO", avatar_num_label: "AVATAR (1-999)", flag_label: "DRAPEAU", region_label: "RÉGION",
    account_title: "⚙️ MON COMPTE", account_connected: "Connecté :",
    account_change: "🔑 Changer de compte", account_create: "➕ Créer un nouveau compte", account_delete: "🗑️ Supprimer mon compte",
    account_login_desc: "Entre ton pseudo + ton code secret.<br>Si le compte existe → connexion. Sinon → création.",
    account_pseudo_ph: "Pseudo", account_code_ph: "🔒 Code secret (4 min)", 
    account_login_btn: "🔑 Accéder à mon compte",
    account_create_btn: "✨ Créer mon compte",
    account_tab_login: "🔑 Se connecter",
    account_tab_create: "✨ Créer un compte",
    account_desc: "Entre ton pseudo + ton code secret. Si le compte existe → connexion. Sinon → création.",
    account_username_ph: "👤 Ton pseudo (3 caractères min)",
    account_secret_ph: "🔒 Ton code secret",
    account_secret_help: "8+ caractères avec : 1 MAJUSCULE, 1 minuscule, 1 chiffre et 1 caractère spécial (!@#$%&*+-_)",
    account_submit: "⚡ Accéder à mon compte",
    account_key_warning: "Crée ton compte puis CONSERVE précieusement ta clé de récupération : elle est indispensable pour changer ton code secret.",
    change_code_title: "🔑 CHANGER MON CODE SECRET",
    change_code_desc: "8+ caractères avec <b>lettres</b>, <b>chiffres</b> et <b>caractère spécial</b> (!@#$%&*+-_)",
    change_old_code_ph: "Ancien code secret", change_new_code_ph: "Nouveau code secret", change_confirm_code_ph: "Confirmer le nouveau code",
    change_code_success: "✅ Code secret changé avec succès !", change_code_old_wrong: "Ancien code incorrect.",
    change_code_mismatch: "Les nouveaux codes ne correspondent pas.",
    recovery_key_title: "🔐 TA CLÉ DE RÉCUPÉRATION",
    recovery_key_warning: "⚠️ À CONSERVER PRÉCIEUSEMENT !",
    recovery_key_desc: "Si tu perds ton code secret, donne-moi cette clé sur Discord/email pour prouver que c'est bien ton compte.",
    recovery_key_copy: "📋 Copier la clé", recovery_key_copied: "📋 Clé copiée !",
    recovery_key_prompt: "🔒 Entre ton code secret pour voir ta clé de récupération :",
    recovery_key_wrong: "❌ Code secret incorrect.",
    account_change_code: "🔑 Changer mon code secret",
    account_recovery_key: "🔐 Voir ma clé de récupération",
    change_code_validate: "Valider ⚡",
    change_code_reminder: "✅ N'oublie pas ton nouveau code !",
    
        /* ----- Tour ----- */
    tower_title: "🗼 TOUR BLITZ",
    tower_current_floor: "Étage actuel : ",
    tower_floor_won: "✅ ÉTAGE {floor} VAINCU !",
    tower_new_object: "Nouvel objet placé dans la pièce :",
    tower_chapter_done: "🎁 CHAPITRE TERMINÉ : {reward} débloqué !",
    tower_here: "▶ TU ES ICI",
    tower_guardian_awake: "⚠️ GARDIEN RÉVEILLÉ",
    tower_guardian_sleeping: "😴 {count}/9 objets",
    tower_challenge: "⚔️ DÉFIER",
    tower_play: "▶",
    tower_continue: "Continuer ⚡",
    tower_season_locked: "Saison S{season}",
    tower_chapter_1: "Quartier Néon",
    tower_chapter_2: "Grottes de Cristal",
    tower_chapter_3: "Circuit Doré",
    tower_chapter_4: "Tour Hantée",
    tower_chapter_5: "Cimetière Brumeux",
    tower_chapter_6: "Antre Citrouille",
    tower_chapter_7: "Cime Bonbon",
    tower_chapter_8: "Forêt de Sapins",
    tower_chapter_9: "Atelier du Père Noël",
    tower_type_classic: "⚡ Croissant",
    tower_type_reverse: "🔽 Décroissant",
    tower_type_random: "🎲 Chaos",
    tower_type_calc_plus: "🧮 Addition",
    tower_type_calc_minus: "🧮 Soustraction",
    tower_type_sprint: "⏱️ Sprint",
    tower_type_memory: "🙈 Mémoire",
    tower_type_fog: "🌫️ Brouillard",
    tower_type_nofail: "💎 Sans faute",
    tower_type_boss: "⚔️ GARDIEN",

    /* ----- Pass de saison ----- */
    pass_title: "🎫 PASSE DE SAISON",

    /* ----- HUD & Jeu ----- */
    get_ready: "PRÉPAREZ-VOUS !",
    hud_opp_target: "CIBLE ADVERSAIRE", hud_solo_score: "SCORE",
    timer_label: "Temps", target_label: "CIBLE : ",
    tow_title: "🪢 CORDE RAIDE (TUG-OF-WAR)",
    recap_my_target: "🎯 Ma Cible : ", recap_opp_target: "🎯 Cible Adversaire : ",
    recap_my_score: "⭐ Mon Score : ", recap_coins: "🪙 Pièces Gagnées : ",
    double_reward: "📺 Doubler mes gains (Pub)", main_menu: "MENU PRINCIPAL",
    triomphe: "TRIOMPHE !", equality: "ÉGALITÉ !", victory_supreme: "🏆 VICTOIRE SUPRÊME !",
    defeat_bitter: "💥 DÉFAITE AMÈRE...", equality_timeout: "⏱️ ÉGALITÉ !",
    reward_doubled: "✅ Gains doublés !", rush_bonus: "(RUSH)",

    /* ----- Combo ----- */
    combo_x15: "⚡ COMBO x15 !", combo_x30: "🔥 COMBO x30 !!", combo_perfection: "💥 PERFECTION x35 !!!",
    perfection_popup_text: "⚡ PERFECTION — Combo x35 atteint ! Récompense maximale + Succès ⭐ débloqué !",

    /* ----- Modes saisonniers (Catch) ----- */
    catch_how_to_play: "📖 COMMENT JOUER :",
    catch_solo_btn: "🏋️ Solo", catch_1v1_btn: "⚔️ Duel 1v1",
    catch_halloween_label: "🎃 CHASSE HANTÉE",
    catch_halloween_rules: "Clique les 🦇 <b style='color:#00ff88'>(+10)</b> ! Évite les 👻 <b style='color:#ff4b2b'>(−15)</b>. Citrouilles : la <b style='color:#00ff88'>SOURIANTE = +20 bonus</b>, l'<b style='color:#ff4b2b'>ÉNERVÉE = −20</b>. Le bonus (max 100🪙) n'est PAS doublé par le x2.",
    catch_noel_label: "🎄 HOTTE DU PÈRE NOËL",
    catch_noel_rules: "Attrape les 🎁 <b style='color:#00ff88'>(+10)</b> ! Évite les 🎄 <b style='color:#ff4b2b'>(−15)</b>. Lutins : le <b style='color:#00ff88'>SOURIANT = +20 bonus</b>, l'<b style='color:#ff4b2b'>ÉNERVÉ = −20</b>. Le bonus (max 100🪙) n'est PAS doublé par le x2.",
    catch_season_done: "🎯 MODE SAISONNIER TERMINÉ",
    catch_score_label: "Score :", catch_bonus_label: "Bonus :", catch_rush_x2: "(x2)",

    /* ----- Trophées ----- */
    trophy_room_btn: "SALLE DES TROPHÉES",
    trophy_unlocked_status: "✅ Débloqué", trophy_locked_status: "🔒 Verrouillé", trophy_progress_label: "Progrès :",
    trophy_title_unlocked: "Titre débloqué :", trophy_soon: "🔒 Bientôt", trophy_end_season: "Fin de saison",
    shelf_combat: "⚔️ COMBAT", shelf_skill: "💥 SKILL", shelf_progression: "📈 PROGRESSION", shelf_domination: "👑 DOMINATION",
    trophy_name_first_victory: "Première Victoire", trophy_cond_first_victory: "Gagner 1 match 1v1",
    trophy_name_unstoppable: "Inarrêtable", trophy_cond_unstoppable: "5 victoires d'affilée",
    trophy_name_gladiator: "Gladiateur", trophy_cond_gladiator: "Jouer 30 matchs 1v1",
    trophy_name_champion: "Champion", trophy_cond_champion: "Gagner un tournoi (bientôt !)",
    trophy_name_awakening: "Éveil", trophy_cond_awakening: "Combo x15",
    trophy_name_furnace: "Fournaise", trophy_cond_furnace: "Combo x30",
    trophy_name_perfection: "PERFECTION", trophy_cond_perfection: "Combo x35",
    trophy_name_avalanche_master: "Maître Avalanche", trophy_cond_avalanche_master: "Score 400 en Avalanche",
    trophy_name_combatant: "Combattant", trophy_cond_combatant: "Pass Palier 15",
    trophy_name_elite: "Élite", trophy_cond_elite: "Pass Palier 30",
    trophy_name_worker: "Travailleur", trophy_cond_worker: "1000 🪙 gagnés en jeu",
    trophy_name_rising_star: "Étoile Montante", trophy_cond_rising_star: "500 points au classement",
    trophy_name_local_king: "Roi Local", trophy_cond_local_king: "N°1 régional en fin de saison",
    trophy_name_midas: "Midas", trophy_cond_midas: "N°1 pièces en fin de saison",
    trophy_name_dynasty: "Dynastie", trophy_cond_dynasty: "3 saisons N°1",
    trophy_name_world_n1: "N°1 Mondial", trophy_cond_world_n1: "N°1 global fin de saison",

    /* ----- Badges ----- */
    badge_ranked: "⚔️ CLASSÉ", badge_tow: "🪢 CORDE RAIDE", badge_private: "👥 SALON PRIVÉ",
    badge_chaos: "🌪️ CHAOS MODE", badge_expresso: "⚡ EXPRESSO 20s", badge_1v1: "⚔️ 1v1 AMICAL",
    badge_solo_random: "🎲 SOLO ALÉATOIRE", badge_solo_classic: "🏋️ SOLO CLASSIQUE", badge_avalanche: "🏔️ AVALANCHE",

    /* ----- Actions ----- */
    action_friend_request: "🤝 Demande d'ami", action_trophy_room: "🏛️ Salle des trophées",

    /* ----- Jackpot ----- */
    jackpot_win: "JACKPOT ! +X Pièces 🪙", jackpot_item: "OBJET GAGNÉ ! ⚡",
    jackpot_lost: "PERDU ! X Pièces 🪙", jackpot_nothing: "RIEN ! Retente ta chance.",
    jackpot_coins_label: "Pièces",

    /* ----- Musique ----- */
    music_title: "🎵 BANDE SON",
    music_no_spoiler: "Seules les saisons déjà sorties sont proposées (pas de spoiler !).",
    music_auto: "Auto (saison en cours)", music_season_label: "Saison",

    /* ----- Pub ----- */
    ad_title: "Soutenir le Créateur",
    ad_desc: "Chiffre Blitz est gratuit à jouer (achats optionnels). Une publicité de soutien va se lancer. Merci ! ❤️",
    ad_btn: "Lancer la partie ⚡", ad_sponsored: "VIDÉO SPONSORISÉE...",
    support_title: "❤️ Soutenir le Créateur",
    support_desc: "Chiffre Blitz est un projet indépendant, gratuit à jouer (achats optionnels). Regarde une courte pub pour me soutenir, ou passe ton chemin après 5 s. ❤️",
    support_kofi: "☕ Ko-fi (don)",
    support_discord: "💬 Rejoindre Discord",
    support_skip: "Passer et jouer ⚡",
    support_watch: "📺 Regarder la pub (soutenir) ❤️",

       /* ----- Pouvoirs ----- */
    powers: {
      spotlight: { name: "💡 Projecteur", desc: "Révèle la bonne tuile pendant 2s. Zéro hésitation." },
      freeze: { name: "⏳ Blocage du Temps", desc: "Gèle le chrono 3s. Respire, tu as le temps." },
      joker: { name: "⚡ Joker Éclair", desc: "Valide instantanément ta cible actuelle." },
      nova: { name: "🌟 Nova Temporelle", desc: "GIGA : enchaîne 3 validations automatiques." },
      quake: { name: "📳 Séisme", desc: "Secoue la grille adverse pendant 2s." },
      micro: { name: "🐜 Micro-Tuiles", desc: "Rétrécit les tuiles adverses pendant 2s." },
      eclipse: { name: "🌑 Éclipse", desc: "Plonge la grille adverse dans le flou (1,5s)." },
      chaos: { name: "🌪️ Chaos Absolu", desc: "GIGA : séisme + micro + éclipse en chaîne (5s)." }
    },

    // === IAP REVENUECAT (achats réels) ===
    iap_unavailable: "Achats indisponibles sur le navigateur",
    iap_error: "Achat annulé ou en erreur",
    iap_success: "Achat confirmé ! Merci ⚡",
    iap_already: "Achat déjà traité",
    btn_buy_pass: "💳 Acheter le Passe Premium (3€)",
    btn_buy_pack_vies: "💳 Pack 10 vies (1€)",
    btn_buy_pack_mixte: "💳 Pack Mixte 5 vies + 2 jokers (3€)",
    btn_buy_pack_blitz: "💳 Pack Blitz 10 vies + 5 jokers (5€)"
  },

  /* ============================================================
  2. ENGLISH
  ============================================================ */
  en: {
    /* ----- General ----- */
    coins: "Coins", trophies: "Trophies", subtitle: "Spot. Click. Triumph.",
    btn_play: "PLAY ⚡", close: "Close", back: "⬅️ Back", back_menu: "⬅️ Back to Menu",
    loading: "Loading...", cancel: "❌ Cancel",

    /* ----- Rules ----- */
    rule1_title: "⚡ Game Rule",
    rule1_desc: "Spot the TARGET and click it at lightning speed! Ascending order or total chaos: only the fastest survives. ⚡",
    rule2_title: "🏋️ Solo Training",
    rule2_desc: "Classic, Random or Avalanche: chain numbers, beat your records and stack up coins (🪙).",
    rule3_title: "⚔️ Online 1v1 Duel",
    rule3_desc: "Face a player in real time (unranked, ranked SBMM or private room). Best score in 30s wins!",
    rule4_title: "👑 Ranks & Crowns",
    rule4_desc: "Climb ranked to earn crowns 👑 and unlock the 16 trophies 🏆 of your Trophy Room!",
    rule5_tile: "Coming soon! Earn unique crowns 👑.",
    tourney_teaser_desc: "In design and development... Tournaments will reward crowns 👑!",
    rule_tower_title: "🏰 Adventure Mode",
    rule_tower_desc: "Progress through 9 themed worlds: complete 200 levels per world, face Guardians every 50 levels, and unlock exclusive rewards!",
    

    /* ----- Main Menu ----- */
    menu_solo: "🏋️ TRAINING", menu_1v1: "⚔️ 1v1 DUEL", menu_tow: "🪢 Tug-of-War Mode",
    menu_friends: "👥 ROOMS", menu_shop: "🛍️ SHOP", menu_lb: "👑 LEADERBOARD",
    menu_tourney: "🎯 TOURNAMENTS", menu_info: "ℹ️ Info & Rules",
    menu_halloween: "🎃 Halloween Exclusive Mode", menu_noel: "🎄 Christmas Exclusive Mode",

    /* ----- Solo ----- */
    solo_menu_title: "TRAINING MODES",
    solo_classic: "⚡ Classic (Ascending)", solo_random: "🎲 Random (Varied targets)", solo_avalanche_btn: "🧊 Avalanche (Difficulties)",
    avalanche_menu_title: "🧊 Avalanche (Difficulties)",
    diff_easy: "Easy", diff_medium: "Medium", diff_hard: "Hard 💀",
    solo_training_done: "🏋️ TRAINING DONE", solo_score_label: "Score:",
    solo_perfection_banner: "💥 PERFECTION x35!", solo_perfection_reason: "PERFECTION! Max reward + Achievement ⭐",

    /* ----- 1v1 ----- */
    hub_title: "⚔️ ONLINE 1v1 DUEL", hub_subtitle: "Choose your game mode:",
    hub_random: "🎲 Unranked Matchmaking", hub_ranked: "⚔️ Ranked Matchmaking (SBMM)",
    ranked_modal_title: "⚔️ RANKED LOADOUT", ranked_modal_sub: "Choose 2 items from your inventory for the ranked match:",
    ranked_start_btn: "Start Ranked ⚡",
    ranked_empty: "Empty inventory!", ranked_summary: "Selected items: X/2", ranked_ready: "✅ Ready to launch",
    ranked_warning: "⚠️ You must select exactly 2 items", ranked_selected: "Selected:",
    ranked_add: "+ Add", ranked_remove: "- Remove", ranked_no_stock: "You don't have enough copies of this item.",
    ranked_must_2: "In ranked mode, you must select exactly 2 items.",
    searching: "Searching for opponent...", waiting_opponent: "Waiting for opponent...",
    opp_wants_rematch: "⚔️ Opponent wants a rematch!", malus_received: "💥 ENEMY TRAP RECEIVED!",
    rematch_btn: "Rematch ⚔️",

    /* ----- Rooms & Friends ----- */
    rooms_title: "👥 Play with Friends", rooms_create: "✨ Create Custom Room",
    rooms_join_code: "🔑 Join with Code", rooms_open_list: "Open rooms:",
    join_title: "🔑 Join a Room", join_subtitle: "Enter the code and password (if required):",
    room_code_label: "ROOM CODE", room_pass_label: "PASSWORD (Optional)", join_btn: "Join ⚡",
    room_header: "Room", rooms_join: "Join", rooms_room: "Room",
    rooms_name_short: "Room name too short.", rooms_invalid_code: "Enter a valid code.",
    share_label: "QUICK INVITE (SMS / WhatsApp):", share_btn: "📤 Share Link",
    copy_btn: "Copy 📋", link_copied: "Room link copied to clipboard!",
    players_in_room: "Players in room:", leave_room: "❌ Leave Room",
    create_modal_title: "✨ CREATE A ROOM", create_modal_sub: "Customize your private room:", create_btn: "Create ⚡",
    no_rooms: "No open rooms.", no_players: "No players.",
    room_name_ph: "ROOM NAME", room_pass_ph: "PASSWORD (Optional)", room_code_ph: "ROOM CODE",
    share_text: "Come face me on Chiffre Blitz!",

    friends_title: "👥 Friends List", friends_btn: "👥 Friends", add_btn: "Add",
    no_friends: "No friends yet.",
    friends_tab_requests: "Requests", friends_tab_invites: "Invites",
    friend_online: "Online", friend_offline: "Offline",
    friend_accept: "✅ Accept", friend_pending: "⏳ Pending",
    friend_invite: "Invite", friend_remove: "Remove", friend_cancel: "Cancel request",
    friend_sent_req: "Request sent", friend_wants: "Wants to be your friend!",
    friend_received: "📥 RECEIVED", friend_sent_label: "📤 SENT",
    friend_no_requests: "No pending requests.", friend_no_invites: "No pending invites.",
    friend_view_trophy: "View trophy room", friend_room_created: "📤 Room created and invite sent!",
    friend_game_invite_from: "📩 Game invite from", friend_join_room: "Join room ⚡",
    friend_join: "Join ⚡", friend_room: "Room:",
    friends_center_title: "👥 Friends Center", friends_placeholder: "Exact username...",

    /* ----- Shop ----- */
    shop_title: "🛍️ SHOP",
    shop_tab_bonus: "🟢 Bonus (self)", shop_tab_malus: "🔴 Malus (opponent)",
    not_enough_coins: "You don't have enough coins 🪙 to buy this item!",

    /* ----- Leaderboard ----- */
    lb_title: "👑 LEADERBOARD",
    lb_reg: "📍 Region", lb_nat: "🇫🇷 France", lb_glb: "🌍 World",
    lb_cat_points: "🏅 Points", lb_cat_trophies: "👑 Crowns", lb_cat_coins: "🪙 Money", lb_cat_combined: "⭐ Combined",
    lb_combined_desc: "💡 Combined: Crowns first, tied by points",
    lb_regional_label: "Regional", lb_no_players: "No players.",

    /* ----- Tournaments ----- */
    tourney_screen_title: "🎯 Blitz Tournament",
    tourney_teaser_title: "Coming soon!",
    tourney_rewards: "Rewards: 200 🪙 + 1 👑 + 50 ⭐",

    /* ----- Profile & Account ----- */
    welcome_title: "⚡ BLITZ IDENTITY ⚡", welcome_sub: "Customize your competitive profile:",
    pseudo_label: "USERNAME", avatar_num_label: "AVATAR (1-999)", flag_label: "FLAG", region_label: "REGION",
    account_title: "⚙️ MY ACCOUNT", account_connected: "Connected:",
    account_change: "🔑 Switch account", account_create: "➕ Create a new account", account_delete: "🗑️ Delete my account",
    account_login_desc: "Enter your username + secret code.<br>If the account exists → login. Else → creation.",
    account_pseudo_ph: "Username", account_code_ph: "🔒 Secret code (4 min)", 
    account_login_btn: "🔑 Access my account",
    account_create_btn: "✨ Create my account",
    account_tab_login: "🔑 Sign in",
    account_tab_create: "✨ Create account",
    account_desc: "Enter your username + secret code. Account exists → login. Otherwise → creation.",
    account_username_ph: "👤 Your username (min 3 chars)",
    account_secret_ph: "🔒 Your secret code",
    account_secret_help: "8+ chars with: 1 UPPERCASE, 1 lowercase, 1 digit and 1 special char (!@#$%&*+-_)",
    account_submit: "⚡ Access my account",
    account_key_warning: "Create your account then KEEP your recovery key safe: it is required to change your secret code.",
    change_code_title: "🔑 CHANGE MY SECRET CODE",
    change_code_desc: "8+ characters with <b>letters</b>, <b>digits</b> and <b>special character</b> (!@#$%&*+-_)",
    change_old_code_ph: "Old secret code", change_new_code_ph: "New secret code", change_confirm_code_ph: "Confirm new code",
    change_code_success: "✅ Secret code changed successfully!", change_code_old_wrong: "Old code incorrect.",
    change_code_mismatch: "New codes don't match.",
    recovery_key_title: "🔐 YOUR RECOVERY KEY",
    recovery_key_warning: "⚠️ KEEP IT SAFE!",
    recovery_key_desc: "If you lose your secret code, give me this key on Discord/email to prove it's your account.",
    recovery_key_copy: "📋 Copy key", recovery_key_copied: "📋 Key copied!",
    recovery_key_prompt: "🔒 Enter your secret code to see your recovery key:",
    recovery_key_wrong: "❌ Secret code incorrect.",
    account_change_code: "🔑 Change my secret code",
    account_recovery_key: "🔐 View my recovery key",
    change_code_validate: "Confirm ⚡",
    change_code_reminder: "✅ Don't forget your new code!",

    /* ----- Tower ----- */
    tower_title: "🗼 BLITZ TOWER",
    tower_current_floor: "Current floor: ",
    tower_floor_won: "✅ FLOOR {floor} CLEARED!",
    tower_new_object: "New object placed in the room:",
    tower_chapter_done: "🎁 CHAPTER COMPLETE: {reward} unlocked!",
    tower_here: "▶ YOU ARE HERE",
    tower_guardian_awake: "⚠️ GUARDIAN AWAKE",
    tower_guardian_sleeping: "😴 {count}/9 objects",
    tower_challenge: "⚔️ CHALLENGE",
    tower_play: "▶",
    tower_continue: "Continue ⚡",
    tower_season_locked: "Season S{season}",
    tower_chapter_1: "Neon District",
    tower_chapter_2: "Crystal Caves",
    tower_chapter_3: "Golden Circuit",
    tower_chapter_4: "Haunted Tower",
    tower_chapter_5: "Misty Cemetery",
    tower_chapter_6: "Pumpkin Lair",
    tower_chapter_7: "Candy Summit",
    tower_chapter_8: "Pine Forest",
    tower_chapter_9: "Santa's Workshop",
    tower_type_classic: "⚡ Ascending",
    tower_type_reverse: "🔽 Descending",
    tower_type_random: "🎲 Chaos",
    tower_type_calc_plus: "🧮 Addition",
    tower_type_calc_minus: "🧮 Subtraction",
    tower_type_sprint: "⏱️ Sprint",
    tower_type_memory: "🙈 Memory",
    tower_type_fog: "🌫️ Fog",
    tower_type_nofail: "💎 No mistake",
    tower_type_boss: "⚔️ GUARDIAN",

    /* ----- Season Pass ----- */
    pass_title: "🎫 SEASON PASS",

    /* ----- HUD & Game ----- */
    get_ready: "GET READY!",
    hud_opp_target: "OPPONENT TARGET", hud_solo_score: "SCORE",
    timer_label: "Time", target_label: "TARGET: ",
    tow_title: "🪢 TUG-OF-WAR",
    recap_my_target: "🎯 My Target: ", recap_opp_target: "🎯 Opponent Target: ",
    recap_my_score: "⭐ My Score: ", recap_coins: "🪙 Coins Earned: ",
    double_reward: "📺 Double my rewards (Ad)", main_menu: "MAIN MENU",
    triomphe: "TRIUMPH!", equality: "DRAW!", victory_supreme: "🏆 SUPREME VICTORY!",
    defeat_bitter: "💥 BITTER DEFEAT...", equality_timeout: "⏱️ DRAW!",
    reward_doubled: "✅ Rewards doubled!", rush_bonus: "(RUSH)",

    /* ----- Combo ----- */
    combo_x15: "⚡ COMBO x15!", combo_x30: "🔥 COMBO x30!!", combo_perfection: "💥 PERFECTION x35!!!",
    perfection_popup_text: "⚡ PERFECTION — Combo x35 reached! Max reward + Achievement ⭐ unlocked!",

    /* ----- Seasonal Modes (Catch) ----- */
    catch_how_to_play: "📖 HOW TO PLAY:",
    catch_solo_btn: "🏋️ Solo", catch_1v1_btn: "⚔️ 1v1 Duel",
    catch_halloween_label: "🎃 HAUNTED HUNT",
    catch_halloween_rules: "Click 🦇 <b style='color:#00ff88'>(+10)</b>! Avoid 👻 <b style='color:#ff4b2b'>(−15)</b>. Pumpkins: <b style='color:#00ff88'>SMILING = +20 bonus</b>, <b style='color:#ff4b2b'>ANGRY = −20</b>. Bonus (max 100🪙) is NOT doubled by x2.",
    catch_noel_label: "🎄 SANTA'S SACK",
    catch_noel_rules: "Catch 🎁 <b style='color:#00ff88'>(+10)</b>! Avoid 🎄 <b style='color:#ff4b2b'>(−15)</b>. Elves: <b style='color:#00ff88'>SMILING = +20 bonus</b>, <b style='color:#ff4b2b'>ANGRY = −20</b>. Bonus (max 100🪙) is NOT doubled by x2.",
    catch_season_done: "🎯 SEASONAL MODE DONE",
    catch_score_label: "Score:", catch_bonus_label: "Bonus:", catch_rush_x2: "(x2)",

    /* ----- Trophies ----- */
    trophy_room_btn: "TROPHY ROOM",
    trophy_unlocked_status: "✅ Unlocked", trophy_locked_status: "🔒 Locked", trophy_progress_label: "Progress:",
    trophy_title_unlocked: "Title unlocked:", trophy_soon: "🔒 Soon", trophy_end_season: "End of season",
    shelf_combat: "⚔️ COMBAT", shelf_skill: "💥 SKILL", shelf_progression: "📈 PROGRESSION", shelf_domination: "👑 DOMINATION",
    trophy_name_first_victory: "First Victory", trophy_cond_first_victory: "Win 1 1v1 match",
    trophy_name_unstoppable: "Unstoppable", trophy_cond_unstoppable: "5 wins in a row",
    trophy_name_gladiator: "Gladiator", trophy_cond_gladiator: "Play 30 1v1 matches",
    trophy_name_champion: "Champion", trophy_cond_champion: "Win a tournament (soon!)",
    trophy_name_awakening: "Awakening", trophy_cond_awakening: "Combo x15",
    trophy_name_furnace: "Furnace", trophy_cond_furnace: "Combo x30",
    trophy_name_perfection: "PERFECTION", trophy_cond_perfection: "Combo x35",
    trophy_name_avalanche_master: "Avalanche Master", trophy_cond_avalanche_master: "Score 400 in Avalanche",
    trophy_name_combatant: "Combatant", trophy_cond_combatant: "Pass Tier 15",
    trophy_name_elite: "Elite", trophy_cond_elite: "Pass Tier 30",
    trophy_name_worker: "Worker", trophy_cond_worker: "1000 🪙 earned in game",
    trophy_name_rising_star: "Rising Star", trophy_cond_rising_star: "500 leaderboard points",
    trophy_name_local_king: "Local King", trophy_cond_local_king: "Regional #1 at season end",
    trophy_name_midas: "Midas", trophy_cond_midas: "#1 coins at season end",
    trophy_name_dynasty: "Dynasty", trophy_cond_dynasty: "3 seasons #1",
    trophy_name_world_n1: "World #1", trophy_cond_world_n1: "Global #1 at season end",

    /* ----- Badges ----- */
    badge_ranked: "⚔️ RANKED", badge_tow: "🪢 TUG-OF-WAR", badge_private: "👥 PRIVATE ROOM",
    badge_chaos: "🌪️ CHAOS MODE", badge_expresso: "⚡ EXPRESSO 20s", badge_1v1: "⚔️ 1v1 FRIENDLY",
    badge_solo_random: "🎲 SOLO RANDOM", badge_solo_classic: "🏋️ SOLO CLASSIC", badge_avalanche: "🏔️ AVALANCHE",

    /* ----- Actions ----- */
    action_friend_request: "🤝 Friend request", action_trophy_room: "🏛️ Trophy room",

    /* ----- Jackpot ----- */
    jackpot_win: "JACKPOT! +X Coins 🪙", jackpot_item: "ITEM WON! ⚡",
    jackpot_lost: "LOST! X Coins 🪙", jackpot_nothing: "NOTHING! Try again.",
    jackpot_coins_label: "Coins",

    /* ----- Music ----- */
    music_title: "🎵 SOUNDTRACK",
    music_no_spoiler: "Only released seasons are available (no spoilers!).",
    music_auto: "Auto (current season)", music_season_label: "Season",

    /* ----- Ads ----- */
    ad_title: "Support the Creator",
    ad_desc: "Chiffre Blitz is free to play (optional purchases). A support ad will play. Thank you! ❤️",
    ad_btn: "Start Game ⚡", ad_sponsored: "SPONSORED VIDEO...",
    support_title: "❤️ Support the Creator",
    support_desc: "Chiffre Blitz is an indie project, free to play (optional purchases). Watch a short ad to support me, or skip after 5 s. ❤️",
    support_kofi: "☕ Ko-fi (donate)",
    support_discord: "💬 Join Discord",
    support_skip: "Skip and play ⚡",
    support_watch: "📺 Watch the ad (support) ❤️",

        /* ----- Powers ----- */
    powers: {
      spotlight: { name: "💡 Spotlight", desc: "Reveals the correct tile for 2s. Zero hesitation." },
      freeze: { name: "⏳ Time Freeze", desc: "Freezes the timer for 3s. Breathe, you've got time." },
      joker: { name: "⚡ Lightning Joker", desc: "Instantly validates your current target." },
      nova: { name: "🌟 Time Nova", desc: "GIGA: chains 3 auto-validations." },
      quake: { name: "📳 Earthquake", desc: "Shakes the opponent's grid for 2s." },
      micro: { name: "🐜 Micro-Tiles", desc: "Shrinks the opponent's tiles for 2s." },
      eclipse: { name: "🌑 Eclipse", desc: "Blurs the opponent's grid (1.5s)." },
      chaos: { name: "🌪️ Absolute Chaos", desc: "GIGA: quake + micro + eclipse chained (5s)." }
    },

    // === IAP REVENUECAT (real purchases) ===
    iap_unavailable: "Purchases unavailable in browser",
    iap_error: "Purchase cancelled or failed",
    iap_success: "Purchase confirmed! Thank you ⚡",
    iap_already: "Purchase already processed",
    btn_buy_pass: "💳 Buy Premium Pass (€3)",
    btn_buy_pack_vies: "💳 10 lives pack (€1)",
    btn_buy_pack_mixte: "💳 Mixed pack 5 lives + 2 jokers (€3)",
    btn_buy_pack_blitz: "💳 Blitz pack 10 lives + 5 jokers (€5)"
  }
};

/* ============================================================
3. DÉTECTION & BASCULE DE LANGUE
============================================================ */
function detectLanguage() {
  const saved = localStorage.getItem("cb_lang");
  if (saved) return saved;
  const nav = (navigator.language || navigator.userLanguage || "fr").toLowerCase();
  return nav.startsWith("fr") ? "fr" : "en";
}

let currentLang = detectLanguage();

function toggleLanguage() {
  currentLang = (currentLang === "fr") ? "en" : "fr";
  localStorage.setItem("cb_lang", currentLang);
  applyTranslations();
  if (typeof switchShopTab === "function" && document.getElementById("modal-shop").style.display === "flex") switchShopTab(currentShopTab);
  if (typeof renderRankedLoadoutItems === "function" && document.getElementById("modal-ranked-loadout").style.display === "flex") renderRankedLoadoutItems();
  if (typeof renderBlitzPass === "function" && document.getElementById("modal-blitz-pass").style.display === "flex") renderBlitzPass();
  if (typeof updateCombinedExplanationVisibility === "function") updateCombinedExplanationVisibility();
}

function applyTranslations() {
  const d = i18n[currentLang];
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (d[key]) el.innerText = d[key];
  });

  // Éléments sans data-i18n (IDs spécifiques)
  const byId = {
    "lb-cat-points": d.lb_cat_points,
    "lb-cat-trophies": d.lb_cat_trophies,
    "lb-cat-coins": d.lb_cat_coins,
    "lb-cat-combined": d.lb_cat_combined,
    "friend-tab-all": d.friends_btn
  };
  for (const id in byId) {
    const el = document.getElementById(id);
    if (el) el.innerText = byId[id];
  }

  // Éléments sans data-i18n (sélecteurs CSS)
  const friendsTitle = document.querySelector("#modal-friends h2");
  if (friendsTitle) friendsTitle.innerText = d.friends_center_title;

  const addInput = document.getElementById("input-add-friend");
  if (addInput) addInput.placeholder = d.friends_placeholder;

  const trophyLabel = document.querySelector(".trophy-room-label");
  if (trophyLabel) trophyLabel.innerText = d.trophy_room_btn;

  const passTitle = document.querySelector("#modal-blitz-pass h2");
  if (passTitle) passTitle.innerText = d.pass_title;

  const passClose = document.querySelector("#modal-blitz-pass .btn-secondary");
  if (passClose) passClose.innerText = d.close;

  const rn = document.getElementById("custom-room-name");
  if (rn) rn.placeholder = d.room_name_ph;

  const rp = document.getElementById("custom-room-pass");
  if (rp) rp.placeholder = d.room_pass_ph;

  const jc = document.getElementById("join-room-code-input");
  if (jc) jc.placeholder = d.room_code_ph;

  const jp = document.getElementById("join-room-pass-input");
  if (jp) jp.placeholder = d.room_pass_ph;

  const langBtn = document.getElementById("lang-btn");
  if (langBtn) langBtn.innerText = (currentLang === "fr") ? "ENG" : "FR";
}
