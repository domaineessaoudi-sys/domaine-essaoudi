import type { Language } from '../types';

export interface Translations {
  nav: {
    home: string;
    vegetables: string;
    oliveOil: string;
    poultry: string;
    about: string;
    contact: string;
    admin: string;
    cart: string;
  };
  common: {
    addToCart: string;
    added: string;
    outOfStock: string;
    inStock: string;
    unitsLeft: string;
    viewDetails: string;
    orderWhatsapp: string;
    exploreCatalog: string;
    allCategories: string;
    backToCatalog: string;
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    close: string;
    submit: string;
    moroccoCurrency: string;
    pickupLabel: string;
    deliveryLabel: string;
    bestseller: string;
    originChaouia: string;
    farmPrice: string;
    codAvailable: string;
  };
  home: {
    heroOrigin: string;
    heroTitle: string;
    heroHighlight: string;
    heroSubtitle: string;
    heroPrimaryCta: string;
    heroSecondaryCta: string;
    heroOverlayTitle: string;
    heroOverlaySub: string;
    statsClientsVal: string;
    statsClientsLabel: string;
    statsProductsLabel: string;
    statsOrganicVal: string;
    statsOrganicLabel: string;
    searchPlaceholder: string;
    filterAll: string;
    catalogKicker: string;
    catalogTitle: string;
    catalogSubtitle: string;
    catalogCountLabel: string;
    catalogEmpty: string;
    pillarsTitle: string;
    pillarsSubtitle: string;
    pillarVegDesc: string;
    pillarOilDesc: string;
    pillarPoultryDesc: string;
    philosophyKicker: string;
    philosophyTitle: string;
    philosophyLead: string;
    philosophyPoints: Array<{ title: string; body: string }>;
    philosophyTrust1: string;
    philosophyTrust2: string;
    featuredTitle: string;
    featuredSubtitle: string;
    whyTitle: string;
    whyMetrics: Array<{ value: string; label: string; detail: string }>;
    testimonialsTitle: string;
    ctaKicker: string;
    ctaBannerTitle: string;
    ctaBannerBody: string;
    ctaContactBtn: string;
  };
  vegetables: {
    title: string;
    subtitle: string;
    all: string;
    tomatoes: string;
    potatoes: string;
    onions: string;
    carrots: string;
    peppers: string;
    seasonal: string;
    empty: string;
  };
  oliveOil: {
    title: string;
    subtitle: string;
    processTitle: string;
    processSteps: Array<{ step: string; title: string; desc: string }>;
    formatsTitle: string;
    acidityNote: string;
  };
  poultry: {
    title: string;
    subtitle: string;
    practicesTitle: string;
    practices: Array<{ title: string; desc: string }>;
    productsTitle: string;
    requestNote: string;
  };
  productDetail: {
    harvestNotes: string;
    selectOption: string;
    selectLiters: string;
    liters: string;
    kilo: string;
    quantity: string;
    availability: string;
    deliveryInfo: string;
  };
  about: {
    title: string;
    subtitle: string;
    storyTitle: string;
    storyP1: string;
    storyP2: string;
    valuesTitle: string;
    values: Array<{ title: string; desc: string }>;
    methodsTitle: string;
    methodsBody: string;
  };
  contact: {
    title: string;
    subtitle: string;
    directTitle: string;
    phoneLabel: string;
    whatsappLabel: string;
    emailLabel: string;
    addressLabel: string;
    hoursLabel: string;
    formTitle: string;
    nameField: string;
    phoneField: string;
    emailField: string;
    subjectField: string;
    messageField: string;
    sendMessage: string;
    sentSuccess: string;
    mapTitle: string;
    openGoogleMaps: string;
  };
  cart: {
    title: string;
    emptyTitle: string;
    emptyBody: string;
    subtotal: string;
    deliveryFee: string;
    freeDelivery: string;
    freeDeliveryHint: string;
    total: string;
    checkoutTitle: string;
    deliveryZone: string;
    fullName: string;
    phone: string;
    emailOptional: string;
    city: string;
    address: string;
    notes: string;
    placeOrder: string;
    submitting: string;
    orderConfirmed: string;
    orderNumber: string;
    confirmWhatsapp: string;
    confirmEmail: string;
    emailDispatched: string;
    emailActivationPending: string;
    emailSavedPending: string;
    newOrder: string;
  };
  admin: {
    title: string;
    claimTitle: string;
    claimSubtitle: string;
    loginTitle: string;
    loginSubtitle: string;
    passwordLabel: string;
    claimBtn: string;
    loginBtn: string;
    logoutBtn: string;
    tabs: {
      overview: string;
      products: string;
      orders: string;
      content: string;
      sql: string;
    };
    kpis: {
      totalProducts: string;
      totalOrders: string;
      pendingOrders: string;
      completedOrders: string;
      revenue: string;
      unreadMessages: string;
    };
    addProduct: string;
    editProduct: string;
    uploadImage: string;
    uploading: string;
  };
  footer: {
    tagline: string;
    navigation: string;
    contact: string;
    adminPortal: string;
    copyright: string;
  };
}

export const TRANSLATIONS: Record<Language, Translations> = {
  fr: {
    nav: {
      home: 'Accueil',
      vegetables: 'Légumes',
      oliveOil: "Huile d'Olive",
      poultry: 'Poulet Beldi',
      about: 'À Propos',
      contact: 'Contact',
      admin: 'Administration',
      cart: 'Panier',
    },
    common: {
      addToCart: 'Ajouter au panier',
      added: 'Ajouté au panier',
      outOfStock: 'Rupture temporaire',
      inStock: 'En stock',
      unitsLeft: 'disponibles',
      viewDetails: 'Voir le produit',
      orderWhatsapp: 'Commander par WhatsApp',
      exploreCatalog: 'Découvrir nos récoltes',
      allCategories: 'Tous les produits',
      backToCatalog: 'Retour au catalogue',
      loading: 'Chargement…',
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      close: 'Fermer',
      submit: 'Envoyer',
      moroccoCurrency: 'DH',
      pickupLabel: 'Retrait à la ferme (Gratuit)',
      deliveryLabel: 'Livraison à domicile',
      bestseller: 'Très demandé',
      originChaouia: 'Chaouia · Bio',
      farmPrice: 'Prix ferme',
      codAvailable: 'Paiement à la livraison',
    },
    home: {
      heroOrigin: 'Ferme Familiale Chaouia · Agriculture Naturelle',
      heroTitle: 'La terre marocaine,',
      heroHighlight: 'cultivée pas à pas.',
      heroSubtitle:
        'Légumes bio cueillis à l’aube, huile d’olive Beldi pressée à froid et poulet fermier élevé en plein air — en direct de notre domaine à Berrechid.',
      heroPrimaryCta: 'Découvrir nos produits',
      heroSecondaryCta: 'Comment nous cultivons',
      heroOverlayTitle: 'Récolte fraîche du matin',
      heroOverlaySub: 'Livraison Chaouia, Casa & tout le Maroc',
      statsClientsVal: 'Chaouia',
      statsClientsLabel: 'Berrechid · Terroir',
      statsProductsLabel: 'Produits du terroir',
      statsOrganicVal: '100%',
      statsOrganicLabel: 'Naturel & Beldi',
      searchPlaceholder: 'Que souhaitez-vous commander aujourd’hui ?',
      filterAll: 'Tous',
      catalogKicker: 'Sélections de notre terre',
      catalogTitle: 'Choisissez les récoltes adaptées à votre table',
      catalogSubtitle: 'Consultez les formats, la disponibilité en direct et commandez en un clic.',
      catalogCountLabel: 'produits',
      catalogEmpty: 'Aucun produit ne correspond à votre recherche.',
      pillarsTitle: 'Trois savoir-faire de notre terre',
      pillarsSubtitle:
        'Chaque production suit le rythme des saisons marocaines, sans raccourcis industriels ni conservateurs.',
      pillarVegDesc:
        'Tomates Beldi, pommes de terre rouge, oignons doux, carottes fanes et paniers récoltés à l’aube.',
      pillarOilDesc:
        'Huile monovariétale 100% olives Haouzia (الحوزية), première pression à froid, disponible de 1 L à 10 L selon vos besoins.',
      pillarPoultryDesc:
        'Volailles traditionnelles élevées en plein air sous les oliviers, nourries exclusivement aux céréales naturelles.',
      philosophyKicker: 'Une expérience agricole complète',
      philosophyTitle: 'Bien plus que des produits… un lien sincère avec la terre',
      philosophyLead:
        'Au Domaine Essaoudi, la fertilité du sol et le respect du temps naturel priment sur le rendement intensif.',
      philosophyPoints: [
        {
          title: 'Irrigation raisonnée & sols vivants',
          body: 'Nos parcelles maraîchères sont enrichies au compost organique maison et irriguées par goutte-à-goutte depuis nos puits.',
        },
        {
          title: 'Trituration à froid sous 6 heures',
          body: 'Les olives cueillies à la main rejoignent le moulin le jour même pour préserver polyphénols et arômes fruités.',
        },
        {
          title: 'Élevage extensif sous oliviers',
          body: 'Nos poulets Beldi parcourent librement nos vergers pendant 140 jours minimum, sans antibiotiques ni hormones.',
        },
      ],
      philosophyTrust1: 'Cueillette matinale et colis préparés le jour même',
      philosophyTrust2: 'Accompagnement direct WhatsApp & paiement à la livraison',
      featuredTitle: 'Récoltes & sélections du moment',
      featuredSubtitle: 'Produits disponibles dès aujourd’hui en direct de la ferme.',
      whyTitle: 'Pourquoi choisir le Domaine Essaoudi',
      whyMetrics: [
        {
          value: '< 0,35%',
          label: 'Acidité moyenne',
          detail: 'Huile vierge extra analysée à chaque lot',
        },
        {
          value: '140 j',
          label: 'Élevage plein air',
          detail: 'Durée minimale pour nos poulets Beldi',
        },
        {
          value: '06h30',
          label: 'Cueillette matinale',
          detail: 'Légumes récoltés le matin de votre livraison',
        },
        {
          value: '100%',
          label: 'Circuit direct ferme',
          detail: 'Zéro intermédiaire entre Chaouia et votre table',
        },
      ],
      testimonialsTitle: 'La confiance des cuisines et familles marocaines',
      ctaKicker: 'Le bon goût commence à la source',
      ctaBannerTitle: 'Passez à une alimentation saine et authentique',
      ctaBannerBody:
        'Notre équipe prépare vos colis chaque matin et répond directement sur WhatsApp pour Casablanca, Rabat, Marrakech et tout le Maroc.',
      ctaContactBtn: 'Écrivez-nous sur WhatsApp',
    },
    vegetables: {
      title: 'Légumes Frais de Saison',
      subtitle:
        'Cultivés en pleine terre dans la plaine de la Chaouia, récoltés à maturité et livrés sans chambre froide prolongée.',
      all: 'Tous',
      tomatoes: 'Tomates',
      potatoes: 'Pommes de terre',
      onions: 'Oignons',
      carrots: 'Carottes',
      peppers: 'Poivrons',
      seasonal: 'Paniers & Saison',
      empty: 'Aucun légume disponible dans cette catégorie pour le moment.',
    },
    oliveOil: {
      title: "Huile d'Olive Beldi Haouzia Vierge Extra",
      subtitle:
        'Culture monovariétale exclusive : 100% olives Haouzia (الحوزية) cueillies à la main sur nos parcelles de Chaouia et pressées à froid.',
      processTitle: 'De l’olivier Haouzia à la bouteille : nos 4 étapes',
      processSteps: [
        {
          step: '01',
          title: 'Cueillette manuelle précoce',
          desc: 'Récolte à la main de nos olives Haouzia en caisses aérées dès la véraison pour capturer la richesse aromatique.',
        },
        {
          step: '02',
          title: 'Lavage à l’eau claire & broyage',
          desc: 'Effeuillage et lavage minutieux dans les 4 heures suivant la récolte afin d’éviter toute fermentation.',
        },
        {
          step: '03',
          title: 'Extraction à froid (23°C)',
          desc: 'Pressage mécanique à basse température préservant vitamines, polyphénols et fruité vert caractéristique de la Haouzia.',
        },
        {
          step: '04',
          title: 'Décantation naturelle & mise en verre',
          desc: 'Repos en cuves inox et conditionnement en bouteilles teintées anti-UV ou bidons alimentaires.',
        },
      ],
      formatsTitle: 'Choisissez le volume en litres — 100% Haouzia (الحوزية)',
      acidityNote: 'Variété unique Haouzia (الحوزية) · Récolte non coupée · Acidité < 0,35%',
    },
    poultry: {
      title: 'Poulet Beldi Élevé en Plein Air',
      subtitle:
        'Une race marocaine rustique élevée librement sous nos oliviers, nourrie aux grains entiers et herbes fraîches.',
      practicesTitle: 'Nos pratiques d’élevage naturel',
      practices: [
        {
          title: 'Parcours arboré sous oliviers',
          desc: 'Nos volailles profitent chaque jour d’un vaste parcours enherbé à l’ombre des oliviers, favorisant une chair ferme et savoureuse.',
        },
        {
          title: 'Alimentation 100% végétale & céréalière',
          desc: 'Maïs concassé, orge locale, son de blé, luzerne verte et restes de légumes bio du domaine.',
        },
        {
          title: 'Préparation Halal à la commande',
          desc: 'Chaque volaille est préparée le matin même de l’expédition pour garantir une fraîcheur irréprochable.',
        },
      ],
      productsTitle: 'Choisissez la quantité en kilo — Poulet Beldi Plein Air',
      requestNote:
        'Vous souhaitez réserver pour une réception, un couscous ou une livraison hebdomadaire ? Ajoutez au panier ou envoyez votre demande via WhatsApp.',
    },
    productDetail: {
      harvestNotes: 'Notes de récolte & conservation',
      selectOption: 'Choisir le format',
      selectLiters: 'Combien de litres (L) ?',
      liters: 'Litres',
      kilo: 'Kilo',
      quantity: 'Quantité',
      availability: 'Disponibilité',
      deliveryInfo: 'Paiement à la livraison (Cash on Delivery) disponible partout au Maroc.',
    },
    about: {
      title: 'À Propos du Domaine Essaoudi',
      subtitle:
        'Une exploitation agricole familiale enracinée dans la Chaouia, dédiée aux saveurs vraies du terroir marocain.',
      storyTitle: 'Notre histoire & notre terroir',
      storyP1:
        'Installé à Douar Ouled Ziane sur la route de Berrechid, le Domaine Essaoudi réunit trois métiers complémentaires de la ferme marocaine traditionnelle : le maraîchage de saison en pleine terre, l’oléiculture Beldi et l’aviculture fermière en liberté.',
      storyP2:
        'Convaincus qu’une terre respectée nourrit mieux, nous avons banni les engrais chimiques agressifs et l’élevage intensif. Les résidus de taille d’oliviers et le fumier de nos parcours avicoles nourrissent naturellement nos planches de légumes.',
      valuesTitle: 'Nos engagements fondamentaux',
      values: [
        {
          title: 'Transparence de la parcelle',
          desc: 'Chaque bouteille d’huile et chaque panier portent la date de récolte et l’origine exacte sur le domaine.',
        },
        {
          title: 'Respect du bien-être animal',
          desc: 'Croissance lente naturelle sur 140 jours minimum, grand air et alimentation sans additifs.',
        },
        {
          title: 'Juste rémunération agricole',
          desc: 'La vente directe soutient le travail quotidien de nos maraîchers, cueilleurs et artisans oléicoles.',
        },
      ],
      methodsTitle: 'Économie circulaire à la ferme',
      methodsBody:
        'À Domaine Essaoudi, rien ne se perd : les grignons d’olive enrichissent le compost, nos poules nettoient naturellement les parcelles après récolte, et l’eau d’irrigation est gérée au plus près des besoins des plantes.',
    },
    contact: {
      title: 'Contacter le Domaine Essaoudi',
      subtitle:
        'Commandes directes, livraisons restaurants, visites du domaine ou demandes sur mesure.',
      directTitle: 'Coordonnées directes',
      phoneLabel: 'Téléphone',
      whatsappLabel: 'WhatsApp direct',
      emailLabel: 'E-mail',
      addressLabel: 'Adresse de la ferme',
      hoursLabel: 'Horaires',
      formTitle: 'Envoyer un message au domaine',
      nameField: 'Nom complet',
      phoneField: 'Téléphone (+212...)',
      emailField: 'E-mail (optionnel)',
      subjectField: 'Objet',
      messageField: 'Votre message',
      sendMessage: 'Envoyer le message',
      sentSuccess: 'Merci ! Votre message a bien été transmis à l’équipe du domaine.',
      mapTitle: 'Localisation du domaine sur Google Maps',
      openGoogleMaps: 'Itinéraire sur Google Maps',
    },
    cart: {
      title: 'Votre Panier Fermier',
      emptyTitle: 'Votre panier est vide',
      emptyBody: 'Ajoutez des légumes frais, de l’huile d’olive Beldi ou du poulet fermier pour commencer.',
      subtotal: 'Sous-total',
      deliveryFee: 'Livraison',
      freeDelivery: 'Offerte',
      freeDeliveryHint: 'Plus que {amount} pour la livraison offerte dans cette zone.',
      total: 'Total à payer',
      checkoutTitle: 'Finaliser la commande',
      deliveryZone: 'Zone de livraison au Maroc',
      fullName: 'Nom complet',
      phone: 'Téléphone (+212 6XX XX XX XX)',
      emailOptional: 'E-mail (optionnel)',
      city: 'Ville',
      address: 'Adresse complète de livraison',
      notes: 'Instructions (créneau horaire, découpe…)',
      placeOrder: 'Confirmer la commande',
      submitting: 'Validation en cours…',
      orderConfirmed: 'Commande confirmée !',
      orderNumber: 'Référence de commande',
      confirmWhatsapp: 'Envoyer le récapitulatif sur WhatsApp',
      confirmEmail: 'Envoyer la commande par email',
      emailDispatched: 'Les détails de votre commande ont été envoyés à {email}.',
      emailActivationPending:
        'Un lien d’activation vient d’être envoyé à {email} (vérifiez boîte de réception / spam pour activer la réception directe).',
      emailSavedPending: 'Commande enregistrée pour {email}.',
      newOrder: 'Continuer vos achats',
    },
    admin: {
      title: 'Espace Administration — Domaine Essaoudi',
      claimTitle: 'Configuration initiale du mot de passe administrateur',
      claimSubtitle:
        'Aucun mot de passe administrateur n’est encore défini. Choisissez votre mot de passe pour sécuriser le tableau de bord.',
      loginTitle: 'Connexion Administrateur',
      loginSubtitle: 'Accédez à la gestion des produits, stocks, commandes et contenus.',
      passwordLabel: 'Mot de passe administrateur',
      claimBtn: 'Activer l’accès administrateur',
      loginBtn: 'Se connecter',
      logoutBtn: 'Déconnexion',
      tabs: {
        overview: 'Vue d’ensemble',
        products: 'Produits & Stocks',
        orders: 'Commandes',
        content: 'Contenu & Messages',
        sql: 'SQL Editor & Supabase',
      },
      kpis: {
        totalProducts: 'Total produits',
        totalOrders: 'Total commandes',
        pendingOrders: 'Commandes en cours',
        completedOrders: 'Commandes livrées',
        revenue: 'Chiffre d’affaires',
        unreadMessages: 'Messages non lus',
      },
      addProduct: 'Ajouter un produit',
      editProduct: 'Modifier le produit',
      uploadImage: 'Téléverser une photo',
      uploading: 'Envoi de l’image…',
    },
    footer: {
      tagline:
        'Ferme agricole familiale en Chaouia : légumes bio de saison, huile d’olive Beldi vierge extra et poulet Beldi plein air.',
      navigation: 'Explorer le domaine',
      contact: 'Contact & Livraison',
      adminPortal: 'Portail Administration',
      copyright: '© 2026 Domaine Essaoudi. Tous droits réservés.',
    },
  },

  en: {
    nav: {
      home: 'Home',
      vegetables: 'Vegetables',
      oliveOil: 'Olive Oil',
      poultry: 'Beldi Poultry',
      about: 'About Us',
      contact: 'Contact',
      admin: 'Admin',
      cart: 'Cart',
    },
    common: {
      addToCart: 'Add to cart',
      added: 'Added to cart',
      outOfStock: 'Temporarily out of stock',
      inStock: 'In stock',
      unitsLeft: 'available',
      viewDetails: 'View details',
      orderWhatsapp: 'Order via WhatsApp',
      exploreCatalog: 'Explore harvests',
      allCategories: 'All products',
      backToCatalog: 'Back to catalog',
      loading: 'Loading…',
      save: 'Save changes',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      submit: 'Submit',
      moroccoCurrency: 'MAD',
      pickupLabel: 'Farm Pickup (Free)',
      deliveryLabel: 'Home Delivery',
      bestseller: 'Most requested',
      originChaouia: 'Chaouia · Bio',
      farmPrice: 'Farm price',
      codAvailable: 'Cash on delivery',
    },
    home: {
      heroOrigin: 'Chaouia Family Farm · Natural Agriculture',
      heroTitle: 'Moroccan harvests,',
      heroHighlight: 'grown step by step.',
      heroSubtitle:
        'Organic vegetables picked at dawn, cold-pressed Beldi olive oil, and free-range Beldi poultry raised naturally beneath our Chaouia olive groves.',
      heroPrimaryCta: 'Explore our harvests',
      heroSecondaryCta: 'How we farm',
      heroOverlayTitle: 'Fresh morning harvest',
      heroOverlaySub: 'Direct delivery across Chaouia & Morocco',
      statsClientsVal: 'Chaouia',
      statsClientsLabel: 'Berrechid · Estate',
      statsProductsLabel: 'Farm products',
      statsOrganicVal: '100%',
      statsOrganicLabel: 'Natural & Beldi',
      searchPlaceholder: 'What would you like to order today?',
      filterAll: 'All',
      catalogKicker: 'Curated from our fields',
      catalogTitle: 'Choose the right farm products for your kitchen',
      catalogSubtitle: 'Check sizes, real-time stock availability, and order directly.',
      catalogCountLabel: 'products',
      catalogEmpty: 'No products match your search.',
      pillarsTitle: 'Three pillars of our Moroccan estate',
      pillarsSubtitle:
        'Every crop and flock follows the Moroccan agricultural calendar—zero industrial shortcuts or synthetic preservatives.',
      pillarVegDesc:
        'Field-ripened tomatoes, Chaouia red-loam potatoes, sweet red onions, bunch carrots, and dawn-picked seasonal crates.',
      pillarOilDesc:
        'Single-varietal 100% Moroccan Haouzia (الحوزية) olive oil, first cold mechanical press, available from 1 L to 10 L.',
      pillarPoultryDesc:
        'Heritage Moroccan Beldi chickens raised outdoors beneath our olive trees on natural whole grains and pasture forage.',
      philosophyKicker: 'A complete farm-to-table experience',
      philosophyTitle: 'More than fresh food… an honest Moroccan agricultural craft',
      philosophyLead:
        'At Domaine Essaoudi, living soil fertility and unhurried natural cycles always come before industrial volume.',
      philosophyPoints: [
        {
          title: 'Living soil & precision drip irrigation',
          body: 'Our market beds are nourished exclusively with aged estate compost and watered with clean well drip lines.',
        },
        {
          title: 'Cold pressed within 6 hours',
          body: 'Hand-harvested olives go straight to mechanical cold extraction at 23°C to preserve polyphenols and bright aroma.',
        },
        {
          title: 'Free-range olive-grove pastures',
          body: 'Our Beldi poultry roam freely outdoors for a minimum of 140 days with zero antibiotics or growth hormones.',
        },
      ],
      philosophyTrust1: 'Picked fresh at dawn and dispatched directly from Chaouia',
      philosophyTrust2: 'Direct WhatsApp guidance & cash-on-delivery across Morocco',
      featuredTitle: 'Today’s fresh harvest selection',
      featuredSubtitle: 'Available for direct dispatch from our Chaouia farm.',
      whyTitle: 'Why households & chefs choose Domaine Essaoudi',
      whyMetrics: [
        {
          value: '< 0.35%',
          label: 'Oleic acidity',
          detail: 'Lab-verified extra virgin olive oil lots',
        },
        {
          value: '140 d',
          label: 'Free-range rearing',
          detail: 'Minimum outdoor growth for Beldi chickens',
        },
        {
          value: '06:30',
          label: 'Dawn picking',
          detail: 'Vegetables harvested the morning of dispatch',
        },
        {
          value: '100%',
          label: 'Direct farm-to-table',
          detail: 'Zero middlemen between Chaouia and your kitchen',
        },
      ],
      testimonialsTitle: 'Trusted by Moroccan kitchens and families',
      ctaKicker: 'Great cooking starts at the source',
      ctaBannerTitle: 'Bring authentic Moroccan farm harvests to your table',
      ctaBannerBody:
        'Our team packs fresh orders every morning and coordinates directly via WhatsApp across Casablanca, Rabat, Marrakech, and Morocco.',
      ctaContactBtn: 'Message us on WhatsApp',
    },
    vegetables: {
      title: 'Fresh Organic Seasonal Vegetables',
      subtitle:
        'Open-field vegetables grown in fertile Chaouia loam, harvested ripe at dawn without prolonged cold storage.',
      all: 'All',
      tomatoes: 'Tomatoes',
      potatoes: 'Potatoes',
      onions: 'Onions',
      carrots: 'Carrots',
      peppers: 'Peppers',
      seasonal: 'Seasonal Crates',
      empty: 'No vegetables are currently listed in this category.',
    },
    oliveOil: {
      title: 'Single-Varietal Haouzia Beldi Olive Oil',
      subtitle:
        'Exclusively one heritage cultivar on our estate: 100% hand-harvested Moroccan Haouzia (الحوزية) olives cold-pressed in Chaouia.',
      processTitle: 'From Haouzia grove to bottle: our 4-step craft',
      processSteps: [
        {
          step: '01',
          title: 'Early hand-harvesting',
          desc: 'Haouzia olives picked gently by hand into ventilated crates at optimal veraison for peak aromatic intensity.',
        },
        {
          step: '02',
          title: 'Spring-water wash & crushing',
          desc: 'De-leafed and washed within 4 hours of harvest so fruit never heats or ferments.',
        },
        {
          step: '03',
          title: 'Cold extraction at 23°C',
          desc: 'Pure mechanical pressing without hot water or solvents, locking in antioxidants and Haouzia green-almond notes.',
        },
        {
          step: '04',
          title: 'Natural settling & UV bottling',
          desc: 'Gravity-settled in stainless steel vats and sealed in dark amber glass or food-grade 5L tins.',
        },
      ],
      formatsTitle: 'Select your volume in liters — 100% Haouzia (الحوزية)',
      acidityNote: 'Single cultivar Haouzia (الحوزية) · Unblended harvest · Acidity < 0.35%',
    },
    poultry: {
      title: 'Free-Range Moroccan Beldi Chickens',
      subtitle:
        'Heritage Moroccan chickens raised outdoors beneath our olive trees on whole grains and wild herbs.',
      practicesTitle: 'Natural pasture & feeding standards',
      practices: [
        {
          title: 'Open-air olive grove pastures',
          desc: 'Daily unrestricted access to sunlit grass, shade beneath olive trees, and mineral-rich soil.',
        },
        {
          title: 'Clean whole-grain & forage diet',
          desc: 'Fed cracked corn, local barley, wheat bran, fresh alfalfa, and surplus organic farm greens.',
        },
        {
          title: 'Halal prepared to order',
          desc: 'Processed and cleaned cleanly on the morning of dispatch—or reserved live for farm pickup.',
        },
      ],
      productsTitle: 'Select weight in Kilo — Free-Range Beldi Chicken',
      requestNote:
        'Planning a family gathering, traditional Rfissa, or weekly subscription? Add to your cart or send a direct WhatsApp request.',
    },
    productDetail: {
      harvestNotes: 'Harvest & storage notes',
      selectOption: 'Select format / weight',
      selectLiters: 'Select volume (Liters)',
      liters: 'Liters',
      kilo: 'Kilo',
      quantity: 'Quantity',
      availability: 'Availability',
      deliveryInfo: 'Cash on Delivery (COD) and direct WhatsApp confirmation available across Morocco.',
    },
    about: {
      title: 'About Domaine Essaoudi',
      subtitle:
        'A family-stewarded Moroccan agricultural estate in Chaouia dedicated to honest, traceable farm food.',
      storyTitle: 'Our heritage & land',
      storyP1:
        'Located in Douar Ouled Ziane along the Berrechid road, Domaine Essaoudi brings together three timeless pillars of Moroccan rural life: open-field market gardening, Beldi olive cultivation, and free-range Beldi poultry.',
      storyP2:
        'We believe healthy soil produces honest nourishment. Instead of synthetic fertilizers or confined battery barns, olive pruning mulch and poultry compost cycle back to enrich our vegetable beds.',
      valuesTitle: 'What guides every harvest',
      values: [
        {
          title: 'Complete provenance',
          desc: 'Every bottle of oil and vegetable crate traces directly back to our plots in Berrechid.',
        },
        {
          title: 'Patient animal stewardship',
          desc: 'Slow 140-day free-range growth under natural sunlight with zero antibiotics or hormones.',
        },
        {
          title: 'Fair direct-to-farm trade',
          desc: 'Ordering directly supports our local harvesters, millers, and farm families fairly.',
        },
      ],
      methodsTitle: 'Circular farm stewardship',
      methodsBody:
        'Nothing goes to waste at Domaine Essaoudi: olive pomace enriches our compost piles, free-range flocks naturally clear harvested beds, and drip lines conserve groundwater.',
    },
    contact: {
      title: 'Contact Domaine Essaoudi',
      subtitle:
        'Direct household orders, restaurant supply inquiries, farm visits, and custom boxes.',
      directTitle: 'Direct farm contacts',
      phoneLabel: 'Phone',
      whatsappLabel: 'Direct WhatsApp',
      emailLabel: 'Email',
      addressLabel: 'Farm location',
      hoursLabel: 'Hours',
      formTitle: 'Send us a message',
      nameField: 'Full name',
      phoneField: 'Phone (+212...)',
      emailField: 'Email (optional)',
      subjectField: 'Subject',
      messageField: 'Your message',
      sendMessage: 'Send message',
      sentSuccess: 'Thank you! Your message has been received by our farm team.',
      mapTitle: 'Find Domaine Essaoudi on Google Maps',
      openGoogleMaps: 'Get directions on Google Maps',
    },
    cart: {
      title: 'Your Farm Basket',
      emptyTitle: 'Your basket is empty',
      emptyBody: 'Add fresh seasonal vegetables, Beldi olive oil, or free-range poultry to get started.',
      subtotal: 'Subtotal',
      deliveryFee: 'Delivery',
      freeDelivery: 'Free',
      freeDeliveryHint: 'Add {amount} more for free delivery in this zone.',
      total: 'Total',
      checkoutTitle: 'Complete your order',
      deliveryZone: 'Morocco Delivery Zone',
      fullName: 'Full name',
      phone: 'Phone (+212 6XX XX XX XX)',
      emailOptional: 'Email (optional)',
      city: 'City',
      address: 'Full street address',
      notes: 'Order notes (preferred time, cuts…)',
      placeOrder: 'Confirm order',
      submitting: 'Submitting order…',
      orderConfirmed: 'Order confirmed!',
      orderNumber: 'Order reference',
      confirmWhatsapp: 'Send summary via WhatsApp',
      confirmEmail: 'Send order via Email',
      emailDispatched: 'Your order details have been sent to {email}.',
      emailActivationPending:
        'An activation link was sent to {email} (check inbox/spam once to activate direct email alerts).',
      emailSavedPending: 'Order registered for {email}.',
      newOrder: 'Continue shopping',
    },
    admin: {
      title: 'Administration — Domaine Essaoudi',
      claimTitle: 'Initial Administrator Setup',
      claimSubtitle:
        'No administrator password has been configured yet. Set an initial password to secure the farm dashboard.',
      loginTitle: 'Administrator Sign In',
      loginSubtitle: 'Manage farm products, pricing, stock, customer orders, and site content.',
      passwordLabel: 'Administrator password',
      claimBtn: 'Claim admin access',
      loginBtn: 'Sign in',
      logoutBtn: 'Sign out',
      tabs: {
        overview: 'Overview',
        products: 'Products & Stock',
        orders: 'Orders',
        content: 'Content & Inquiries',
        sql: 'SQL Editor & Supabase',
      },
      kpis: {
        totalProducts: 'Total products',
        totalOrders: 'Total orders',
        pendingOrders: 'Active / Pending',
        completedOrders: 'Completed orders',
        revenue: 'Total revenue',
        unreadMessages: 'Unread messages',
      },
      addProduct: 'Add product',
      editProduct: 'Edit product',
      uploadImage: 'Upload photo',
      uploading: 'Uploading…',
    },
    footer: {
      tagline:
        'Family agricultural estate in Chaouia: organic seasonal vegetables, cold-pressed Beldi olive oil, and free-range Beldi poultry.',
      navigation: 'Explore',
      contact: 'Contact & Delivery',
      adminPortal: 'Admin Portal',
      copyright: '© 2026 Domaine Essaoudi. All rights reserved.',
    },
  },

  ar: {
    nav: {
      home: 'الرئيسية',
      vegetables: 'الخضروات',
      oliveOil: 'زيت الزيتون',
      poultry: 'الدجاج البلدي',
      about: 'من نحن',
      contact: 'اتصل بنا',
      admin: 'الإدارة',
      cart: 'السلة',
    },
    common: {
      addToCart: 'أضف إلى السلة',
      added: 'تمت الإضافة',
      outOfStock: 'غير متوفر حالياً',
      inStock: 'متوفر',
      unitsLeft: 'متبقية',
      viewDetails: 'تفاصيل المنتج',
      orderWhatsapp: 'اطلب عبر واتساب',
      exploreCatalog: 'اكتشف محاصيلنا',
      allCategories: 'جميع المنتجات',
      backToCatalog: 'العودة إلى الكتالوج',
      loading: 'جاري التحميل…',
      save: 'حفظ التغييرات',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      close: 'إغلاق',
      submit: 'إرسال',
      moroccoCurrency: 'درهم',
      pickupLabel: 'الاستلام من المزرعة (مجاني)',
      deliveryLabel: 'التوصيل للمنزل',
      bestseller: 'الأكثر طلباً',
      originChaouia: 'الشاوية · طبيعي',
      farmPrice: 'الثمن',
      codAvailable: 'الأداء عند الاستلام',
    },
    home: {
      heroOrigin: 'خيرات مزرعتنا المغربية · فلاحة طبيعية',
      heroTitle: 'تذوّق أصالة الأرض',
      heroHighlight: 'خطوة بخطوة.',
      heroSubtitle:
        'خضروات موسمية طازجة تُجنى عند الفجر، زيت زيتون بلدي معصور على البارد، ودجاج بلدي حر يتربى في بساتين برشيد بالشاوية.',
      heroPrimaryCta: 'اكتشف المنتجات',
      heroSecondaryCta: 'كيفاش كنزرعو؟',
      heroOverlayTitle: 'جني صباحي طازج يومياً',
      heroOverlaySub: 'توصيل مباشر عبر الشاوية، الدار البيضاء والمغرب',
      statsClientsVal: 'الشاوية',
      statsClientsLabel: 'برشيد · المغرب',
      statsProductsLabel: 'منتج فلاحي',
      statsOrganicVal: '100%',
      statsOrganicLabel: 'طبيعي وبلدي',
      searchPlaceholder: 'شنو بغيتي تطلب اليوم؟',
      filterAll: 'الكل',
      catalogKicker: 'منتجات مختارة بعناية',
      catalogTitle: 'اختر المنتوج المناسب لمائدتك',
      catalogSubtitle: 'شوف التفاصيل، الحجم، والتوفر المباشر قبل ما تطلب اللي يناسبك.',
      catalogCountLabel: 'منتج',
      catalogEmpty: 'لم يتم العثور على منتجات مطابقة لبحثك.',
      pillarsTitle: 'ثلاث ركائز من خيرات أرضنا',
      pillarsSubtitle:
        'كل منتج يتبع إيقاع الفصول المغربية الطبيعية، بدون أي تدخل صناعي أو مواد حافظة.',
      pillarVegDesc:
        'طماطم بلدية، بطاطس الشاوية، بصل أحمر حلو، جزر طازج وسلال موسمية تُجنى عند الفجر.',
      pillarOilDesc:
        'عصرة أولى على البارد حصرياً من صنف واحد: زيتون الحوزية المغربي المقطوف يدوياً، متوفر من 1 لتر إلى 10 لتر.',
      pillarPoultryDesc:
        'دجاج بلدي أصيل يتربى في الهواء الطلق تحت أشجار الزيتون ويتغذى على الحبوب الكاملة والأعشاب الطبيعية.',
      philosophyKicker: 'تجربة فلاحية متكاملة',
      philosophyTitle: 'ماشي غير منتجات… مسار واضح من الضيعة لمائدتك',
      philosophyLead:
        'في مزرعة السعودي، خصوبة التربة واحترام الدورة الطبيعية مقدمان دائماً على الإنتاج الكمي السريع.',
      philosophyPoints: [
        {
          title: 'تربة حية وسقي معقلن',
          body: 'نغذي حقولنا بالسماد العضوي الطبيعي للمزرعة ونعتمد السقي بالتنقيط من مياه الآبار النقية.',
        },
        {
          title: 'عصر بارد خلال 6 ساعات',
          body: 'يُنقل الزيتون المقطوف يدوياً إلى المعصرة في نفس اليوم للحفاظ على مضادات الأكسدة والنكهة الأصيلة.',
        },
        {
          title: 'مراعي حرة تحت الزيتون',
          body: 'يتربى الدجاج البلدي بحرية تامة لمدة لا تقل عن 140 يوماً بدون أي مضادات حيوية أو هرمونات.',
        },
      ],
      philosophyTrust1: 'قطف صباحي طازج وتحضير الطلب في نفس اليوم',
      philosophyTrust2: 'تواصل مباشر عبر واتساب وتأكيد الطلب والأداء عند الاستلام',
      featuredTitle: 'مختارات الحصاد اليومي',
      featuredSubtitle: 'منتجات طازجة متوفرة للطلب المباشر من مزرعتنا بالشاوية.',
      whyTitle: 'لماذا يختارنا عشاق الجودة في المغرب',
      whyMetrics: [
        {
          value: '< 0.35%',
          label: 'نسبة الحموضة',
          detail: 'زيت زيتون بكر ممتاز مفحوص لكل دفعة',
        },
        {
          value: '140 يوم',
          label: 'تربية في الهواء الطلق',
          detail: 'أدنى مدة لنمو طبيعي للدجاج البلدي',
        },
        {
          value: '06:30',
          label: 'جني صباحي باكر',
          detail: 'خضروات تُقطف صباح يوم التوصيل',
        },
        {
          value: '100%',
          label: 'من المزرعة مباشرة',
          detail: 'بدون وسطاء بين أراضي الشاوية ومائدتكم',
        },
      ],
      testimonialsTitle: 'ثقة الأسر المغربية والمطاعم التقليدية',
      ctaKicker: 'الجودة هي أول خطوة لنجاح المائدة',
      ctaBannerTitle: 'حوّل مائدتك إلى عنوان للصحة والذوق البلدي',
      ctaBannerBody:
        'فريقنا يحضر طلباتكم كل صباح ويتواصل معكم مباشرة عبر واتساب للتوصيل في الدار البيضاء والرباط ومراكش وباقي المدن.',
      ctaContactBtn: 'تواصل معنا على واتساب',
    },
    vegetables: {
      title: 'خضروات موسمية طازجة وعضوية',
      subtitle:
        'مزروعة في تربة الشاوية الخصبة، تُجنى ناضجة عند الفجر وتُوصل إليكم طازجة بدون تخزين طويل.',
      all: 'الكل',
      tomatoes: 'طماطم',
      potatoes: 'بطاطس',
      onions: 'بصل',
      carrots: 'جزر',
      peppers: 'فلفل',
      seasonal: 'سلال الموسم',
      empty: 'لا توجد خضروات متاحة في هذا القسم حالياً.',
    },
    oliveOil: {
      title: 'زيت الزيتون البلدي الحوزية البكر الممتاز',
      subtitle:
        'صنف واحد حصري في بساتيننا: زيت زيتون بكر ممتاز 100% من زيتون الحوزية المغربي المقطوف يدوياً والمعصور على البارد.',
      processTitle: 'من شجرة الحوزية إلى القارورة: 4 مراحل دقيقة',
      processSteps: [
        {
          step: '01',
          title: 'قطف يدوي مبكر',
          desc: 'يُقطف زيتون الحوزية يدوياً في صناديق مهواة عند بداية النضج لضمان أعلى تركيز للنكهة.',
        },
        {
          step: '02',
          title: 'غسل نقي وطحن فوري',
          desc: 'فرز الأوراق والغسل بالماء النقي خلال 4 ساعات من القطف لتفادي أي تخمر.',
        },
        {
          step: '03',
          title: 'عصر بارد في 23 درجة',
          desc: 'استخلاص ميكانيكي بارد يحفظ الفيتامينات والبوليفينولات ومذاق زيتون الحوزية الأصيل.',
        },
        {
          step: '04',
          title: 'ترسيب طبيعي وتعبئة محكمة',
          desc: 'راحة طبيعية في صهاريج فولاذية وتعبئة في زجاج داكن أو صفائح غذائية تحمي من الضوء.',
        },
      ],
      formatsTitle: 'اختر الكمية باللتر — 100% زيتون الحوزية',
      acidityNote: 'صنف وحيد حصري: زيتون الحوزية 100% · عصر بارد غير مخلوط · حموضة < 0.35%',
    },
    poultry: {
      title: 'الدجاج البلدي الحر (المرعى الطبيعي)',
      subtitle:
        'سلالة مغربية أصيلة تتربى بحرية تحت أشجار الزيتون على الحبوب الطبيعية والأعشاب البرية.',
      practicesTitle: 'معايير التربية الطبيعية والتغذية',
      practices: [
        {
          title: 'مراعي مفتوحة تحت الزيتون',
          desc: 'حرية الحركة اليومية في مساحات خضراء مشمسة تمنح اللحم قواماً متماسكاً ومذاقاً غنياً.',
        },
        {
          title: 'تغذية طبيعية 100% بالحبوب',
          desc: 'ذرة مجروشة، شعير محلي، نخالة القمح، فصة خضراء وبقايا خضروات المزرعة العضوية.',
        },
        {
          title: 'ذبح وتنظيف حلال عند الطلب',
          desc: 'تحضير صباحي يوم الإرسال لضمان أقصى درجات النظافة والطراوة.',
        },
      ],
      productsTitle: 'اختر الكمية بالكيلو — الدجاج البلدي الحر',
      requestNote:
        'هل تحضرون لمناسبة عائلية أو طبق رفيسة تقليدي أو اشتراك أسبوعي؟ أضيفوا للسلة أو أرسلوا طلبكم عبر واتساب.',
    },
    productDetail: {
      harvestNotes: 'ملاحظات الحصاد والحفظ',
      selectOption: 'اختر الحجم أو الوزن',
      selectLiters: 'اختر الكمية باللتر (L)',
      liters: 'اللترات',
      kilo: 'كيلو',
      quantity: 'الكمية',
      availability: 'التوفر',
      deliveryInfo: 'خدمة الدفع عند الاستلام متوفرة في مختلف المدن المغربية.',
    },
    about: {
      title: 'عن مزرعة السعودي',
      subtitle:
        'ضيعة فلاحية عائلية في قلب الشاوية، ملتزمة بتقديم خيرات الأرض المغربية بنزاهة وجودة عالية.',
      storyTitle: 'قصتنا وتاريخ أرضنا',
      storyP1:
        'تقع مزرعة السعودي في دوار أولاد زيان على طريق برشيد، وتجمع بين ثلاث حرف فلاحية مغربية أصيلة: زراعة الخضروات الموسمية في الحقول المفتوحة، إنتاج زيت الزيتون البلدي، وتربية الدجاج البلدي في المراعي الحرة.',
      storyP2:
        'نؤمن بأن الأرض التي تُحترم تعطي ثماراً أصدق. لذلك تخلينا عن الأسمدة الكيميائية القاسية والتربية المغلقة، لنعتمد دورة طبيعية متكاملة بين أشجار الزيتون والحقول والمراعي.',
      valuesTitle: 'قيمنا والتزاماتنا',
      values: [
        {
          title: 'الشفافية وتتبع المصدر',
          desc: 'كل قارورة زيت وكل صندوق خضروات يعود مباشرة إلى حقولنا المعروفة في برشيد.',
        },
        {
          title: 'الرفق بالحيوان والنمو البطيء',
          desc: 'نمو طبيعي لمدة لا تقل عن 140 يوماً في الهواء الطلق وبدون أي إضافات صناعية.',
        },
        {
          title: 'إنصاف الفلاح المحلي',
          desc: 'الطلب المباشر من المزرعة يدعم عمل الفلاحين واليد العاملة القروية بشكل عادل.',
        },
      ],
      methodsTitle: 'زراعة دائرية متوازنة',
      methodsBody:
        'في مزرعة السعودي لا يضيع شيء: تفل الزيتون يغذي السماد العضوي، والدجاج الحر ينظف التربة بشكل طبيعي، والسقي بالتنقيط يحافظ على الموارد المائية.',
    },
    contact: {
      title: 'تواصل مع مزرعة السعودي',
      subtitle:
        'للطلبات المباشرة، تزويد المطاعم، زيارة المزرعة أو الباقات المخصصة.',
      directTitle: 'بيانات التواصل المباشر',
      phoneLabel: 'الهاتف',
      whatsappLabel: 'واتساب المباشر',
      emailLabel: 'البريد الإلكتروني',
      addressLabel: 'عنوان المزرعة',
      hoursLabel: 'أوقات العمل',
      formTitle: 'أرسل رسالة إلى فريق المزرعة',
      nameField: 'الاسم الكامل',
      phoneField: 'رقم الهاتف (+212...)',
      emailField: 'البريد الإلكتروني (اختياري)',
      subjectField: 'الموضوع',
      messageField: 'رسالتك',
      sendMessage: 'إرسال الرسالة',
      sentSuccess: 'شكراً لك! تم استلام رسالتك بنجاح وسيتواصل معك فريق المزرعة قريباً.',
      mapTitle: 'موقع المزرعة على خرائط غوغل',
      openGoogleMaps: 'فتح الاتجاهات في خرائط غوغل',
    },
    cart: {
      title: 'سلة المزرعة',
      emptyTitle: 'سلتك فارغة حالياً',
      emptyBody: 'أضف خضروات طازجة أو زيت زيتون بلدي أو دجاجاً بلدياً للبدء.',
      subtotal: 'المجموع الفرعي',
      deliveryFee: 'التوصيل',
      freeDelivery: 'مجاني',
      freeDeliveryHint: 'أضف {amount} للحصول على توصيل مجاني في هذه المنطقة.',
      total: 'المجموع الإجمالي',
      checkoutTitle: 'إتمام الطلب',
      deliveryZone: 'منطقة التوصيل بالمغرب',
      fullName: 'الاسم الكامل',
      phone: 'رقم الهاتف (+212 6XX XX XX XX)',
      emailOptional: 'البريد الإلكتروني (اختياري)',
      city: 'المدينة',
      address: 'عنوان التوصيل الكامل',
      notes: 'ملاحظات (توقيت التوصيل، طريقة التقطيع…)',
      placeOrder: 'تأكيد الطلب',
      submitting: 'جاري تسجيل الطلب…',
      orderConfirmed: 'تم تأكيد طلبك بنجاح!',
      orderNumber: 'رقم الطلب',
      confirmWhatsapp: 'إرسال ملخص الطلب عبر واتساب',
      confirmEmail: 'إرسال الطلب عبر البريد الإلكتروني',
      emailDispatched: 'تم إرسال تفاصيل طلبك تلقائياً إلى {email}.',
      emailActivationPending:
        'تم إرسال رابط التفعيل إلى {email} (يرجى تأكيده مرة واحدة في البريد الوارد أو الرسائل غير المرغوب فيها).',
      emailSavedPending: 'تم تسجيل الطلب وإعداده للإرسال إلى {email}.',
      newOrder: 'متابعة التسوق',
    },
    admin: {
      title: 'لوحة الإدارة — مزرعة السعودي',
      claimTitle: 'الإعداد الأولي لكلمة مرور المدير',
      claimSubtitle:
        'لم يتم تعيين كلمة مرور للمدير بعد. اختر كلمة مرور آمنة لحماية لوحة التحكم.',
      loginTitle: 'دخول الإدارة',
      loginSubtitle: 'إدارة المنتجات، الأسعار، المخزون، طلبات الزبناء ومحتوى الموقع.',
      passwordLabel: 'كلمة مرور الإدارة',
      claimBtn: 'تفعيل حساب الإدارة',
      loginBtn: 'تسجيل الدخول',
      logoutBtn: 'تسجيل الخروج',
      tabs: {
        overview: 'نظرة عامة',
        products: 'المنتجات والمخزون',
        orders: 'الطلبات',
        content: 'المحتوى والرسائل',
        sql: 'محرر SQL و Supabase',
      },
      kpis: {
        totalProducts: 'إجمالي المنتجات',
        totalOrders: 'إجمالي الطلبات',
        pendingOrders: 'طلبات قيد المعالجة',
        completedOrders: 'طلبات مكتملة',
        revenue: 'إجمالي المبيعات',
        unreadMessages: 'رسائل غير مقروءة',
      },
      addProduct: 'إضافة منتج جديد',
      editProduct: 'تعديل المنتج',
      uploadImage: 'رفع صورة المنتج',
      uploading: 'جاري رفع الصورة…',
    },
    footer: {
      tagline:
        'مزرعة عائلية بالشاوية: خضروات موسمية عضوية، زيت زيتون بلدي بكر ممتاز ودجاج بلدي حر.',
      navigation: 'استكشف المزرعة',
      contact: 'التواصل والتوصيل',
      adminPortal: 'بوابة الإدارة',
      copyright: '© 2026 مزرعة السعودي (Domaine Essaoudi). جميع الحقوق محفوظة.',
    },
  },
};
