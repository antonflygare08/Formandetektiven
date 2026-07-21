"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type BillingPeriod = "monthly" | "yearly";

type Subscription = {
  id: string;
  name: string;
  category: string;
  price: number;
  billingPeriod?: BillingPeriod;
  usage: string;
  plan?: string;
  serviceId?: string;
  servicePlanId?: string;
  priceConfirmed?: boolean;
  benefits: string[];
};

type Insight = {
  title: string;
  text: string;
};

type CheckItem = {
  id: string;
  title: string;
  reasons: string[];
};

type KnownService = {
  displayName: string;
  matchNames: string[];
  category: string;
  plans: string[];
  recommendedBillingPeriod?: BillingPeriod;
  note: string;
};

type PlanFeature = {
  serviceDisplayName: string;
  planName: string;
  groupName: string;
  title: string;
  description?: string;
  priority: number;
  included: boolean;
};

type PlanFeatureMap = Record<string, PlanFeature[]>;

type PlanPriceRange = {
  serviceDisplayName: string;
  planName: string;
  currency: CurrencyCode;
  billingPeriod: BillingPeriod;
  lowPrice?: number;
  typicalMinPrice: number;
  typicalMaxPrice: number;
  highPrice?: number;
  priceLevel?: "budget" | "standard" | "premium" | "highest";
  roughPriceLabel?: string;
  sourceNote?: string;
};

type PlanPriceRangeMap = Record<string, PlanPriceRange>;

type PendingPlanPriceWarning = {
  message: string;
  shouldAddAnother: boolean;
};

type RecommendationKind =
  | "cancel_or_pause"
  | "plan_change"
  | "overlap"
  | "benefit_check"
  | "price_check";

type RecommendationConfidence = "confirmed" | "likely" | "needs_confirmation";

type BenefitlyRecommendation = {
  id: string;
  kind: RecommendationKind;
  confidence: RecommendationConfidence;
  priority: number;
  subscriptionId?: string;
  title: string;
  description: string;
  reason: string;
  monthlySaving?: number;
  yearlySaving?: number;
  questions: string[];
  includeInConfirmedSavings: boolean;
  status: string;
  targetPlan?: string;
};

type SavingsOpportunity = {
  id: string;
  kind: "direct" | "plan" | "overlap";
  title: string;
  description: string;
  monthlyAmount?: number;
  yearlyAmount?: number;
  status: string;
};

type LanguageCode = "sv" | "en" | "de";
type CurrencyCode = "SEK" | "EUR" | "USD" | "GBP" | "DKK" | "NOK";

type AppSettings = {
  language: LanguageCode;
  currency: CurrencyCode;
};

const currencyLocales: Record<CurrencyCode, string> = {
  SEK: "sv-SE",
  EUR: "de-DE",
  USD: "en-US",
  GBP: "en-GB",
  DKK: "da-DK",
  NOK: "nb-NO",
};

let activeCurrency: CurrencyCode = "SEK";
let activeLocale = "sv-SE";
let activePlanPriceRangeMap: PlanPriceRangeMap = {};

const inputClassName =
  "w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-600";

const categoryOptions = [
  "Underhållning",
  "Digitala tjänster",
  "Kommunikation",
  "Hälsa och träning",
  "Shopping och medlemskap",
  "Ekonomi och försäkring",
  "Hem och boende",
  "Resor och transport",
  "Utbildning",
  "Annat",
] as const;

type BenefitlyCategory = (typeof categoryOptions)[number];

function getBenefitlyCategory(
  category: string,
  serviceName = "",
): BenefitlyCategory {
  const normalizedCategory = category.toLowerCase().trim();
  const normalizedServiceName = serviceName.toLowerCase().trim();

  const entertainmentMemberships = [
    "storytel",
    "bookbeat",
    "nextory",
    "readly",
    "podimo",
    "audible",
    "xbox game pass",
    "playstation plus",
    "nintendo switch online",
  ];

  const digitalMemberships = ["adobe", "canva"];
  const educationMemberships = ["duolingo"];
  const travelMemberships = ["sj prio"];

  if (
    normalizedCategory === "streaming" ||
    normalizedCategory === "nyheter" ||
    normalizedCategory === "spel" ||
    entertainmentMemberships.some((name) =>
      normalizedServiceName.includes(name),
    )
  ) {
    return "Underhållning";
  }

  if (
    normalizedCategory === "molnlagring" ||
    normalizedCategory === "ai och verktyg" ||
    digitalMemberships.some((name) => normalizedServiceName.includes(name))
  ) {
    return "Digitala tjänster";
  }

  if (normalizedCategory === "mobil" || normalizedCategory === "bredband") {
    return "Kommunikation";
  }

  if (normalizedCategory === "gym" || normalizedCategory === "hälsa") {
    return "Hälsa och träning";
  }

  if (
    normalizedCategory === "shopping" ||
    normalizedCategory === "medlemskap" ||
    normalizedCategory === "mat och leverans"
  ) {
    if (
      educationMemberships.some((name) => normalizedServiceName.includes(name))
    ) {
      return "Utbildning";
    }

    if (
      travelMemberships.some((name) => normalizedServiceName.includes(name))
    ) {
      return "Resor och transport";
    }

    return "Shopping och medlemskap";
  }

  if (
    normalizedCategory === "bank och ekonomi" ||
    normalizedCategory === "bankkort" ||
    normalizedCategory === "försäkring"
  ) {
    return "Ekonomi och försäkring";
  }

  if (
    normalizedCategory === "el och energi" ||
    normalizedCategory === "hem" ||
    normalizedCategory === "hem och boende"
  ) {
    return "Hem och boende";
  }

  if (normalizedCategory === "transport") {
    return "Resor och transport";
  }

  if (normalizedCategory === "utbildning") {
    return "Utbildning";
  }

  if (categoryOptions.includes(category as BenefitlyCategory)) {
    return category as BenefitlyCategory;
  }

  return "Annat";
}

const knownServices: KnownService[] = [
  {
    displayName: "Netflix",
    matchNames: ["netflix"],
    category: "Streaming",
    plans: ["Standard", "Premium", "Med reklam"],
    recommendedBillingPeriod: "monthly",
    note: "Netflix känns igen. Välj den plan du har och skriv in vad du faktiskt betalar.",
  },
  {
    displayName: "Spotify",
    matchNames: ["spotify"],
    category: "Streaming",
    plans: ["Individual", "Duo", "Family", "Student"],
    recommendedBillingPeriod: "monthly",
    note: "Spotify känns igen. Kolla om Duo eller Family passar bättre om flera använder tjänsten.",
  },
  {
    displayName: "Max / HBO Max",
    matchNames: ["max", "hbo", "hbo max"],
    category: "Streaming",
    plans: ["Basic", "Standard", "Premium", "Sport"],
    recommendedBillingPeriod: "monthly",
    note: "Max känns igen. Kontrollera om du har ett paket med extra innehåll eller sport.",
  },
  {
    displayName: "Disney+",
    matchNames: ["disney", "disney+"],
    category: "Streaming",
    plans: ["Standard", "Premium"],
    recommendedBillingPeriod: "monthly",
    note: "Disney+ känns igen. Välj plan och skriv priset du faktiskt betalar.",
  },
  {
    displayName: "YouTube Premium",
    matchNames: ["youtube premium"],
    category: "Streaming",
    plans: ["Individual", "Family", "Student"],
    recommendedBillingPeriod: "monthly",
    note: "YouTube Premium kan även innehålla YouTube Music. Kolla så du inte betalar dubbelt för musik.",
  },
  {
    displayName: "YouTube Music",
    matchNames: ["youtube music"],
    category: "Streaming",
    plans: ["Individual", "Family", "Student"],
    recommendedBillingPeriod: "monthly",
    note: "YouTube Music känns igen. Kontrollera om det redan ingår i YouTube Premium.",
  },
  {
    displayName: "Apple Music",
    matchNames: ["apple music"],
    category: "Streaming",
    plans: ["Individual", "Family", "Student"],
    recommendedBillingPeriod: "monthly",
    note: "Apple Music känns igen. Kolla om du även har musik via någon annan tjänst.",
  },
  {
    displayName: "Viaplay",
    matchNames: ["viaplay"],
    category: "Streaming",
    plans: ["Film & Serier", "Medium", "Total", "Sport"],
    recommendedBillingPeriod: "monthly",
    note: "Viaplay känns igen. Sportpaket kan vara dyrare, så kontrollera om du använder det.",
  },
  {
    displayName: "TV4 Play",
    matchNames: ["tv4", "tv4 play", "cmore", "c more"],
    category: "Streaming",
    plans: ["Basic", "Plus", "Premium", "Sport"],
    recommendedBillingPeriod: "monthly",
    note: "TV4 Play känns igen. Kontrollera om sport eller premiuminnehåll ingår.",
  },
  {
    displayName: "Amazon Prime / Prime Video",
    matchNames: ["amazon prime", "prime video", "prime"],
    category: "Streaming",
    plans: ["Prime", "Prime Video"],
    recommendedBillingPeriod: "monthly",
    note: "Prime kan innehålla flera förmåner. Kolla om du använder mer än bara video.",
  },
  {
    displayName: "Crunchyroll",
    matchNames: ["crunchyroll"],
    category: "Streaming",
    plans: ["Fan", "Mega Fan", "Ultimate Fan"],
    recommendedBillingPeriod: "monthly",
    note: "Crunchyroll känns igen. Välj plan och skriv in vad du betalar.",
  },
  {
    displayName: "Google One",
    matchNames: ["google one"],
    category: "Molnlagring",
    plans: ["Basic", "Standard", "Premium"],
    recommendedBillingPeriod: "monthly",
    note: "Google One känns igen. Kan överlappa med iCloud, Dropbox eller OneDrive.",
  },
  {
    displayName: "Microsoft 365",
    matchNames: ["microsoft 365", "office 365", "microsoft office"],
    category: "Molnlagring",
    plans: ["Personal", "Family"],
    recommendedBillingPeriod: "yearly",
    note: "Microsoft 365 känns igen. OneDrive-lagring ingår ofta och kan överlappa med annan molnlagring.",
  },
  {
    displayName: "iCloud",
    matchNames: ["icloud", "apple icloud"],
    category: "Molnlagring",
    plans: ["50 GB", "200 GB", "2 TB", "6 TB", "12 TB"],
    recommendedBillingPeriod: "monthly",
    note: "iCloud känns igen. Kan överlappa med Google One eller Microsoft 365.",
  },
  {
    displayName: "Dropbox",
    matchNames: ["dropbox"],
    category: "Molnlagring",
    plans: ["Basic", "Plus", "Family", "Professional"],
    recommendedBillingPeriod: "monthly",
    note: "Dropbox känns igen. Kolla om du redan har tillräcklig lagring via annan tjänst.",
  },
  {
    displayName: "Nordic Wellness",
    matchNames: ["nordic wellness"],
    category: "Gym",
    plans: ["Bas", "Standard", "Premium", "Student"],
    recommendedBillingPeriod: "monthly",
    note: "Nordic Wellness känns igen. Gym är extra viktigt att jämföra med hur ofta du faktiskt tränar.",
  },
  {
    displayName: "SATS",
    matchNames: ["sats"],
    category: "Gym",
    plans: ["Basic", "Premium", "All access", "Student"],
    recommendedBillingPeriod: "monthly",
    note: "SATS känns igen. Kontrollera om du behöver tillgång till flera center.",
  },
  {
    displayName: "Fitness24Seven",
    matchNames: ["fitness24seven", "fitness 24 seven", "fitness 24/7"],
    category: "Gym",
    plans: ["Gym", "Gym + gruppträning", "Student"],
    recommendedBillingPeriod: "monthly",
    note: "Fitness24Seven känns igen. Kolla om du använder gymmet tillräckligt ofta.",
  },
  {
    displayName: "Foodora",
    matchNames: ["foodora"],
    category: "Mat och leverans",
    plans: ["Pro", "Plus", "Medlemskap"],
    recommendedBillingPeriod: "monthly",
    note: "Foodora känns igen. Matleverans kan bli dyrt om avgifter och småköp glöms bort.",
  },
  {
    displayName: "Wolt",
    matchNames: ["wolt"],
    category: "Mat och leverans",
    plans: ["Wolt+", "Medlemskap"],
    recommendedBillingPeriod: "monthly",
    note: "Wolt känns igen. Kontrollera om medlemskapet lönar sig jämfört med hur ofta du beställer.",
  },
  {
    displayName: "SkyShowtime",
    matchNames: ["skyshowtime", "sky showtime"],
    category: "Streaming",
    plans: ["Standard", "Premium"],
    recommendedBillingPeriod: "monthly",
    note: "SkyShowtime känns igen. Kontrollera om du använder tjänsten varje månad eller bara ibland.",
  },
  {
    displayName: "Apple TV+",
    matchNames: ["apple tv", "apple tv+"],
    category: "Streaming",
    plans: ["Standard", "Apple One"],
    recommendedBillingPeriod: "monthly",
    note: "Apple TV+ känns igen. Kontrollera om tjänsten ingår i Apple One eller betalas separat.",
  },
  {
    displayName: "Discovery+",
    matchNames: ["discovery", "discovery+"],
    category: "Streaming",
    plans: ["Underhållning", "Sport", "Total"],
    recommendedBillingPeriod: "monthly",
    note: "Discovery+ känns igen. Sportpaket kan vara dyrare, så kontrollera om du använder det.",
  },
  {
    displayName: "Storytel",
    matchNames: ["storytel"],
    category: "Medlemskap",
    plans: ["Unlimited", "Family", "Student"],
    recommendedBillingPeriod: "monthly",
    note: "Storytel känns igen. Kontrollera om du använder ljudböcker tillräckligt ofta.",
  },
  {
    displayName: "BookBeat",
    matchNames: ["bookbeat"],
    category: "Medlemskap",
    plans: ["Basic", "Standard", "Premium", "Family"],
    recommendedBillingPeriod: "monthly",
    note: "BookBeat känns igen. Kontrollera lyssningstid och om billigare nivå räcker.",
  },
  {
    displayName: "Nextory",
    matchNames: ["nextory"],
    category: "Medlemskap",
    plans: ["Basic", "Unlimited", "Family"],
    recommendedBillingPeriod: "monthly",
    note: "Nextory känns igen. Kontrollera om du använder tjänsten tillräckligt ofta.",
  },
  {
    displayName: "Readly",
    matchNames: ["readly"],
    category: "Medlemskap",
    plans: ["Standard", "Family"],
    recommendedBillingPeriod: "monthly",
    note: "Readly känns igen. Kontrollera om du läser tillräckligt ofta för att medlemskapet ska löna sig.",
  },
  {
    displayName: "Duolingo",
    matchNames: ["duolingo"],
    category: "Medlemskap",
    plans: ["Super", "Family"],
    recommendedBillingPeriod: "monthly",
    note: "Duolingo känns igen. Kontrollera om gratisversionen räcker eller om du använder premiumfunktionerna.",
  },
  {
    displayName: "Adobe",
    matchNames: ["adobe", "creative cloud", "photoshop", "lightroom"],
    category: "Medlemskap",
    plans: ["Photography", "Single app", "Creative Cloud All Apps", "Student"],
    recommendedBillingPeriod: "monthly",
    note: "Adobe känns igen. Adobe-abonnemang kan vara dyra, så kontrollera om rätt plan används.",
  },
  {
    displayName: "Canva",
    matchNames: ["canva"],
    category: "Medlemskap",
    plans: ["Pro", "Teams", "Education"],
    recommendedBillingPeriod: "monthly",
    note: "Canva känns igen. Kontrollera om Pro-funktionerna används tillräckligt ofta.",
  },
  {
    displayName: "Xbox Game Pass",
    matchNames: ["xbox game pass", "game pass"],
    category: "Medlemskap",
    plans: ["Core", "Standard", "Ultimate", "PC"],
    recommendedBillingPeriod: "monthly",
    note: "Xbox Game Pass känns igen. Kontrollera om du spelar tillräckligt ofta och om rätt nivå behövs.",
  },
  {
    displayName: "PlayStation Plus",
    matchNames: ["playstation plus", "ps plus", "ps+"],
    category: "Medlemskap",
    plans: ["Essential", "Extra", "Premium"],
    recommendedBillingPeriod: "yearly",
    note: "PlayStation Plus känns igen. Kontrollera om du använder spelen och onlineförmånerna.",
  },
  {
    displayName: "Nintendo Switch Online",
    matchNames: ["nintendo switch online", "nintendo online"],
    category: "Medlemskap",
    plans: ["Individual", "Family", "Expansion Pack"],
    recommendedBillingPeriod: "yearly",
    note: "Nintendo Switch Online känns igen. Kontrollera om familjeplan eller vanlig plan passar bäst.",
  },
  {
    displayName: "Friskis & Svettis",
    matchNames: ["friskis", "friskis & svettis", "friskis och svettis"],
    category: "Gym",
    plans: ["Gym", "Träning", "Allkort", "Student"],
    recommendedBillingPeriod: "monthly",
    note: "Friskis & Svettis känns igen. Kontrollera om du använder gym, pass eller båda.",
  },
  {
    displayName: "Actic",
    matchNames: ["actic"],
    category: "Gym",
    plans: ["Basic", "Premium", "Student"],
    recommendedBillingPeriod: "monthly",
    note: "Actic känns igen. Kontrollera om du använder medlemskapet tillräckligt ofta.",
  },
  {
    displayName: "Fello",
    matchNames: ["fello"],
    category: "Mobil",
    plans: ["Liten surf", "Mellan surf", "Stor surf"],
    recommendedBillingPeriod: "monthly",
    note: "Fello känns igen. Kontrollera om surfmängden matchar din användning.",
  },
  {
    displayName: "IKEA Family",
    matchNames: ["ikea family", "ikea"],
    category: "Medlemskap",
    plans: ["Gratis medlemskap"],
    recommendedBillingPeriod: "monthly",
    note: "IKEA Family känns igen. Lägg in kostnaden som 0 kr om medlemskapet är gratis, men notera förmånerna.",
  },
  {
    displayName: "Stadium",
    matchNames: ["stadium", "stadium member"],
    category: "Shopping",
    plans: ["Member", "Premium"],
    recommendedBillingPeriod: "monthly",
    note: "Stadium känns igen. Kontrollera om rabatter eller bonusar används.",
  },
  {
    displayName: "H&M",
    matchNames: ["h&m", "hm", "hennes"],
    category: "Shopping",
    plans: ["Member", "Plus"],
    recommendedBillingPeriod: "monthly",
    note: "H&M känns igen. Lägg in kostnaden som 0 kr om medlemskapet är gratis, men notera förmånerna.",
  },
  {
    displayName: "ICA",
    matchNames: ["ica", "ica stammis", "ica kort"],
    category: "Medlemskap",
    plans: ["Stammis", "Bankkort"],
    recommendedBillingPeriod: "monthly",
    note: "ICA känns igen. Kontrollera bonus, rabatter och om kort/förmåner används.",
  },
  {
    displayName: "Coop",
    matchNames: ["coop"],
    category: "Medlemskap",
    plans: ["Medlem", "Mer"],
    recommendedBillingPeriod: "monthly",
    note: "Coop känns igen. Kontrollera bonus, rabatter och medlemsförmåner.",
  },
  {
    displayName: "Willys Plus",
    matchNames: ["willys", "willys plus"],
    category: "Medlemskap",
    plans: ["Plus"],
    recommendedBillingPeriod: "monthly",
    note: "Willys Plus känns igen. Lägg in kostnaden som 0 kr om medlemskapet är gratis, men notera förmånerna.",
  },
  {
    displayName: "Mobilabonnemang",
    matchNames: [
      "telia",
      "tele2",
      "telenor",
      "halebop",
      "vimla",
      "comviq",
      "hallon",
      "tre",
      "3",
    ],
    category: "Mobil",
    plans: ["Liten surf", "Mellan surf", "Fri surf", "Familj"],
    recommendedBillingPeriod: "monthly",
    note: "Mobilabonnemang känns igen. Kontrollera om du betalar för mer surf än du använder.",
  },
  {
    displayName: "Bankkort / kreditkort",
    matchNames: ["bankkort", "kreditkort", "visa", "mastercard"],
    category: "Bankkort",
    plans: ["Standard", "Premium", "Platinum", "Kort med bonus"],
    recommendedBillingPeriod: "yearly",
    note: "Kort känns igen. Kolla om reseförsäkring, köpskydd eller bonus ingår.",
  },
  {
    displayName: "Försäkring",
    matchNames: [
      "försäkring",
      "hemförsäkring",
      "bilförsäkring",
      "reseförsäkring",
    ],
    category: "Försäkring",
    plans: ["Bas", "Mellan", "Stor", "Premium"],
    recommendedBillingPeriod: "yearly",
    note: "Försäkring känns igen. Kontrollera villkor och om skyddet redan ingår någon annanstans.",
  },

  {
    displayName: "Paramount+",
    matchNames: ["paramount", "paramount+"],
    category: "Streaming",
    plans: ["Basic", "Standard", "Premium"],
    recommendedBillingPeriod: "monthly",
    note: "Paramount+ känns igen. Kontrollera om tjänsten används varje månad eller bara ibland.",
  },
  {
    displayName: "MUBI",
    matchNames: ["mubi"],
    category: "Streaming",
    plans: ["Standard", "Student"],
    recommendedBillingPeriod: "monthly",
    note: "MUBI känns igen. Kontrollera om du använder filmtjänsten tillräckligt ofta.",
  },
  {
    displayName: "Hayu",
    matchNames: ["hayu"],
    category: "Streaming",
    plans: ["Standard"],
    recommendedBillingPeriod: "monthly",
    note: "Hayu känns igen. Kontrollera om du fortfarande använder tjänsten varje månad.",
  },
  {
    displayName: "BritBox",
    matchNames: ["britbox"],
    category: "Streaming",
    plans: ["Standard"],
    recommendedBillingPeriod: "monthly",
    note: "BritBox känns igen. Kontrollera om tjänsten överlappar med andra streamingtjänster.",
  },
  {
    displayName: "SF Anytime",
    matchNames: ["sf anytime", "sfanytime"],
    category: "Streaming",
    plans: ["Hyrfilm", "Köpfilm"],
    recommendedBillingPeriod: "monthly",
    note: "SF Anytime känns igen. Kontrollera om kostnaden är återkommande eller en engångskostnad.",
  },
  {
    displayName: "Rakuten TV",
    matchNames: ["rakuten tv", "rakuten"],
    category: "Streaming",
    plans: ["Hyrfilm", "Köpfilm"],
    recommendedBillingPeriod: "monthly",
    note: "Rakuten TV känns igen. Kontrollera om kostnaden är återkommande eller en engångskostnad.",
  },
  {
    displayName: "Twitch Turbo",
    matchNames: ["twitch turbo", "twitch"],
    category: "Streaming",
    plans: ["Turbo"],
    recommendedBillingPeriod: "monthly",
    note: "Twitch Turbo känns igen. Kontrollera om reklamfritt tittande är värt kostnaden.",
  },
  {
    displayName: "Tidal",
    matchNames: ["tidal"],
    category: "Streaming",
    plans: ["Individual", "Family", "Student"],
    recommendedBillingPeriod: "monthly",
    note: "Tidal känns igen. Kontrollera om du betalar för flera musiktjänster.",
  },
  {
    displayName: "Deezer",
    matchNames: ["deezer"],
    category: "Streaming",
    plans: ["Premium", "Family", "Student"],
    recommendedBillingPeriod: "monthly",
    note: "Deezer känns igen. Kontrollera om du betalar dubbelt för musik.",
  },
  {
    displayName: "SoundCloud Go",
    matchNames: ["soundcloud", "soundcloud go"],
    category: "Streaming",
    plans: ["Go", "Go+"],
    recommendedBillingPeriod: "monthly",
    note: "SoundCloud känns igen. Kontrollera om premiumfunktionerna används.",
  },
  {
    displayName: "Podimo",
    matchNames: ["podimo"],
    category: "Medlemskap",
    plans: ["Premium"],
    recommendedBillingPeriod: "monthly",
    note: "Podimo känns igen. Kontrollera om du lyssnar tillräckligt ofta.",
  },
  {
    displayName: "Audible",
    matchNames: ["audible"],
    category: "Medlemskap",
    plans: ["Standard", "Premium Plus"],
    recommendedBillingPeriod: "monthly",
    note: "Audible känns igen. Kontrollera om du använder ljudböckerna varje månad.",
  },
  {
    displayName: "Headspace",
    matchNames: ["headspace"],
    category: "Hälsa",
    plans: ["Monthly", "Annual", "Family"],
    recommendedBillingPeriod: "monthly",
    note: "Headspace känns igen. Kontrollera om du använder appen tillräckligt ofta.",
  },
  {
    displayName: "Calm",
    matchNames: ["calm"],
    category: "Hälsa",
    plans: ["Premium", "Family"],
    recommendedBillingPeriod: "monthly",
    note: "Calm känns igen. Kontrollera om meditation eller sömnfunktionerna används.",
  },
  {
    displayName: "Strava",
    matchNames: ["strava"],
    category: "Hälsa",
    plans: ["Subscription", "Family"],
    recommendedBillingPeriod: "yearly",
    note: "Strava känns igen. Kontrollera om träningsfunktionerna används tillräckligt ofta.",
  },
  {
    displayName: "Runkeeper",
    matchNames: ["runkeeper", "asics runkeeper"],
    category: "Hälsa",
    plans: ["Go"],
    recommendedBillingPeriod: "monthly",
    note: "Runkeeper känns igen. Kontrollera om premiumfunktionerna används.",
  },
  {
    displayName: "ChatGPT Plus",
    matchNames: ["chatgpt", "chatgpt plus", "openai"],
    category: "AI och verktyg",
    plans: ["Plus", "Pro", "Team"],
    recommendedBillingPeriod: "monthly",
    note: "ChatGPT känns igen. Kontrollera om rätt nivå används och om någon annan AI-tjänst överlappar.",
  },
  {
    displayName: "Claude Pro",
    matchNames: ["claude", "claude pro", "anthropic"],
    category: "AI och verktyg",
    plans: ["Pro", "Max", "Team"],
    recommendedBillingPeriod: "monthly",
    note: "Claude känns igen. Kontrollera om du även betalar för andra AI-verktyg.",
  },
  {
    displayName: "Perplexity Pro",
    matchNames: ["perplexity", "perplexity pro"],
    category: "AI och verktyg",
    plans: ["Pro"],
    recommendedBillingPeriod: "monthly",
    note: "Perplexity känns igen. Kontrollera om sök- och AI-funktionerna används tillräckligt ofta.",
  },
  {
    displayName: "GitHub Copilot",
    matchNames: ["github copilot", "copilot"],
    category: "AI och verktyg",
    plans: ["Individual", "Business"],
    recommendedBillingPeriod: "monthly",
    note: "GitHub Copilot känns igen. Kontrollera om kodhjälpen används tillräckligt ofta.",
  },
  {
    displayName: "Notion",
    matchNames: ["notion"],
    category: "AI och verktyg",
    plans: ["Plus", "Business", "AI"],
    recommendedBillingPeriod: "monthly",
    note: "Notion känns igen. Kontrollera om du betalar för funktioner som faktiskt används.",
  },
  {
    displayName: "Evernote",
    matchNames: ["evernote"],
    category: "AI och verktyg",
    plans: ["Personal", "Professional"],
    recommendedBillingPeriod: "monthly",
    note: "Evernote känns igen. Kontrollera om appen fortfarande används eller överlappar med annat verktyg.",
  },
  {
    displayName: "Todoist",
    matchNames: ["todoist"],
    category: "AI och verktyg",
    plans: ["Pro", "Business"],
    recommendedBillingPeriod: "monthly",
    note: "Todoist känns igen. Kontrollera om Pro-funktionerna används.",
  },
  {
    displayName: "1Password",
    matchNames: ["1password", "onepassword"],
    category: "AI och verktyg",
    plans: ["Individual", "Families", "Teams"],
    recommendedBillingPeriod: "monthly",
    note: "1Password känns igen. Kontrollera om familjeplan eller individuell plan passar bäst.",
  },
  {
    displayName: "NordVPN",
    matchNames: ["nordvpn", "nord vpn"],
    category: "AI och verktyg",
    plans: ["Basic", "Plus", "Complete"],
    recommendedBillingPeriod: "yearly",
    note: "NordVPN känns igen. Kontrollera om du använder VPN-tjänsten tillräckligt ofta.",
  },
  {
    displayName: "Surfshark",
    matchNames: ["surfshark"],
    category: "AI och verktyg",
    plans: ["Starter", "One", "One+"],
    recommendedBillingPeriod: "yearly",
    note: "Surfshark känns igen. Kontrollera om VPN-tjänsten används och om årspriset är rätt inskrivet.",
  },
  {
    displayName: "Proton VPN",
    matchNames: ["proton vpn", "protonvpn", "proton"],
    category: "AI och verktyg",
    plans: ["VPN Plus", "Unlimited"],
    recommendedBillingPeriod: "monthly",
    note: "Proton VPN känns igen. Kontrollera om VPN eller hela Proton-paketet används.",
  },
  {
    displayName: "LinkedIn Premium",
    matchNames: ["linkedin premium", "linkedin"],
    category: "Utbildning",
    plans: ["Career", "Business", "Sales Navigator"],
    recommendedBillingPeriod: "monthly",
    note: "LinkedIn Premium känns igen. Kontrollera om premiumfunktionerna faktiskt används.",
  },
  {
    displayName: "Coursera",
    matchNames: ["coursera", "coursera plus"],
    category: "Utbildning",
    plans: ["Plus", "Course", "Specialization"],
    recommendedBillingPeriod: "monthly",
    note: "Coursera känns igen. Kontrollera om kursen fortfarande används eller kan pausas.",
  },
  {
    displayName: "Skillshare",
    matchNames: ["skillshare"],
    category: "Utbildning",
    plans: ["Premium", "Teams"],
    recommendedBillingPeriod: "yearly",
    note: "Skillshare känns igen. Kontrollera om årspriset och användningen stämmer.",
  },
  {
    displayName: "MasterClass",
    matchNames: ["masterclass"],
    category: "Utbildning",
    plans: ["Individual", "Duo", "Family"],
    recommendedBillingPeriod: "yearly",
    note: "MasterClass känns igen. Kontrollera om årspriset är värt användningen.",
  },
  {
    displayName: "Babbel",
    matchNames: ["babbel"],
    category: "Utbildning",
    plans: ["Standard", "Lifetime"],
    recommendedBillingPeriod: "monthly",
    note: "Babbel känns igen. Kontrollera om språkträningen används regelbundet.",
  },
  {
    displayName: "Memrise",
    matchNames: ["memrise"],
    category: "Utbildning",
    plans: ["Premium"],
    recommendedBillingPeriod: "monthly",
    note: "Memrise känns igen. Kontrollera om premiumfunktionerna används.",
  },
  {
    displayName: "EA Play",
    matchNames: ["ea play", "electronic arts"],
    category: "Spel",
    plans: ["EA Play", "EA Play Pro"],
    recommendedBillingPeriod: "monthly",
    note: "EA Play känns igen. Kontrollera om spelen används tillräckligt ofta.",
  },
  {
    displayName: "Ubisoft+",
    matchNames: ["ubisoft", "ubisoft+"],
    category: "Spel",
    plans: ["Classics", "Premium"],
    recommendedBillingPeriod: "monthly",
    note: "Ubisoft+ känns igen. Kontrollera om spelbiblioteket används varje månad.",
  },
  {
    displayName: "GeForce NOW",
    matchNames: ["geforce now", "nvidia geforce now"],
    category: "Spel",
    plans: ["Free", "Priority", "Ultimate"],
    recommendedBillingPeriod: "monthly",
    note: "GeForce NOW känns igen. Kontrollera om molnspelandet används tillräckligt ofta.",
  },
  {
    displayName: "Apple Arcade",
    matchNames: ["apple arcade"],
    category: "Spel",
    plans: ["Standard", "Apple One"],
    recommendedBillingPeriod: "monthly",
    note: "Apple Arcade känns igen. Kontrollera om tjänsten ingår i Apple One.",
  },
  {
    displayName: "Google Play Pass",
    matchNames: ["google play pass", "play pass"],
    category: "Spel",
    plans: ["Individual", "Family"],
    recommendedBillingPeriod: "monthly",
    note: "Google Play Pass känns igen. Kontrollera om spel och appar används tillräckligt ofta.",
  },
  {
    displayName: "Discord Nitro",
    matchNames: ["discord nitro", "discord"],
    category: "Spel",
    plans: ["Basic", "Nitro"],
    recommendedBillingPeriod: "monthly",
    note: "Discord Nitro känns igen. Kontrollera om premiumfunktionerna används.",
  },
  {
    displayName: "Roblox Premium",
    matchNames: ["roblox premium", "roblox"],
    category: "Spel",
    plans: ["450 Robux", "1000 Robux", "2200 Robux"],
    recommendedBillingPeriod: "monthly",
    note: "Roblox Premium känns igen. Kontrollera om medlemskapet används och om köpen är rimliga.",
  },
  {
    displayName: "Dagens Nyheter",
    matchNames: ["dagens nyheter", "dn"],
    category: "Nyheter",
    plans: ["Digital", "Helg", "Allt"],
    recommendedBillingPeriod: "monthly",
    note: "DN känns igen. Kontrollera om nyhetsabonnemanget används tillräckligt ofta.",
  },
  {
    displayName: "Svenska Dagbladet",
    matchNames: ["svenska dagbladet", "svd"],
    category: "Nyheter",
    plans: ["Digital", "Premium"],
    recommendedBillingPeriod: "monthly",
    note: "Svenska Dagbladet känns igen. Kontrollera om du använder abonnemanget regelbundet.",
  },
  {
    displayName: "Aftonbladet Plus",
    matchNames: ["aftonbladet plus", "aftonbladet"],
    category: "Nyheter",
    plans: ["Plus"],
    recommendedBillingPeriod: "monthly",
    note: "Aftonbladet Plus känns igen. Kontrollera om plusinnehållet används.",
  },
  {
    displayName: "Expressen Premium",
    matchNames: ["expressen premium", "expressen"],
    category: "Nyheter",
    plans: ["Premium"],
    recommendedBillingPeriod: "monthly",
    note: "Expressen Premium känns igen. Kontrollera om premiuminnehållet används.",
  },
  {
    displayName: "The Economist",
    matchNames: ["the economist", "economist"],
    category: "Nyheter",
    plans: ["Digital", "Print + Digital"],
    recommendedBillingPeriod: "yearly",
    note: "The Economist känns igen. Kontrollera om årspriset och användningen stämmer.",
  },
  {
    displayName: "Financial Times",
    matchNames: ["financial times", "ft.com", "ft"],
    category: "Nyheter",
    plans: ["Digital", "Premium"],
    recommendedBillingPeriod: "monthly",
    note: "Financial Times känns igen. Kontrollera om premiumpriset är värt användningen.",
  },
  {
    displayName: "HelloFresh",
    matchNames: ["hellofresh", "hello fresh"],
    category: "Mat och leverans",
    plans: ["Matkasse", "Familj", "Vegetarisk"],
    recommendedBillingPeriod: "monthly",
    note: "HelloFresh känns igen. Kontrollera om kostnaden är återkommande och hur ofta matkassen används.",
  },
  {
    displayName: "Linas Matkasse",
    matchNames: ["linas matkasse", "lina matkasse"],
    category: "Mat och leverans",
    plans: ["Original", "Familj", "Vegetarisk"],
    recommendedBillingPeriod: "monthly",
    note: "Linas Matkasse känns igen. Kontrollera om leveranserna fortfarande passar behovet.",
  },
  {
    displayName: "Mathem",
    matchNames: ["mathem"],
    category: "Mat och leverans",
    plans: ["Medlemskap", "Leverans"],
    recommendedBillingPeriod: "monthly",
    note: "Mathem känns igen. Kontrollera om kostnaden är medlemskap, leveransavgift eller matköp.",
  },
  {
    displayName: "Uber One",
    matchNames: ["uber one", "uber"],
    category: "Mat och leverans",
    plans: ["One"],
    recommendedBillingPeriod: "monthly",
    note: "Uber One känns igen. Kontrollera om medlemskapet lönar sig jämfört med hur ofta du beställer.",
  },
  {
    displayName: "Klarna Plus",
    matchNames: ["klarna plus", "klarna"],
    category: "Shopping",
    plans: ["Plus"],
    recommendedBillingPeriod: "monthly",
    note: "Klarna Plus känns igen. Kontrollera om förmånerna används tillräckligt ofta.",
  },
  {
    displayName: "SJ Prio",
    matchNames: ["sj prio", "sj"],
    category: "Medlemskap",
    plans: ["Medlem"],
    recommendedBillingPeriod: "monthly",
    note: "SJ Prio känns igen. Lägg in 0 kr om medlemskapet är gratis, men notera reseförmånerna.",
  },
  {
    displayName: "SL",
    matchNames: ["sl", "stockholms lokaltrafik", "sl kort"],
    category: "Transport",
    plans: ["30 dagar", "90 dagar", "Årskort", "Student"],
    recommendedBillingPeriod: "monthly",
    note: "SL känns igen. Kontrollera om det är månadskort, årskort eller en enskild biljett.",
  },
  {
    displayName: "EasyPark",
    matchNames: ["easypark", "easy park"],
    category: "Transport",
    plans: ["Go", "Plus", "Business"],
    recommendedBillingPeriod: "monthly",
    note: "EasyPark känns igen. Kontrollera om kostnaden är abonnemang, serviceavgift eller parkering.",
  },
  {
    displayName: "Voi",
    matchNames: ["voi"],
    category: "Transport",
    plans: ["Pass", "Monthly", "Pay as you go"],
    recommendedBillingPeriod: "monthly",
    note: "Voi känns igen. Kontrollera om det är pass, abonnemang eller enskilda resor.",
  },
  {
    displayName: "Bolt",
    matchNames: ["bolt"],
    category: "Transport",
    plans: ["Ride", "Food", "Pass"],
    recommendedBillingPeriod: "monthly",
    note: "Bolt känns igen. Kontrollera om kostnaden gäller resor, matleverans eller pass.",
  },
  {
    displayName: "KICKS Club",
    matchNames: ["kicks club", "kicks"],
    category: "Shopping",
    plans: ["Club", "VIP"],
    recommendedBillingPeriod: "monthly",
    note: "KICKS Club känns igen. Lägg in 0 kr om medlemskapet är gratis, men notera rabatter och bonus.",
  },
  {
    displayName: "Åhléns",
    matchNames: ["åhlens", "ahlens"],
    category: "Shopping",
    plans: ["Medlem", "Klubb"],
    recommendedBillingPeriod: "monthly",
    note: "Åhléns medlemskap känns igen. Lägg in 0 kr om det är gratis och notera förmånerna.",
  },
  {
    displayName: "Apotek Hjärtat",
    matchNames: ["apotek hjärtat", "apotek hjartat"],
    category: "Shopping",
    plans: ["Klubb Hjärtat"],
    recommendedBillingPeriod: "monthly",
    note: "Apotek Hjärtat känns igen. Lägg in 0 kr om medlemskapet är gratis, men notera rabatter och bonus.",
  },
  {
    displayName: "Lyko",
    matchNames: ["lyko"],
    category: "Shopping",
    plans: ["Lyko Social", "Medlem"],
    recommendedBillingPeriod: "monthly",
    note: "Lyko känns igen. Lägg in 0 kr om medlemskapet är gratis, men notera förmånerna.",
  },
];

const initialSubscriptions: Subscription[] = [
  {
    id: "demo-1",
    name: "Spotify Premium",
    category: "Underhållning",
    price: 119,
    billingPeriod: "monthly",
    usage: "Ofta",
    plan: "Premium",
    benefits: getBenefitsForSubscription(
      "Spotify Premium",
      "Underhållning",
      "Premium",
    ),
  },
  {
    id: "demo-2",
    name: "Microsoft 365",
    category: "Digitala tjänster",
    price: 99,
    billingPeriod: "monthly",
    usage: "Ibland",
    plan: "Family",
    benefits: getBenefitsForSubscription(
      "Microsoft 365",
      "Digitala tjänster",
      "Family",
    ),
  },
  {
    id: "demo-3",
    name: "Google One",
    category: "Digitala tjänster",
    price: 25,
    billingPeriod: "monthly",
    usage: "Sällan",
    plan: "",
    benefits: getBenefitsForSubscription("Google One", "Digitala tjänster", ""),
  },
  {
    id: "demo-4",
    name: "Nordic Wellness",
    category: "Hälsa och träning",
    price: 399,
    billingPeriod: "monthly",
    usage: "Sällan",
    plan: "",
    benefits: getBenefitsForSubscription(
      "Nordic Wellness",
      "Hälsa och träning",
      "",
    ),
  },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat(activeLocale, {
    style: "currency",
    currency: activeCurrency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getMonthlyPrice(subscription: Subscription) {
  if (subscription.billingPeriod === "yearly") {
    return subscription.price / 12;
  }

  return subscription.price;
}

function getYearlyPrice(subscription: Subscription) {
  if (subscription.billingPeriod === "yearly") {
    return subscription.price;
  }

  return subscription.price * 12;
}

function getBillingPeriodLabel(period?: BillingPeriod) {
  if (period === "yearly") {
    return "per år";
  }

  return "per månad";
}

function getBillingPeriodSuggestionLabel(period?: BillingPeriod) {
  if (period === "yearly") {
    return "Betalas ofta per år";
  }

  return "Betalas oftast per månad";
}

function getBrowserDefaultSettings(): AppSettings {
  if (typeof navigator === "undefined") {
    return { language: "sv", currency: "SEK" };
  }

  const browserLanguage = navigator.language.toLowerCase();

  if (browserLanguage.startsWith("de")) {
    return { language: "de", currency: "EUR" };
  }

  if (browserLanguage === "en-us") {
    return { language: "en", currency: "USD" };
  }

  if (browserLanguage === "en-gb") {
    return { language: "en", currency: "GBP" };
  }

  if (browserLanguage.startsWith("da")) {
    return { language: "en", currency: "DKK" };
  }

  if (browserLanguage.startsWith("nb") || browserLanguage.startsWith("no")) {
    return { language: "en", currency: "NOK" };
  }

  if (browserLanguage.startsWith("sv")) {
    return { language: "sv", currency: "SEK" };
  }

  return { language: "en", currency: "EUR" };
}

function formatCheckCount(count: number) {
  return `${count} ${count === 1 ? "sak" : "saker"} att kontrollera`;
}

type SupabaseSubscriptionRow = {
  id: string;
  name: string;
  category: string;
  price: number | string;
  billing_period: string;
  usage: string;
  plan: string | null;
  service_id: string | null;
  service_plan_id: string | null;
  price_confirmed: boolean;
};

function mapDbSubscription(row: SupabaseSubscriptionRow): Subscription {
  const billingPeriod: BillingPeriod =
    row.billing_period === "yearly" ? "yearly" : "monthly";
  const plan = row.plan ?? "";

  return {
    id: row.id,
    name: row.name,
    category: getBenefitlyCategory(row.category, row.name),
    price: Math.round(Number(row.price)),
    billingPeriod,
    usage: row.usage,
    plan,
    serviceId: row.service_id ?? undefined,
    servicePlanId: row.service_plan_id ?? undefined,
    priceConfirmed: row.price_confirmed,
    benefits: getBenefitsForSubscription(row.name, row.category, plan),
  };
}

export default function Home() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [hasLoaded, setHasLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [hasSkippedGuide, setHasSkippedGuide] = useState(false);
  const [showPremiumDetails, setShowPremiumDetails] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSavingsSheet, setShowSavingsSheet] = useState(false);
  const [analysisSubscription, setAnalysisSubscription] =
    useState<Subscription | null>(null);
  const [compareSubscription, setCompareSubscription] =
    useState<Subscription | null>(null);
  const [greeting, setGreeting] = useState("Hej");
  const [currency, setCurrency] = useState<CurrencyCode>("SEK");
  const [catalogServices, setCatalogServices] = useState<KnownService[]>(
    knownServices.map((service) => ({
      ...service,
      category: getBenefitlyCategory(service.category, service.displayName),
    })),
  );
  const [planFeatureMap, setPlanFeatureMap] = useState<PlanFeatureMap>({});
  const [planPriceRangeMap, setPlanPriceRangeMap] = useState<PlanPriceRangeMap>(
    {},
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);
  const [storageStatus, setStorageStatus] = useState(
    "Ansluter till lagring...",
  );

  const [name, setName] = useState("");
  const [category, setCategory] = useState<BenefitlyCategory>("Underhållning");
  const [price, setPrice] = useState("");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [usage, setUsage] = useState("Ofta");
  const [plan, setPlan] = useState("");
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingPlanPriceWarning, setPendingPlanPriceWarning] =
    useState<PendingPlanPriceWarning | null>(null);

  const recognizedService = findKnownService(name, catalogServices);
  const suggestedServices = getSuggestedServices(name, catalogServices);
  const livePlanPriceWarning = getDraftPlanPriceWarningMessage({
    name,
    category,
    price,
    billingPeriod,
    usage,
    plan,
  });

  activeCurrency = currency;
  activeLocale = currencyLocales[currency];
  activePlanPriceRangeMap = planPriceRangeMap;

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour < 10) {
      setGreeting("God morgon");
    } else if (hour < 17) {
      setGreeting("God eftermiddag");
    } else {
      setGreeting("God kväll");
    }
  }, []);

  useEffect(() => {
    async function loadUserAndSubscriptions() {
      const savedGuideChoice = localStorage.getItem("hasSkippedGuide");
      const savedSettings = localStorage.getItem("appSettings");
      const browserDefaults = getBrowserDefaultSettings();

      if (savedGuideChoice === "true") {
        setHasSkippedGuide(true);
      }

      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings) as AppSettings;
        setCurrency(parsedSettings.currency ?? browserDefaults.currency);
      } else {
        setCurrency(browserDefaults.currency);
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        let currentUserId = sessionData.session?.user.id ?? null;

        if (!currentUserId) {
          const { data: signInData, error: signInError } =
            await supabase.auth.signInAnonymously();

          if (signInError) {
            console.error(
              "Kunde inte skapa anonym testanvändare:",
              signInError.message,
            );
            setStorageStatus("Sparas bara lokalt just nu");
            loadSubscriptionsFromLocalBackup();
            setHasLoaded(true);
            return;
          }

          currentUserId = signInData.user?.id ?? null;
        }

        setUserId(currentUserId);

        if (currentUserId) {
          setStorageStatus("Dina ändringar sparas");
        }

        if (currentUserId) {
          const { data, error } = await supabase
            .from("subscriptions")
            .select(
              "id, name, category, price, billing_period, usage, plan, service_id, service_plan_id, price_confirmed",
            )
            .order("created_at", { ascending: false });

          if (error) {
            console.error("Kunde inte hämta tjänster:", error.message);
            setStorageStatus("Sparas bara lokalt just nu");
            loadSubscriptionsFromLocalBackup();
          } else {
            setSubscriptions((data ?? []).map(mapDbSubscription));
            setStorageStatus("Dina ändringar sparas");
          }
        }
      } catch (error) {
        console.error("Oväntat fel vid laddning av abonnemang:", error);
        setStorageStatus("Sparas bara lokalt just nu");
        loadSubscriptionsFromLocalBackup();
      }

      setHasLoaded(true);
    }

    function loadSubscriptionsFromLocalBackup() {
      const savedSubscriptions = localStorage.getItem("subscriptions");

      if (savedSubscriptions) {
        const parsedSubscriptions = JSON.parse(
          savedSubscriptions,
        ) as Subscription[];
        setSubscriptions(
          parsedSubscriptions.map((subscription) => ({
            ...subscription,
            category: getBenefitlyCategory(
              subscription.category,
              subscription.name,
            ),
          })),
        );
      }
    }

    loadUserAndSubscriptions();
  }, []);

  useEffect(() => {
    async function loadServiceCatalog() {
      const { data: services, error: servicesError } = await supabase
        .from("service_catalog")
        .select(
          "id, display_name, match_names, category, recommended_billing_period, note",
        )
        .order("display_name");

      if (servicesError) {
        console.error(
          "Kunde inte hämta service_catalog:",
          servicesError.message,
        );
        setCatalogServices(
          knownServices.map((service) => ({
            ...service,
            category: getBenefitlyCategory(
              service.category,
              service.displayName,
            ),
          })),
        );
        setPlanFeatureMap({});
        return;
      }

      const { data: plans, error: plansError } = await supabase
        .from("service_plans")
        .select("service_id, name")
        .order("name");

      if (plansError) {
        console.error("Kunde inte hämta service_plans:", plansError.message);
      }

      const plansByServiceId = new Map<string, string[]>();

      plans?.forEach((plan) => {
        const currentPlans = plansByServiceId.get(plan.service_id) ?? [];
        plansByServiceId.set(plan.service_id, [...currentPlans, plan.name]);
      });

      const serviceNameById = new Map<string, string>();
      services?.forEach((service) => {
        serviceNameById.set(service.id, service.display_name);
      });

      const mappedServices: KnownService[] =
        services?.map((service) => ({
          displayName: service.display_name,
          matchNames: service.match_names ?? [service.display_name],
          category: getBenefitlyCategory(
            service.category,
            service.display_name,
          ),
          plans: plansByServiceId.get(service.id) ?? [],
          recommendedBillingPeriod:
            service.recommended_billing_period === "yearly"
              ? "yearly"
              : "monthly",
          note:
            service.note ??
            `${service.display_name} känns igen. Kontrollera pris, plan och hur ofta du använder tjänsten.`,
        })) ?? knownServices;

      setCatalogServices(
        mappedServices.length > 0
          ? mappedServices
          : knownServices.map((service) => ({
              ...service,
              category: getBenefitlyCategory(
                service.category,
                service.displayName,
              ),
            })),
      );

      const { data: features, error: featuresError } = await supabase
        .from("plan_features")
        .select(
          "service_id, plan_name, group_name, title, description, priority, included",
        )
        .order("priority", { ascending: true })
        .order("title", { ascending: true });

      if (featuresError) {
        console.error("Kunde inte hämta plan_features:", featuresError.message);
        setPlanFeatureMap({});
        return;
      }

      const nextPlanFeatureMap: PlanFeatureMap = {};

      features?.forEach((feature) => {
        const serviceDisplayName = serviceNameById.get(feature.service_id);

        if (!serviceDisplayName) {
          return;
        }

        const planName = feature.plan_name ?? "";
        const key = getPlanFeatureKey(serviceDisplayName, planName);
        const mappedFeature: PlanFeature = {
          serviceDisplayName,
          planName,
          groupName: feature.group_name ?? "Ingår",
          title: feature.title,
          description: feature.description ?? undefined,
          priority: feature.priority ?? 100,
          included: feature.included ?? true,
        };

        nextPlanFeatureMap[key] = [
          ...(nextPlanFeatureMap[key] ?? []),
          mappedFeature,
        ];
      });

      setPlanFeatureMap(nextPlanFeatureMap);

      const { data: priceRanges, error: priceRangesError } = await supabase
        .from("plan_price_ranges")
        .select(
          "service_id, plan_name, currency, billing_period, low_price, typical_min_price, typical_max_price, high_price, price_level, rough_price_label, source_note",
        );

      if (priceRangesError) {
        console.error(
          "Kunde inte hämta plan_price_ranges:",
          priceRangesError.message,
        );
        setPlanPriceRangeMap({});
      } else {
        const nextPlanPriceRangeMap: PlanPriceRangeMap = {};

        priceRanges?.forEach((range) => {
          const serviceDisplayName = serviceNameById.get(range.service_id);

          if (!serviceDisplayName || !range.plan_name) {
            return;
          }

          const currencyCode = (range.currency ?? "SEK") as CurrencyCode;
          const billingPeriodValue: BillingPeriod =
            range.billing_period === "yearly" ? "yearly" : "monthly";
          const key = getPlanPriceRangeKey(
            serviceDisplayName,
            range.plan_name,
            currencyCode,
            billingPeriodValue,
          );

          nextPlanPriceRangeMap[key] = {
            serviceDisplayName,
            planName: range.plan_name,
            currency: currencyCode,
            billingPeriod: billingPeriodValue,
            lowPrice: range.low_price ?? undefined,
            typicalMinPrice: Number(range.typical_min_price),
            typicalMaxPrice: Number(range.typical_max_price),
            highPrice: range.high_price ?? undefined,
            priceLevel: range.price_level ?? undefined,
            roughPriceLabel: range.rough_price_label ?? undefined,
            sourceNote: range.source_note ?? undefined,
          };
        });

        setPlanPriceRangeMap(nextPlanPriceRangeMap);
      }
    }

    loadServiceCatalog();
  }, []);

  useEffect(() => {
    setSubscriptions((currentSubscriptions) =>
      currentSubscriptions.map((subscription) => ({
        ...subscription,
        benefits: getBenefitsForSubscription(
          subscription.name,
          subscription.category,
          subscription.plan,
          catalogServices,
          planFeatureMap,
        ),
      })),
    );
  }, [catalogServices, planFeatureMap]);

  useEffect(() => {
    if (hasLoaded) {
      localStorage.setItem("subscriptions", JSON.stringify(subscriptions));
    }
  }, [subscriptions, hasLoaded]);

  useEffect(() => {
    if (hasLoaded) {
      localStorage.setItem(
        "appSettings",
        JSON.stringify({ language: "sv", currency }),
      );
    }
  }, [currency, hasLoaded]);

  const monthlyCost = subscriptions.reduce(
    (sum, item) => sum + getMonthlyPrice(item),
    0,
  );
  const yearlyCost = subscriptions.reduce(
    (sum, item) => sum + getYearlyPrice(item),
    0,
  );

  const rarelyUsed = subscriptions.filter((item) => item.usage === "Sällan");

  const savingsCandidates = rarelyUsed.filter(
    (item) =>
      (getPriceSanity(item)?.level !== "low" || item.priceConfirmed) &&
      !isConfirmedVeryLowCost(item),
  );

  const possibleMonthlySavings = savingsCandidates.reduce(
    (sum, item) => sum + getMonthlyPrice(item),
    0,
  );

  const possibleYearlySavings = savingsCandidates.reduce(
    (sum, item) => sum + getYearlyPrice(item),
    0,
  );

  const monthlyCostAfterPossibleSavings = Math.max(
    0,
    monthlyCost - possibleMonthlySavings,
  );
  const yearlyCostAfterPossibleSavings = Math.max(
    0,
    yearlyCost - possibleYearlySavings,
  );

  const overlapInsights = getOverlapInsights(subscriptions);

  const strongWarnings = subscriptions.filter(
    (item) => item.usage === "Sällan" && getMonthlyPrice(item) >= 150,
  );

  const priceWarnings = subscriptions.filter(
    (item) => getPriceSanity(item) !== null,
  );

  const checkItems = getCheckItems(subscriptions, overlapInsights);
  const thingsToCheck = checkItems.length;

  const bestNextAction = getBestNextAction(subscriptions);
  const overallScore = getOverallBenefitlyScore(
    subscriptions,
    checkItems,
    possibleMonthlySavings,
  );
  const dashboardActions = getDashboardActions(subscriptions, overlapInsights);
  const savingsOpportunities = getSavingsOpportunities(
    subscriptions,
    overlapInsights,
  );
  const additionalPlanSavings = savingsOpportunities
    .filter((opportunity) => opportunity.kind === "plan")
    .reduce((sum, opportunity) => sum + (opportunity.monthlyAmount ?? 0), 0);

  function resetForm() {
    setName("");
    setCategory("Underhållning");
    setPrice("");
    setBillingPeriod("monthly");
    setUsage("Ofta");
    setPlan("");
    setEditingId(null);
  }

  function focusNameField() {
    window.setTimeout(() => {
      nameInputRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      nameInputRef.current?.focus();
    }, 50);
  }

  function handleNameChange(value: string) {
    setName(value);

    const service = findKnownService(value, catalogServices);

    if (service) {
      setCategory(getBenefitlyCategory(service.category, service.displayName));
      setBillingPeriod(service.recommendedBillingPeriod ?? "monthly");
    }
  }

  function handleChooseSuggestedService(service: KnownService) {
    setName(service.displayName);
    setCategory(getBenefitlyCategory(service.category, service.displayName));
    setBillingPeriod(service.recommendedBillingPeriod ?? "monthly");
    setPlan("");
    setShowServiceSuggestions(false);
  }

  async function saveSubscriptionFromForm(
    shouldAddAnother: boolean,
    skipPlanPriceWarning = false,
  ) {
    if (isSavingSubscription) {
      return;
    }

    const priceAsNumber = Math.round(Number(price));

    if (!name || price === "" || priceAsNumber < 0) {
      alert("Fyll i namn och ett pris som är 0 eller större.");
      return;
    }

    const cleanedPlan = plan.trim();
    const normalizedCategory = getBenefitlyCategory(category, name);
    const draftForPriceCheck: Subscription = {
      id: editingId ?? "draft",
      name,
      category: normalizedCategory,
      price: priceAsNumber,
      billingPeriod,
      usage,
      plan: cleanedPlan,
      priceConfirmed: false,
      benefits: [],
    };
    const planPriceWarning = getPlanPriceWarningMessage(draftForPriceCheck);

    if (planPriceWarning && !skipPlanPriceWarning) {
      setPendingPlanPriceWarning({
        message: planPriceWarning,
        shouldAddAnother,
      });
      return;
    }

    setPendingPlanPriceWarning(null);
    setIsSavingSubscription(true);
    setStorageStatus("Sparar...");

    if (editingId !== null) {
      const updatedSubscription: Subscription = {
        id: editingId,
        name,
        category: normalizedCategory,
        price: priceAsNumber,
        billingPeriod,
        usage,
        plan: cleanedPlan,
        priceConfirmed: skipPlanPriceWarning,
        benefits: getBenefitsForSubscription(
          name,
          normalizedCategory,
          cleanedPlan,
          catalogServices,
          planFeatureMap,
        ),
      };

      if (userId && !editingId.startsWith("demo-")) {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            name,
            category,
            price: priceAsNumber,
            currency,
            billing_period: billingPeriod,
            usage,
            plan: cleanedPlan || null,
            price_confirmed: skipPlanPriceWarning,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);

        if (error) {
          console.error("Kunde inte uppdatera tjänst:", error.message);
          alert("Det gick inte att spara ändringen i Supabase. Försök igen.");
          setStorageStatus("Kunde inte spara just nu");
          setIsSavingSubscription(false);
          return;
        }
      }

      setSubscriptions(
        subscriptions.map((item) =>
          item.id === editingId ? updatedSubscription : item,
        ),
      );

      resetForm();
      setShowForm(false);
      setIsSavingSubscription(false);
      setStorageStatus(userId ? "Dina ändringar sparas" : "Sparas lokalt");
      return;
    }

    let newSubscription: Subscription = {
      id: Date.now().toString(),
      name,
      category: normalizedCategory,
      price: priceAsNumber,
      billingPeriod,
      usage,
      plan: cleanedPlan,
      priceConfirmed: skipPlanPriceWarning,
      benefits: getBenefitsForSubscription(
        name,
        normalizedCategory,
        cleanedPlan,
        catalogServices,
        planFeatureMap,
      ),
    };

    if (userId) {
      const { data, error } = await supabase
        .from("subscriptions")
        .insert({
          user_id: userId,
          name,
          category: normalizedCategory,
          price: priceAsNumber,
          currency,
          billing_period: billingPeriod,
          usage,
          plan: cleanedPlan || null,
          price_confirmed: skipPlanPriceWarning,
          source: "manual",
          status: "active",
        })
        .select(
          "id, name, category, price, billing_period, usage, plan, service_id, service_plan_id, price_confirmed",
        )
        .single();

      if (error) {
        console.error("Kunde inte spara tjänst:", error.message);
        alert("Det gick inte att spara tjänsten i Supabase. Försök igen.");
        setStorageStatus("Kunde inte spara just nu");
        setIsSavingSubscription(false);
        return;
      }

      newSubscription = mapDbSubscription(data);
    }

    setSubscriptions([newSubscription, ...subscriptions]);

    resetForm();
    setShowForm(shouldAddAnother);
    setIsSavingSubscription(false);
    setStorageStatus(userId ? "Dina ändringar sparas" : "Sparas lokalt");

    if (shouldAddAnother) {
      focusNameField();
    }
  }

  async function handleAddOrUpdateSubscription(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const submitter = event.nativeEvent.submitter as HTMLButtonElement | null;
    const shouldAddAnother = submitter?.value === "addAnother";

    await saveSubscriptionFromForm(shouldAddAnother);
  }

  async function handleDeleteSubscription(id: string) {
    if (userId && !id.startsWith("demo-")) {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Kunde inte ta bort tjänst:", error.message);
        alert("Det gick inte att ta bort tjänsten i Supabase. Försök igen.");
        setStorageStatus("Kunde inte spara just nu");
        return;
      }
    }

    setSubscriptions(subscriptions.filter((item) => item.id !== id));
    setStorageStatus(userId ? "Dina ändringar sparas" : "Sparas lokalt");

    if (editingId === id) {
      resetForm();
      setShowForm(false);
    }
  }

  function handleEditSubscription(subscription: Subscription) {
    setEditingId(subscription.id);
    setName(subscription.name);
    setCategory(getBenefitlyCategory(subscription.category, subscription.name));
    setPrice(subscription.price.toString());
    setBillingPeriod(subscription.billingPeriod ?? "monthly");
    setUsage(subscription.usage);
    setPlan(subscription.plan ?? "");
    setShowForm(true);
  }

  async function handleConfirmPrice(id: string) {
    if (userId && !id.startsWith("demo-")) {
      const { error } = await supabase
        .from("subscriptions")
        .update({ price_confirmed: true, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        console.error("Kunde inte bekräfta pris:", error.message);
        alert("Det gick inte att bekräfta priset i Supabase. Försök igen.");
        setStorageStatus("Kunde inte spara just nu");
        return;
      }
    }

    setSubscriptions(
      subscriptions.map((item) =>
        item.id === id ? { ...item, priceConfirmed: true } : item,
      ),
    );
    setStorageStatus(userId ? "Dina ändringar sparas" : "Sparas lokalt");
  }

  function handleCancelEdit() {
    resetForm();
    setShowForm(false);
  }

  function handleSkipGuide() {
    setHasSkippedGuide(true);
    localStorage.setItem("hasSkippedGuide", "true");
  }

  function handleShowGuideAgain() {
    setHasSkippedGuide(false);
    localStorage.setItem("hasSkippedGuide", "false");
  }

  function handleGuideAddClick() {
    setShowForm(true);
    window.scrollTo({
      top: 520,
      behavior: "smooth",
    });
  }

  async function handleStartFromScratch() {
    const shouldReset = window.confirm(
      "Vill du rensa alla tjänster och börja från noll? Detta tar även bort dem från databasen.",
    );

    if (!shouldReset) {
      return;
    }

    if (userId) {
      setStorageStatus("Rensar...");

      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("user_id", userId);

      if (error) {
        console.error("Kunde inte rensa abonnemang:", error.message);
        alert("Det gick inte att rensa tjänsterna i Supabase. Försök igen.");
        setStorageStatus("Kunde inte spara just nu");
        return;
      }
    }

    setSubscriptions([]);
    localStorage.setItem("subscriptions", JSON.stringify([]));
    resetForm();
    setShowForm(true);
    setStorageStatus(userId ? "Dina ändringar sparas" : "Sparas lokalt");
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50 text-slate-950">
      <style>{`
        @keyframes benefitlyPanelIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="sticky top-0 z-30 -mx-4 mb-8 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-900 text-lg text-white shadow-sm">
                  🔎
                </div>
                <div>
                  <p className="text-lg font-black tracking-tight text-emerald-950">
                    Benefitly
                  </p>
                  <p className="hidden text-xs font-medium text-slate-500 sm:block">
                    Din smarta ekonomiassistent
                  </p>
                </div>
              </div>

              <nav className="hidden items-center gap-1 lg:flex">
                <a
                  href="#overview"
                  className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800"
                >
                  Översikt
                </a>
                <a
                  href="#services-section"
                  className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  Tjänster
                </a>
                <a
                  href="#assistant"
                  className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  Assistent
                </a>
              </nav>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(true)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-100"
                >
                  ⚙️
                </button>
                <div className="hidden sm:block">
                  <StorageStatusBadge status={storageStatus} />
                </div>
              </div>
            </div>
          </div>

          <section
            id="overview"
            className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]"
          >
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-emerald-700">
                Översikt
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                {greeting} 👋
              </h1>
              <p className="mt-3 max-w-2xl text-base font-medium text-slate-600 sm:text-lg">
                Här är det viktigaste Benefitly har hittat just nu.
              </p>

              <div className="mt-7 overflow-hidden rounded-[2rem] border border-emerald-200 bg-gradient-to-br from-emerald-950 to-emerald-800 text-white shadow-sm">
                <div className="p-5 sm:p-6">
                  <div className="grid gap-0 overflow-hidden rounded-2xl border border-white/15 bg-white/5 sm:grid-cols-3">
                    <div className="px-4 py-3 sm:px-5">
                      <p className="text-xs font-black uppercase tracking-wide text-emerald-100">
                        Total kostnad
                      </p>
                      <p className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                        {formatCurrency(monthlyCost)}
                        <span className="ml-1 text-sm font-bold text-emerald-100">
                          /mån
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-emerald-100">
                        {formatCurrency(yearlyCost)} per år
                      </p>
                    </div>

                    <div className="border-t border-white/15 px-4 py-3 sm:border-l sm:border-t-0 sm:px-5">
                      <p className="text-xs font-black uppercase tracking-wide text-emerald-100">
                        Besparing att undersöka
                      </p>
                      <p className="mt-1 text-2xl font-black tracking-tight text-emerald-50 sm:text-3xl">
                        {formatCurrency(possibleMonthlySavings)}
                        <span className="ml-1 text-sm font-bold text-emerald-100">
                          /mån
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-emerald-100">
                        {formatCurrency(possibleYearlySavings)} per år
                      </p>
                    </div>

                    <div className="border-t border-white/15 px-4 py-3 sm:border-l sm:border-t-0 sm:px-5">
                      <p className="text-xs font-black uppercase tracking-wide text-emerald-100">
                        Efter möjlig åtgärd
                      </p>
                      <p className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                        {formatCurrency(monthlyCostAfterPossibleSavings)}
                        <span className="ml-1 text-sm font-bold text-emerald-100">
                          /mån
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-emerald-100">
                        {formatCurrency(yearlyCostAfterPossibleSavings)} per år
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-emerald-900">
                          Nästa åtgärd
                        </span>
                        {dashboardActions[0] && (
                          <span className="text-[11px] font-black uppercase tracking-wide text-emerald-100">
                            {dashboardActions[0].badge}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 sm:flex sm:items-baseline sm:gap-3">
                        <h2 className="text-lg font-black sm:text-xl">
                          {dashboardActions[0]?.title ??
                            "Lägg till dina första tjänster"}
                        </h2>
                        <p className="mt-1 line-clamp-1 text-sm font-medium text-emerald-50 sm:mt-0">
                          {dashboardActions[0]?.subtitle ??
                            "Börja med streaming, mobil och ett medlemskap för en bättre analys."}
                        </p>
                      </div>
                    </div>
                    <a
                      href="#services-section"
                      className="inline-flex shrink-0 justify-center rounded-xl bg-white px-4 py-2 text-sm font-black text-emerald-900 hover:bg-emerald-50"
                    >
                      Öppna tjänster →
                    </a>
                  </div>

                  {subscriptions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSavingsSheet(true)}
                      className="mt-3 flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-sm font-black text-emerald-50 transition hover:bg-white/10 hover:text-white"
                    >
                      <span>
                        Visa {savingsOpportunities.length} besparingsmöjlighet
                        {savingsOpportunities.length === 1 ? "" : "er"}
                        {additionalPlanSavings > 0
                          ? ` · ytterligare cirka ${formatCurrency(additionalPlanSavings)}/mån i planbyten`
                          : ""}
                      </span>
                      <span aria-hidden="true">→</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <div>
                    <p className="text-sm font-bold text-slate-500">
                      {thingsToCheck === 0
                        ? "Status just nu"
                        : "Behöver din uppmärksamhet"}
                    </p>
                    <p
                      className={`mt-1 font-black ${thingsToCheck === 0 ? "text-base text-emerald-700" : "text-2xl text-amber-700"}`}
                    >
                      {thingsToCheck === 0
                        ? "Inget behöver ses över"
                        : thingsToCheck}
                    </p>
                  </div>
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl ${thingsToCheck === 0 ? "bg-emerald-100" : "bg-amber-100"}`}
                  >
                    {thingsToCheck === 0 ? "🎉" : "⚠️"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <div>
                    <p className="text-sm font-bold text-slate-500">
                      Tjänster analyserade
                    </p>
                    <p
                      className={`mt-1 font-black text-emerald-700 ${subscriptions.length === 0 ? "text-base" : "text-2xl"}`}
                    >
                      {subscriptions.length === 0
                        ? "Ingen analys ännu"
                        : `${subscriptions.length} tjänster`}
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100">
                    ✓
                  </span>
                </div>
              </div>
            </div>

            <BenefitlyScorePanel
              score={overallScore}
              subscriptions={subscriptions}
              checkItems={checkItems}
            />
          </section>
        </header>

        <div className="mb-6 flex flex-wrap gap-3 md:hidden">
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"
          >
            ⚙️ Inställningar
          </button>
          <StorageStatusBadge status={storageStatus} />
        </div>

        {!hasSkippedGuide && (
          <GettingStartedGuide
            onAddClick={handleGuideAddClick}
            onSkipClick={handleSkipGuide}
          />
        )}

        <section id="services-section" className="mt-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight">
                Dina tjänster
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Snabb överblick över kostnad, användning, förmåner och nästa
                åtgärd.
              </p>
            </div>

            <button
              onClick={() => {
                if (showForm) {
                  resetForm();
                }

                setShowForm(!showForm);
              }}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              {showForm ? "Stäng" : "+ Lägg till"}
            </button>
          </div>

          {showForm && (
            <form
              onSubmit={handleAddOrUpdateSubscription}
              className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-xl font-black">
                {editingId !== null ? "Redigera tjänst" : "Lägg till tjänst"}
              </h3>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <FormField label="Namn">
                  <div className="relative">
                    <input
                      ref={nameInputRef}
                      value={name}
                      onChange={(event) => {
                        handleNameChange(event.target.value);
                        setShowServiceSuggestions(true);
                      }}
                      onFocus={() => setShowServiceSuggestions(true)}
                      onBlur={() => {
                        window.setTimeout(
                          () => setShowServiceSuggestions(false),
                          150,
                        );
                      }}
                      placeholder="Välj en vanlig tjänst eller skriv själv"
                      className={inputClassName}
                    />

                    {showServiceSuggestions && suggestedServices.length > 0 && (
                      <ServiceSuggestionDropdown
                        services={suggestedServices}
                        onChoose={handleChooseSuggestedService}
                      />
                    )}
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Du behöver inte veta allt direkt. Välj en vanlig tjänst
                    eller skriv själv och fyll på detaljer senare.
                  </p>
                </FormField>

                <div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
                    <FormField label="Pris">
                      <input
                        value={price}
                        onChange={(event) => setPrice(event.target.value)}
                        placeholder="Exempel: 179"
                        type="number"
                        min="0"
                        className={inputClassName}
                      />
                    </FormField>

                    <FormField label="Betalas">
                      <select
                        value={billingPeriod}
                        onChange={(event) =>
                          setBillingPeriod(event.target.value as BillingPeriod)
                        }
                        className={inputClassName}
                      >
                        <option value="monthly">Per månad</option>
                        <option value="yearly">Per år</option>
                      </select>
                    </FormField>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Standard är per månad. Välj bara per år om tjänsten betalas
                    årsvis, till exempel Microsoft 365 eller PlayStation Plus.
                  </p>
                </div>

                {recognizedService && (
                  <div className="md:col-span-2">
                    <RecognizedServiceBox
                      service={recognizedService}
                      selectedPlan={plan}
                      onPlanChange={setPlan}
                      onUseCategory={() =>
                        setCategory(
                          getBenefitlyCategory(
                            recognizedService.category,
                            recognizedService.displayName,
                          ),
                        )
                      }
                      onUseBillingPeriod={() =>
                        setBillingPeriod(
                          recognizedService.recommendedBillingPeriod ??
                            "monthly",
                        )
                      }
                      onChoosePlan={(selectedPlan) => setPlan(selectedPlan)}
                    />
                  </div>
                )}

                <FormField label="Kategori">
                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(event.target.value as BenefitlyCategory)
                    }
                    className={inputClassName}
                  >
                    {categoryOptions.map((categoryName) => (
                      <option key={categoryName} value={categoryName}>
                        {categoryName}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Användning">
                  <select
                    value={usage}
                    onChange={(event) => setUsage(event.target.value)}
                    className={inputClassName}
                  >
                    <option>Ofta</option>
                    <option>Ibland</option>
                    <option>Sällan</option>
                  </select>
                </FormField>

                {!recognizedService && (
                  <div className="md:col-span-2">
                    <FormField label="Plan / nivå">
                      <input
                        value={plan}
                        onChange={(event) => setPlan(event.target.value)}
                        placeholder="Exempel: Basic, Standard, Premium, Family, Student"
                        className={inputClassName}
                      />
                    </FormField>
                    <p className="mt-1 text-xs text-slate-500">
                      Valfritt. Skriv plan om du vet den, annars kan du lämna
                      tomt.
                    </p>
                  </div>
                )}
              </div>

              {livePlanPriceWarning && (
                <InlinePlanPriceWarning message={livePlanPriceWarning} />
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  value="save"
                  disabled={isSavingSubscription}
                  className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSavingSubscription
                    ? "Sparar..."
                    : editingId !== null
                      ? "Spara ändringar"
                      : "Spara tjänst"}
                </button>

                {editingId === null && (
                  <button
                    type="submit"
                    value="addAnother"
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
                  >
                    Spara och lägg till en till
                  </button>
                )}

                {editingId !== null && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Avbryt
                  </button>
                )}
              </div>
            </form>
          )}

          {subscriptions.length === 0 ? (
            <EmptyState onAddClick={() => setShowForm(true)} />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {subscriptions.map((subscription) => (
                <CompactSubscriptionRow
                  key={subscription.id}
                  subscription={subscription}
                  subscriptions={subscriptions}
                  onDelete={handleDeleteSubscription}
                  onEdit={handleEditSubscription}
                  onConfirmPrice={handleConfirmPrice}
                  onShowAnalysis={setAnalysisSubscription}
                  onCompare={setCompareSubscription}
                />
              ))}
            </div>
          )}
        </section>

        <BenefitlyInbox
          subscriptions={subscriptions}
          overlapInsights={overlapInsights}
        />
      </section>

      {showSavingsSheet && (
        <SavingsOpportunitiesSheet
          opportunities={savingsOpportunities}
          directMonthlySavings={possibleMonthlySavings}
          additionalPlanSavings={additionalPlanSavings}
          onClose={() => setShowSavingsSheet(false)}
          onOpenAnalysis={(subscriptionId) => {
            const subscription = subscriptions.find(
              (item) => item.id === subscriptionId,
            );
            if (subscription) {
              setAnalysisSubscription(subscription);
              setShowSavingsSheet(false);
            }
          }}
        />
      )}

      {pendingPlanPriceWarning && (
        <PlanPriceWarningModal
          message={pendingPlanPriceWarning.message}
          onCancel={() => setPendingPlanPriceWarning(null)}
          onConfirm={() =>
            saveSubscriptionFromForm(
              pendingPlanPriceWarning.shouldAddAnother,
              true,
            )
          }
        />
      )}

      {showPremiumDetails && (
        <PremiumDetailsModal onClose={() => setShowPremiumDetails(false)} />
      )}

      {analysisSubscription && (
        <ServiceAnalysisModal
          subscription={analysisSubscription}
          onClose={() => setAnalysisSubscription(null)}
          onCompare={() => {
            setCompareSubscription(analysisSubscription);
            setAnalysisSubscription(null);
          }}
        />
      )}

      {compareSubscription && (
        <ServiceComparisonModal
          subscription={compareSubscription}
          subscriptions={subscriptions}
          onClose={() => setCompareSubscription(null)}
        />
      )}

      {showSettings && (
        <SettingsModal
          currency={currency}
          onCurrencyChange={setCurrency}
          onClose={() => setShowSettings(false)}
        />
      )}
    </main>
  );
}

function normalizeText(text: string) {
  return text.toLowerCase().trim();
}

function getPlanText(plan?: string) {
  return normalizeText(plan ?? "");
}

function getPlanFeatureKey(serviceName: string, planName?: string) {
  return `${normalizeText(serviceName)}::${normalizeText(planName ?? "")}`;
}

function getPlanPriceRangeKey(
  serviceName: string,
  planName: string | undefined,
  currency: CurrencyCode = activeCurrency,
  billingPeriod: BillingPeriod = "monthly",
) {
  return `${normalizeText(serviceName)}::${normalizeText(planName ?? "")}::${currency}::${billingPeriod}`;
}

function getPlanFeaturesForSubscription(
  name: string,
  plan: string | undefined,
  services: KnownService[],
  planFeatureMap?: PlanFeatureMap,
) {
  const service = findKnownService(name, services);

  if (!service || !planFeatureMap) {
    return [];
  }

  const exactPlanFeatures =
    planFeatureMap[getPlanFeatureKey(service.displayName, plan)] ?? [];

  if (exactPlanFeatures.length > 0) {
    return exactPlanFeatures;
  }

  return planFeatureMap[getPlanFeatureKey(service.displayName, "")] ?? [];
}

function getFeatureBenefitTexts(features: PlanFeature[]) {
  return features
    .filter((feature) => feature.included)
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      return a.title.localeCompare(b.title, "sv");
    })
    .map((feature) =>
      feature.description
        ? `${feature.title}: ${feature.description}`
        : feature.title,
    );
}

function findKnownService(name: string, services = knownServices) {
  const normalizedName = normalizeText(name);

  if (!normalizedName) {
    return null;
  }

  const normalizedServices = services.map((service) => ({
    service,
    displayName: normalizeText(service.displayName),
    matchNames: service.matchNames
      .map((matchName) => normalizeText(matchName))
      .filter(Boolean),
  }));

  const exactMatch = normalizedServices.find(
    ({ displayName, matchNames }) =>
      displayName === normalizedName ||
      matchNames.some((matchName) => matchName === normalizedName),
  );

  if (exactMatch) {
    return exactMatch.service;
  }

  const startsWithMatch = normalizedServices.find(
    ({ displayName, matchNames }) =>
      displayName.startsWith(normalizedName) ||
      matchNames.some((matchName) => matchName.startsWith(normalizedName)),
  );

  if (startsWithMatch) {
    return startsWithMatch.service;
  }

  if (normalizedName.length < 3) {
    return null;
  }

  return (
    normalizedServices.find(({ displayName, matchNames }) =>
      [displayName, ...matchNames].some(
        (candidate) =>
          candidate.length >= 3 &&
          (candidate === normalizedName ||
            candidate.startsWith(normalizedName) ||
            normalizedName.startsWith(candidate)),
      ),
    )?.service ?? null
  );
}

function getSuggestedServices(searchText: string, services = knownServices) {
  const normalizedSearch = normalizeText(searchText);

  if (!normalizedSearch) {
    return services.slice(0, 18);
  }

  return services
    .map((service) => {
      const displayName = normalizeText(service.displayName);
      const category = normalizeText(service.category);
      const normalizedMatchNames = service.matchNames.map((matchName) =>
        normalizeText(matchName),
      );

      let score = -1;

      if (displayName.startsWith(normalizedSearch)) {
        score = 100;
      } else if (
        normalizedMatchNames.some((matchName) =>
          matchName.startsWith(normalizedSearch),
        )
      ) {
        score = 90;
      } else if (displayName.includes(normalizedSearch)) {
        score = 70;
      } else if (
        normalizedMatchNames.some((matchName) =>
          matchName.includes(normalizedSearch),
        )
      ) {
        score = 60;
      } else if (category.startsWith(normalizedSearch)) {
        score = 40;
      } else if (category.includes(normalizedSearch)) {
        score = 30;
      }

      return {
        service,
        score,
      };
    })
    .filter((result) => result.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.service.displayName.localeCompare(b.service.displayName, "sv");
    })
    .map((result) => result.service)
    .slice(0, 12);
}

function hasName(subscription: Subscription, words: string[]) {
  const normalizedName = normalizeText(subscription.name);
  return words.some((word) => normalizedName.includes(word));
}

type PriceSanityLevel = "low" | "unusual" | "extreme";

type PriceSanity = {
  level: PriceSanityLevel;
  unusualLimit?: number;
  extremeLimit?: number;
  lowLimit?: number;
  categoryLabel: string;
};

function getCurrencyMultiplier() {
  if (activeCurrency === "EUR") {
    return 0.1;
  }

  if (activeCurrency === "USD") {
    return 0.1;
  }

  if (activeCurrency === "GBP") {
    return 0.08;
  }

  if (activeCurrency === "DKK") {
    return 0.7;
  }

  return 1;
}

function getPriceLimitsForCategory(category: string) {
  const normalizedCategory = getBenefitlyCategory(category);
  const multiplier = getCurrencyMultiplier();

  function makeLimit(unusual: number, extreme: number, categoryLabel: string) {
    return {
      unusual: Math.round(unusual * multiplier),
      extreme: Math.round(extreme * multiplier),
      categoryLabel,
    };
  }

  if (normalizedCategory === "Underhållning") {
    return makeLimit(500, 1000, "underhållning");
  }

  if (normalizedCategory === "Digitala tjänster") {
    return makeLimit(500, 1000, "digitala tjänster");
  }

  if (normalizedCategory === "Hälsa och träning") {
    return makeLimit(1000, 2000, "hälsa och träning");
  }

  if (normalizedCategory === "Kommunikation") {
    return makeLimit(800, 1500, "kommunikation");
  }

  if (normalizedCategory === "Kommunikation") {
    return makeLimit(800, 1500, "kommunikation");
  }

  if (normalizedCategory === "Hem och boende") {
    return makeLimit(3000, 6000, "hem och boende");
  }

  if (normalizedCategory === "Ekonomi och försäkring") {
    return makeLimit(500, 1000, "ekonomi och försäkring");
  }

  if (normalizedCategory === "Ekonomi och försäkring") {
    return makeLimit(500, 1000, "ekonomi och försäkring");
  }

  if (normalizedCategory === "Ekonomi och försäkring") {
    return makeLimit(2000, 4000, "ekonomi och försäkring");
  }

  if (normalizedCategory === "Shopping och medlemskap") {
    return makeLimit(500, 1000, "shopping och medlemskap");
  }

  if (normalizedCategory === "Shopping och medlemskap") {
    return makeLimit(500, 1000, "shopping och medlemskap");
  }

  if (normalizedCategory === "Shopping och medlemskap") {
    return makeLimit(1000, 2000, "shopping och medlemskap");
  }

  return makeLimit(1000, 2000, "den här typen av tjänst");
}

function getServicesThatCanBeFree() {
  return [
    "IKEA Family",
    "H&M",
    "ICA",
    "Coop",
    "Willys Plus",
    "Stadium",
    "SJ Prio",
    "KICKS Club",
    "Åhléns",
    "Apotek Hjärtat",
    "Lyko",
  ];
}

function isLikelyFreeMembership(subscription: Subscription) {
  if (getMonthlyPrice(subscription) !== 0) {
    return false;
  }

  const service = findKnownService(subscription.name);

  if (service && getServicesThatCanBeFree().includes(service.displayName)) {
    return true;
  }

  return (
    getBenefitlyCategory(subscription.category, subscription.name) ===
    "Shopping och medlemskap"
  );
}

function getVeryLowCostLimit() {
  return Math.round(20 * getCurrencyMultiplier());
}

function isConfirmedVeryLowCost(subscription: Subscription) {
  return (
    subscription.priceConfirmed === true &&
    getMonthlyPrice(subscription) > 0 &&
    getMonthlyPrice(subscription) < getVeryLowCostLimit()
  );
}

function getLowPriceLimitForKnownPaidService(subscription: Subscription) {
  const service = findKnownService(subscription.name);

  if (!service) {
    return null;
  }

  if (getServicesThatCanBeFree().includes(service.displayName)) {
    return null;
  }

  const categoriesThatUsuallyCostMoney: BenefitlyCategory[] = [
    "Underhållning",
    "Digitala tjänster",
    "Kommunikation",
    "Hälsa och träning",
    "Shopping och medlemskap",
    "Ekonomi och försäkring",
    "Hem och boende",
    "Resor och transport",
    "Utbildning",
  ];

  if (
    !categoriesThatUsuallyCostMoney.includes(
      getBenefitlyCategory(service.category, service.displayName),
    )
  ) {
    return null;
  }

  return Math.round(20 * getCurrencyMultiplier());
}

function getRawPriceSanity(subscription: Subscription): PriceSanity | null {
  const planPriceSanity = getPlanPriceSanity(subscription);

  if (planPriceSanity) {
    return planPriceSanity;
  }

  const limits = getPriceLimitsForCategory(subscription.category);
  const monthlyPrice = getMonthlyPrice(subscription);
  const lowPriceLimit = getLowPriceLimitForKnownPaidService(subscription);
  const globalExtremeLimit = Math.round(10000 * getCurrencyMultiplier());

  if (lowPriceLimit !== null && monthlyPrice < lowPriceLimit) {
    return {
      level: "low",
      lowLimit: lowPriceLimit,
      categoryLabel: "känd betaltjänst",
    };
  }

  if (monthlyPrice >= globalExtremeLimit) {
    return {
      level: "extreme",
      unusualLimit: limits.unusual,
      extremeLimit: globalExtremeLimit,
      categoryLabel: "den här typen av tjänst",
    };
  }

  if (monthlyPrice >= limits.extreme) {
    return {
      level: "extreme",
      unusualLimit: limits.unusual,
      extremeLimit: limits.extreme,
      categoryLabel: limits.categoryLabel,
    };
  }

  if (monthlyPrice >= limits.unusual) {
    return {
      level: "unusual",
      unusualLimit: limits.unusual,
      extremeLimit: limits.extreme,
      categoryLabel: limits.categoryLabel,
    };
  }

  return null;
}

function getPriceSanity(subscription: Subscription): PriceSanity | null {
  if (subscription.priceConfirmed) {
    return null;
  }

  return getRawPriceSanity(subscription);
}

function getHighestPriceWarning(subscriptions: Subscription[]) {
  function getWarningPriority(sanity: PriceSanity | null) {
    if (sanity?.level === "extreme") {
      return 3;
    }

    if (sanity?.level === "unusual") {
      return 2;
    }

    if (sanity?.level === "low") {
      return 1;
    }

    return 0;
  }

  return [...subscriptions]
    .filter((item) => getPriceSanity(item) !== null)
    .sort((a, b) => {
      const aSanity = getPriceSanity(a);
      const bSanity = getPriceSanity(b);
      const priorityDifference =
        getWarningPriority(bSanity) - getWarningPriority(aSanity);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      if (aSanity?.level === "low" && bSanity?.level === "low") {
        return getMonthlyPrice(a) - getMonthlyPrice(b);
      }

      return getMonthlyPrice(b) - getMonthlyPrice(a);
    })[0];
}

function formatOverlapNames(items: Subscription[]) {
  const names = items.map((item) => item.name);

  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]} + ${names[1]}`;
  }

  return `${names[0]}, ${names[1]} och ${names.length - 2} till`;
}

function getOverlapInsights(subscriptions: Subscription[]): Insight[] {
  const insights: Insight[] = [];

  const cloudServices = subscriptions.filter(
    (item) =>
      getBenefitlyCategory(item.category, item.name) === "Digitala tjänster" ||
      hasName(item, ["icloud", "google one", "microsoft 365", "dropbox"]),
  );

  const musicServices = subscriptions.filter((item) =>
    hasName(item, [
      "spotify",
      "apple music",
      "youtube music",
      "youtube premium",
    ]),
  );

  const streamingServices = subscriptions.filter(
    (item) =>
      getBenefitlyCategory(item.category, item.name) === "Underhållning" ||
      hasName(item, [
        "netflix",
        "disney",
        "hbo",
        "max",
        "viaplay",
        "prime video",
        "tv4",
        "crunchyroll",
      ]),
  );

  const insuranceServices = subscriptions.filter(
    (item) =>
      getBenefitlyCategory(item.category, item.name) ===
        "Ekonomi och försäkring" ||
      hasName(item, ["försäkring", "kreditkort", "bankkort"]),
  );

  if (cloudServices.length > 1) {
    insights.push({
      title: `${formatOverlapNames(cloudServices)} kan överlappa`,
      text: "Du kan betala för molnlagring på flera ställen. Kolla om en tjänst räcker.",
    });
  }

  if (musicServices.length > 1) {
    insights.push({
      title: `${formatOverlapNames(musicServices)} kan ge musik`,
      text: "Du kan betala dubbelt för musik. Kolla om en av tjänsterna redan täcker behovet.",
    });
  }

  if (streamingServices.length >= 3) {
    insights.push({
      title: `${streamingServices.length} streamingtjänster att jämföra`,
      text: `Du har ${streamingServices.length} streamingtjänster: ${streamingServices.map((item) => item.name).join(", ")}. Kontrollera om alla används varje månad eller om någon kan pausas.`,
    });
  }

  if (insuranceServices.length > 1) {
    insights.push({
      title: `${formatOverlapNames(insuranceServices)} kan ge överlappande skydd`,
      text: "Bankkort, hemförsäkring och reseförsäkring kan ibland ge liknande skydd.",
    });
  }

  const featureOverlap = getFeatureOverlapInsight(subscriptions);

  if (featureOverlap) {
    insights.push(featureOverlap);
  }

  return insights;
}

function getFeatureOverlapInsight(
  subscriptions: Subscription[],
): Insight | null {
  const comparableBenefitsByName = new Map<string, Subscription[]>();

  subscriptions.forEach((subscription) => {
    subscription.benefits.filter(isComparableBenefit).forEach((benefit) => {
      const key = normalizeComparableBenefit(benefit);
      const current = comparableBenefitsByName.get(key) ?? [];

      if (!current.some((item) => item.id === subscription.id)) {
        comparableBenefitsByName.set(key, [...current, subscription]);
      }
    });
  });

  const sharedBenefits = [...comparableBenefitsByName.entries()]
    .filter(([, items]) => items.length > 1)
    .sort(([, aItems], [, bItems]) => bItems.length - aItems.length);

  if (sharedBenefits.length === 0) {
    return null;
  }

  const involvedSubscriptions = [
    ...new Map(
      sharedBenefits
        .flatMap(([, items]) => items)
        .map((item) => [item.id, item] as const),
    ).values(),
  ];

  const featureLabels = sharedBenefits
    .slice(0, 3)
    .map(([benefit]) => benefit)
    .join(", ");

  return {
    title: `${formatOverlapNames(involvedSubscriptions)} delar funktioner`,
    text: `De delar bland annat ${featureLabels}. Kontrollera om du behöver betala för samma typ av funktion på flera ställen.`,
  };
}

function normalizeComparableBenefit(benefit: string) {
  return benefit.split(":")[0].trim();
}

function isComparableBenefit(benefit: string) {
  const normalizedBenefit = normalizeText(normalizeComparableBenefit(benefit));

  if (normalizedBenefit.length < 3) {
    return false;
  }

  const genericPhrases = [
    "kontrollera",
    "kan finnas",
    "kan bero",
    "förmåner kan",
    "jämför",
    "villkor",
    "angiven plan",
    "lägg gärna",
  ];

  return !genericPhrases.some((phrase) => normalizedBenefit.includes(phrase));
}

function getCheckItems(
  subscriptions: Subscription[],
  overlapInsights: Insight[],
): CheckItem[] {
  const subscriptionChecks = subscriptions
    .map((subscription) => {
      const reasons: string[] = [];
      const priceSanity = getPriceSanity(subscription);
      const monthlyPrice = getMonthlyPrice(subscription);

      if (priceSanity?.level === "low") {
        reasons.push("Priset verkar ovanligt lågt");
      }

      if (priceSanity?.level === "unusual") {
        reasons.push("Priset verkar ovanligt högt");
      }

      if (priceSanity?.level === "extreme") {
        reasons.push("Priset verkar extremt högt");
      }

      if (!isConfirmedVeryLowCost(subscription)) {
        if (subscription.usage === "Sällan" && monthlyPrice >= 150) {
          reasons.push("Används sällan och kostar en del");
        } else if (subscription.usage === "Sällan") {
          reasons.push("Används sällan");
        }
      }

      if (subscription.usage === "Ibland" && monthlyPrice >= 250) {
        reasons.push("Används ibland och kostar en del");
      }

      if (
        getBenefitlyCategory(subscription.category, subscription.name) ===
          "Kommunikation" &&
        monthlyPrice >= 250
      ) {
        reasons.push("Mobilkostnaden kan vara värd att jämföra");
      }

      if (reasons.length === 0) {
        return null;
      }

      return {
        id: `subscription-${subscription.id}`,
        title: subscription.name,
        reasons,
      };
    })
    .filter((item): item is CheckItem => item !== null);

  const overlapChecks = overlapInsights.map((insight, index) => ({
    id: `overlap-${index}`,
    title: insight.title,
    reasons: [insight.text],
  }));

  return [...subscriptionChecks, ...overlapChecks];
}

function getBestNextAction(subscriptions: Subscription[]): Insight | null {
  if (subscriptions.length === 0) {
    return {
      title: "Lägg till dina första tjänster",
      text: "Börja med 3–5 tjänster, till exempel streaming, mobil, gym eller bankkort.",
    };
  }

  const priceWarning = getHighestPriceWarning(subscriptions);

  if (priceWarning) {
    const sanity = getPriceSanity(priceWarning);

    if (sanity) {
      if (sanity.level === "low") {
        return {
          title: `Kontrollera priset på ${priceWarning.name}`,
          text: `${priceWarning.name} kostar ${formatCurrency(
            getMonthlyPrice(priceWarning),
          )}/mån, vilket verkar ovanligt lågt för en känd betaltjänst. Kontrollera om priset är rätt inskrivet, om det är kampanjpris, delad kostnad, provperiod eller om något saknas.`,
        };
      }

      if (
        priceWarning.usage === "Sällan" &&
        getMonthlyPrice(priceWarning) >= 150
      ) {
        return {
          title: `Börja med ${priceWarning.name}`,
          text: `${priceWarning.name} kostar ${formatCurrency(
            getMonthlyPrice(priceWarning),
          )}/mån, används sällan och verkar ${
            sanity.level === "extreme" ? "extremt dyrt" : "dyrt"
          } för ${sanity.categoryLabel}. Pausa, byt plan eller säg upp om du inte använder premiuminnehållet.`,
        };
      }

      return {
        title: `Kontrollera priset på ${priceWarning.name}`,
        text: `${priceWarning.name} kostar ${formatCurrency(
          getMonthlyPrice(priceWarning),
        )}/mån, vilket verkar ${
          sanity.level === "extreme" ? "extremt högt" : "ovanligt högt"
        } för ${sanity.categoryLabel}. Det kan vara rimligt om förmånerna är mycket värdefulla, men kontrollera priset, betalperioden och vad som ingår.`,
      };
    }
  }

  const rarelyUsedExpensive = subscriptions
    .filter((item) => item.usage === "Sällan" && getMonthlyPrice(item) >= 150)
    .sort((a, b) => getMonthlyPrice(b) - getMonthlyPrice(a));

  if (rarelyUsedExpensive.length > 0) {
    const item = rarelyUsedExpensive[0];

    return {
      title: `Börja med ${item.name}`,
      text: `${item.name} kostar ${formatCurrency(
        getMonthlyPrice(item),
      )}/mån och används sällan. Det är din tydligaste sparsignal just nu.`,
    };
  }

  const firstOverlap = getOverlapInsights(subscriptions)[0];

  if (firstOverlap) {
    return {
      title: `Jämför: ${firstOverlap.title}`,
      text: firstOverlap.text,
    };
  }

  const mobileSubscriptions = subscriptions
    .filter(
      (item) =>
        getBenefitlyCategory(item.category, item.name) === "Kommunikation" ||
        hasName(item, [
          "telia",
          "tele2",
          "telenor",
          "halebop",
          "vimla",
          "comviq",
          "hallon",
          "tre",
          "3",
        ]),
    )
    .sort((a, b) => getMonthlyPrice(b) - getMonthlyPrice(a));

  const mobileToCheck = mobileSubscriptions.find(
    (item) => getMonthlyPrice(item) >= 250 || item.usage !== "Ofta",
  );

  if (mobileToCheck) {
    return {
      title: `Kolla surfmängden i ${mobileToCheck.name}`,
      text: `Gratisversionen kan inte se faktisk mobildata, men ${mobileToCheck.name} kostar ${formatCurrency(
        getMonthlyPrice(mobileToCheck),
      )}/mån. Kolla om en billigare surfmängd räcker.`,
    };
  }

  const cardOrInsurance = subscriptions.find(
    (item) =>
      getBenefitlyCategory(item.category, item.name) ===
        "Ekonomi och försäkring" ||
      hasName(item, ["bankkort", "kreditkort", "försäkring"]),
  );

  if (cardOrInsurance) {
    return {
      title: `Kolla förmånerna i ${cardOrInsurance.name}`,
      text: "Se om reseförsäkring, köpskydd, rabatter eller annat skydd redan ingår så att du inte betalar dubbelt.",
    };
  }

  const rarelyUsed = subscriptions
    .filter((item) => item.usage === "Sällan" && !isConfirmedVeryLowCost(item))
    .sort((a, b) => getMonthlyPrice(b) - getMonthlyPrice(a));

  if (rarelyUsed.length > 0) {
    const item = rarelyUsed[0];

    return {
      title: `Kolla ${item.name}`,
      text: `${item.name} används sällan. Fundera på om den fortfarande behövs.`,
    };
  }

  const sometimesExpensive = subscriptions
    .filter((item) => item.usage === "Ibland" && getMonthlyPrice(item) >= 250)
    .sort((a, b) => getMonthlyPrice(b) - getMonthlyPrice(a));

  if (sometimesExpensive.length > 0) {
    const item = sometimesExpensive[0];

    return {
      title: `Kolla priset på ${item.name}`,
      text: `${item.name} kostar ${formatCurrency(
        getMonthlyPrice(item),
      )}/mån och används ibland. Se om billigare plan räcker.`,
    };
  }

  const mostExpensive = [...subscriptions].sort(
    (a, b) => getMonthlyPrice(b) - getMonthlyPrice(a),
  )[0];

  if (mostExpensive) {
    return {
      title: `Kontrollera planen för ${mostExpensive.name}`,
      text: `${mostExpensive.name} är din dyraste tjänst. Kontrollera att du har rätt plan.`,
    };
  }

  return null;
}

function getValueAssessment(subscription: Subscription) {
  const priceSanity = getPriceSanity(subscription);

  if (isLikelyFreeMembership(subscription)) {
    return {
      label: "Gratis medlemskap",
      description:
        "Kostar 0 kr. Värdet beror på om rabatter, bonus eller förmåner används.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  if (priceSanity?.level === "low") {
    return {
      label: "Ovanligt lågt pris",
      description: `${formatCurrency(
        getMonthlyPrice(subscription),
      )}/mån verkar ovanligt lågt för en känd betaltjänst.`,
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (
    priceSanity &&
    priceSanity.level !== "low" &&
    subscription.usage === "Sällan" &&
    getMonthlyPrice(subscription) >= 150
  ) {
    return {
      label: "Dyrt för låg användning",
      description: `${formatCurrency(
        getMonthlyPrice(subscription),
      )}/mån, används sällan och verkar ${
        priceSanity.level === "extreme" ? "extremt högt" : "högt"
      } för ${priceSanity.categoryLabel}.`,
      className: "border-red-200 bg-red-50 text-red-800",
    };
  }

  if (priceSanity?.level === "extreme") {
    return {
      label: "Extremt hög kostnad",
      description: `${formatCurrency(
        getMonthlyPrice(subscription),
      )}/mån verkar extremt högt. Det kan vara rimligt om förmånerna är mycket värdefulla.`,
      className: "border-red-200 bg-red-50 text-red-800",
    };
  }

  if (priceSanity?.level === "unusual") {
    return {
      label: "Ovanligt hög kostnad",
      description: `${formatCurrency(
        getMonthlyPrice(subscription),
      )}/mån verkar högt för ${priceSanity.categoryLabel}.`,
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (isConfirmedVeryLowCost(subscription)) {
    return {
      label: "Låg kostnad",
      description: `Priset är bekräftat och kostnaden är bara ${formatCurrency(
        getMonthlyPrice(subscription),
      )}/mån.`,
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  if (subscription.usage === "Sällan" && getMonthlyPrice(subscription) >= 150) {
    return {
      label: "Dyrt för låg användning",
      description: `${formatCurrency(
        getMonthlyPrice(subscription),
      )}/mån och används sällan.`,
      className: "border-red-200 bg-red-50 text-red-800",
    };
  }

  if (subscription.usage === "Sällan") {
    return {
      label: "Kolla upp",
      description: "Används sällan. Fundera på om den behövs.",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (subscription.usage === "Ibland" && getMonthlyPrice(subscription) >= 250) {
    return {
      label: "Kolla priset",
      description: "Används ibland men kostar en del.",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (subscription.usage === "Ofta" && getMonthlyPrice(subscription) <= 150) {
    return {
      label: "Bra värde",
      description: "Används ofta och kostnaden verkar rimlig.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  if (subscription.usage === "Ofta") {
    return {
      label: "Verkar rimligt",
      description: "Används ofta. Kontrollera bara att planen är rätt.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  return {
    label: "Neutral",
    description: "Ingen tydlig sparsignal.",
    className: "border-slate-200 bg-slate-50 text-slate-800",
  };
}

function getRecommendedAction(subscription: Subscription) {
  const priceSanity = getPriceSanity(subscription);

  if (isLikelyFreeMembership(subscription)) {
    return "Gratis medlemskap. Behåll om du använder rabatter, bonus eller förmåner.";
  }

  if (priceSanity?.level === "low") {
    return "Kontrollera om priset stämmer, om det är kampanj, delad kostnad eller provperiod.";
  }

  if (
    priceSanity &&
    subscription.usage === "Sällan" &&
    getMonthlyPrice(subscription) >= 150
  ) {
    return "Pausa, byt plan eller säg upp om du inte använder premiuminnehållet.";
  }

  if (priceSanity) {
    return "Kontrollera priset, år/månad och vad som ingår. Det kan vara rimligt om förmånerna är mycket värdefulla.";
  }

  if (isConfirmedVeryLowCost(subscription)) {
    return `Behåll om du får någon nytta av tjänsten. Besparingen är bara ${formatCurrency(
      getMonthlyPrice(subscription),
    )}/mån.`;
  }

  if (subscription.usage === "Sällan" && getMonthlyPrice(subscription) >= 150) {
    return "Pausa eller säg upp om du inte behöver den.";
  }

  if (subscription.usage === "Sällan") {
    return "Kolla om tjänsten fortfarande behövs.";
  }

  if (
    getBenefitlyCategory(subscription.category, subscription.name) ===
      "Kommunikation" &&
    getMonthlyPrice(subscription) >= 250
  ) {
    return "Kolla surfmängd och billigare plan.";
  }

  if (hasName(subscription, ["bankkort", "kreditkort", "visa", "mastercard"])) {
    return "Kolla årsavgift och vilka förmåner du använder.";
  }

  if (hasName(subscription, ["försäkring", "insurance"])) {
    return "Kolla om skyddet redan ingår någon annanstans.";
  }

  if (subscription.usage === "Ibland" && getMonthlyPrice(subscription) >= 250) {
    return "Kolla billigare plan eller alternativ.";
  }

  if (hasName(subscription, ["amazon prime", "prime video"])) {
    return "Kontrollera vilka Prime-förmåner du använder utöver video, till exempel leverans och andra medlemsförmåner.";
  }

  if (
    hasName(subscription, ["netflix"]) &&
    getPlanText(subscription.plan).includes("premium")
  ) {
    return "Jämför Premium med Standard och kontrollera om du behöver 4K och flera samtidiga strömmar.";
  }

  if (subscription.usage === "Ofta") {
    return "Behåll, men kontrollera att planen är rätt.";
  }

  return "Inga tydliga förbättringar hittades just nu. Följ upp igen när du lagt till fler tjänster.";
}

function getRecommendationReason(subscription: Subscription) {
  const priceSanity = getPriceSanity(subscription);

  if (isLikelyFreeMembership(subscription)) {
    return "0 kr/mån påverkar inte kostnaden, men förmånerna kan ändå vara värda att använda.";
  }

  if (priceSanity?.level === "low") {
    return `${formatCurrency(
      getMonthlyPrice(subscription),
    )}/mån verkar ovanligt lågt för ${priceSanity.categoryLabel}.`;
  }

  if (
    priceSanity &&
    subscription.usage === "Sällan" &&
    getMonthlyPrice(subscription) >= 150
  ) {
    return `${formatCurrency(
      getMonthlyPrice(subscription),
    )}/mån, används sällan och verkar ${
      priceSanity.level === "extreme" ? "extremt högt" : "ovanligt högt"
    } för ${priceSanity.categoryLabel}.`;
  }

  if (priceSanity) {
    return `${formatCurrency(getMonthlyPrice(subscription))}/mån verkar ${
      priceSanity.level === "extreme" ? "extremt högt" : "ovanligt högt"
    } för ${priceSanity.categoryLabel}.`;
  }

  if (isConfirmedVeryLowCost(subscription)) {
    return "Kostnaden är så låg att den normalt inte är en viktig sparsignal.";
  }

  if (subscription.usage === "Sällan" && getMonthlyPrice(subscription) >= 150) {
    return `${formatCurrency(getMonthlyPrice(subscription))}/mån och används sällan.`;
  }

  if (subscription.usage === "Sällan") {
    return "Används sällan.";
  }

  if (subscription.usage === "Ibland" && getMonthlyPrice(subscription) >= 250) {
    return `${formatCurrency(getMonthlyPrice(subscription))}/mån och används ibland.`;
  }

  return "";
}

function shouldShowRecommendationReason(subscription: Subscription) {
  if (isLikelyFreeMembership(subscription)) {
    return true;
  }

  if (getPriceSanity(subscription)) {
    return true;
  }

  if (isConfirmedVeryLowCost(subscription)) {
    return true;
  }

  if (subscription.usage === "Sällan") {
    return true;
  }

  if (subscription.usage === "Ibland" && getMonthlyPrice(subscription) >= 250) {
    return true;
  }

  return false;
}

function isInstructionalBenefitText(benefit: string) {
  const normalized = normalizeText(benefit);
  const phrases = [
    "kontrollera",
    "kan överlappa",
    "kan ingå",
    "kan bero",
    "lägg gärna",
    "angiven plan",
    "jämför",
    "betalar dubbelt",
    "kostar extra",
  ];

  return phrases.some((phrase) => normalized.includes(phrase));
}

function getCuratedBenefitsForService(name: string, plan?: string) {
  const normalizedName = normalizeText(name);
  const normalizedPlan = getPlanText(plan);

  if (
    normalizedName.includes("amazon prime") ||
    normalizedName.includes("prime video")
  ) {
    return [
      "Prime Video",
      "Fri frakt på utvalda Prime-leveranser",
      "Prime Gaming",
      "Prime Reading",
      "Amazon Photos",
      "Prime-erbjudanden och kampanjer",
    ];
  }

  if (normalizedName.includes("netflix")) {
    return [
      "Filmer och serier",
      "Profiler och barnprofil",
      "Nedladdningar för offlinevisning",
      "Flera samtidiga strömmar",
      normalizedPlan.includes("premium")
        ? "4K och HDR"
        : "HD- eller Full HD-kvalitet",
    ];
  }

  if (normalizedName.includes("disney")) {
    return [
      "Disney-filmer och serier",
      "Pixar",
      "Marvel",
      "Star Wars",
      "National Geographic",
      "Barnprofiler och nedladdningar",
    ];
  }

  if (normalizedName.includes("spotify")) {
    return [
      "Musik utan reklam",
      "Offline-lyssning",
      "Podcasts och ljudinnehåll",
      "Högre ljudkvalitet",
      "Delning med Duo eller Family",
      "Personliga spellistor och rekommendationer",
    ];
  }

  if (normalizedName.includes("microsoft 365")) {
    return [
      "Word",
      "Excel",
      "PowerPoint",
      "Outlook",
      "OneDrive-lagring",
      "Familjedelning",
    ];
  }

  if (normalizedName.includes("google one")) {
    return [
      "Extra Google Drive-lagring",
      "Google Photos-lagring",
      "Backup av mobil",
      "Familjedelning",
      "Extra support och medlemsförmåner",
    ];
  }

  if (normalizedName.includes("icloud")) {
    return [
      "iCloud-lagring",
      "Backup av iPhone och iPad",
      "Synkning av bilder",
      "Synkning av filer och enheter",
      "Familjedelning",
    ];
  }

  return null;
}

function getBenefitsForSubscription(
  name: string,
  category: string,
  plan?: string,
  services: KnownService[] = knownServices,
  planFeatureMap?: PlanFeatureMap,
) {
  const curatedBenefits = getCuratedBenefitsForService(name, plan);

  if (curatedBenefits) {
    return curatedBenefits;
  }

  const planFeatures = getPlanFeaturesForSubscription(
    name,
    plan,
    services,
    planFeatureMap,
  );
  const featureBenefits = getFeatureBenefitTexts(planFeatures).filter(
    (benefit) => !isInstructionalBenefitText(benefit),
  );

  if (featureBenefits.length > 0) {
    return featureBenefits;
  }

  const normalizedName = normalizeText(name);
  const normalizedPlan = getPlanText(plan);

  if (normalizedName.includes("netflix")) {
    return [
      "Filmer och serier",
      "Profiler och barnprofil kan finnas",
      "Nedladdningar kan bero på plan",
      normalizedPlan
        ? `Angiven plan: ${plan}. Kontrollera att priset matchar planen.`
        : "Lägg gärna till plan för bättre analys",
      "Bildkvalitet beror på plan",
    ];
  }

  if (normalizedName.includes("spotify")) {
    return [
      "Musik och podcasts",
      "Reklamfritt lyssnande kan bero på plan",
      "Offline-lyssning kan bero på plan",
      normalizedPlan.includes("family") || normalizedPlan.includes("familj")
        ? "Familjeplan kan vara bra om flera använder kontot"
        : "Familjeplan eller Duo kan finnas",
      "Kontrollera om du betalar dubbelt för musik",
    ];
  }

  if (normalizedName.includes("hbo") || normalizedName.includes("max")) {
    return [
      "Filmer och serier",
      "Premiuminnehåll kan ingå",
      "Sport eller extra innehåll kan bero på paket",
      "Nedladdningar kan bero på plan",
      "Kontrollera om billigare plan räcker",
    ];
  }

  if (normalizedName.includes("disney")) {
    return [
      "Filmer och serier från Disney",
      "Marvel, Star Wars och Pixar kan ingå",
      "Barnprofiler kan finnas",
      "Nedladdningar kan bero på plan",
      "Bildkvalitet och reklam kan bero på plan",
    ];
  }

  if (normalizedName.includes("viaplay")) {
    return [
      "Filmer, serier och sport kan ingå",
      "Sportpaket kan vara dyrare",
      "Offline-läge kan bero på plan",
      "Kontrollera om du använder sportdelen",
      "Kan överlappa med andra streamingtjänster",
    ];
  }

  if (
    normalizedName.includes("tv4") ||
    normalizedName.includes("cmore") ||
    normalizedName.includes("c more")
  ) {
    return [
      "Filmer, serier och program",
      "Sport kan bero på paket",
      "Reklam och bildkvalitet kan bero på plan",
      "Kontrollera om billigare plan räcker",
      "Kan överlappa med andra streamingtjänster",
    ];
  }

  if (normalizedName.includes("youtube premium")) {
    return [
      "YouTube utan reklam",
      "Bakgrundsuppspelning",
      "Nedladdningar kan ingå",
      "YouTube Music kan ingå",
      "Kan ersätta separat musikabonnemang",
    ];
  }

  if (normalizedName.includes("youtube music")) {
    return [
      "Musikstreaming",
      "Offline-lyssning kan bero på plan",
      "Bakgrundsuppspelning kan ingå",
      "Kan ingå i YouTube Premium",
      "Kontrollera om du betalar dubbelt för musik",
    ];
  }

  if (normalizedName.includes("apple music")) {
    return [
      "Musikstreaming",
      "Offline-lyssning kan ingå",
      "Familjedelning kan bero på plan",
      "Kan ingå i Apple One",
      "Kontrollera om du redan har musik via annan tjänst",
    ];
  }

  if (normalizedName.includes("crunchyroll")) {
    return [
      "Anime och serier",
      "Reklamfritt kan bero på plan",
      "Offline-läge kan bero på plan",
      "Nya avsnitt kan finnas nära japansk premiär",
      "Kontrollera om billigare plan räcker",
    ];
  }

  if (
    normalizedName.includes("amazon prime") ||
    normalizedName.includes("prime video")
  ) {
    return [
      "Filmer och serier",
      "Kan ingå i Amazon Prime",
      "Hyrfilmer och köpfilmer kan kosta extra",
      "Kontrollera om du redan betalar för Prime",
      "Kan överlappa med andra streamingtjänster",
    ];
  }

  if (normalizedName.includes("microsoft 365")) {
    return [
      "Office-appar som Word, Excel och PowerPoint",
      "OneDrive-lagring",
      "Familjedelning kan bero på plan",
      "Backup och synkning av filer",
      "Kan överlappa med annan molnlagring",
    ];
  }

  if (normalizedName.includes("google one")) {
    return [
      "Extra Google-lagring",
      "Google Photos-lagring",
      "Familjedelning kan bero på plan",
      "Backup av mobil kan ingå",
      "Kan överlappa med iCloud eller OneDrive",
    ];
  }

  if (normalizedName.includes("icloud")) {
    return [
      "iCloud-lagring",
      "Backup av iPhone eller iPad",
      "Familjedelning kan bero på plan",
      "Synkning av bilder och filer",
      "Kan överlappa med Google One eller OneDrive",
    ];
  }

  if (normalizedName.includes("dropbox")) {
    return [
      "Molnlagring",
      "Fildelning",
      "Backup och synkning kan ingå",
      "Versionshistorik kan bero på plan",
      "Kan överlappa med annan molnlagring",
    ];
  }

  if (normalizedName.includes("nordic wellness")) {
    return [
      "Gymträning",
      "Gruppass kan bero på medlemskap",
      "Flera anläggningar kan bero på medlemskap",
      "Träningsapp eller bokning kan finnas",
      "Kontrollera om du använder kortet tillräckligt ofta",
    ];
  }

  if (normalizedName.includes("sats")) {
    return [
      "Gymträning",
      "Gruppass kan bero på medlemskap",
      "Träning på flera center kan bero på medlemskap",
      "Online-träning kan finnas",
      "Kontrollera om billigare medlemsnivå räcker",
    ];
  }

  if (
    normalizedName.includes("fitness24seven") ||
    normalizedName.includes("fitness 24 seven")
  ) {
    return [
      "Gymträning",
      "Tillgång dygnet runt kan ingå",
      "Flera anläggningar kan bero på medlemskap",
      "Gruppträning kan bero på plan",
      "Kontrollera om du använder gymmet ofta nog",
    ];
  }

  if (normalizedName.includes("foodora")) {
    return [
      "Matleveranser",
      "Rabatter eller fri leverans kan finnas",
      "Kampanjer kan finnas",
      "Medlemskap kan löna sig vid ofta användning",
      "Kontrollera extra avgifter",
    ];
  }

  if (normalizedName.includes("wolt")) {
    return [
      "Matleveranser",
      "Rabatter eller kampanjer kan finnas",
      "Fri leverans kan bero på medlemskap",
      "Medlemskap kan löna sig vid ofta användning",
      "Kontrollera extra avgifter",
    ];
  }

  if (
    normalizedName.includes("telia") ||
    normalizedName.includes("tele2") ||
    normalizedName.includes("telenor") ||
    normalizedName.includes("halebop") ||
    normalizedName.includes("vimla") ||
    normalizedName.includes("comviq") ||
    normalizedName.includes("hallon")
  ) {
    return [
      "Mobilabonnemang",
      "Surf, samtal och sms kan ingå",
      "Familjeabonnemang kan finnas",
      "Rabatter kan finnas",
      "Kontrollera om du betalar för mer surf än du använder",
    ];
  }

  if (normalizedName.includes("bankkort")) {
    return [
      "Reseförsäkring kan ingå",
      "Köpskydd kan ingå",
      "Rabatter kan finnas",
      "Bonus eller cashback kan finnas",
      "Kan överlappa med separat försäkring",
    ];
  }

  if (normalizedName.includes("kreditkort")) {
    return [
      "Reseförsäkring kan ingå",
      "Bonus eller cashback kan finnas",
      "Köpskydd kan ingå",
      "Kontrollera årsavgiften",
      "Kan överlappa med separat försäkring",
    ];
  }

  if (
    normalizedName.includes("försäkring") ||
    normalizedName.includes("insurance")
  ) {
    return [
      "Skydd vid skada",
      "Villkor bör jämföras",
      "Självrisk bör kontrolleras",
      "Överlapp med andra skydd kan finnas",
      "Kontrollera om priset matchar behovet",
    ];
  }

  return getBenefitsByCategory(category);
}

function getBenefitsByCategory(category: string) {
  const normalizedCategory = getBenefitlyCategory(category);

  if (normalizedCategory === "Underhållning") {
    return [
      "Underhållning eller innehåll",
      "Familjeplan kan finnas",
      "Offline-läge eller nedladdningar kan ingå",
      "Tjänsten kan överlappa med andra underhållningstjänster",
      "Kontrollera om billigare plan räcker",
    ];
  }

  if (normalizedCategory === "Digitala tjänster") {
    return [
      "Digitala funktioner eller lagring",
      "Familje- eller teamdelning kan finnas",
      "Säkerhet, backup eller synkning kan ingå",
      "Kan överlappa med andra digitala tjänster",
      "Kontrollera vilka premiumfunktioner du faktiskt använder",
    ];
  }

  if (normalizedCategory === "Kommunikation") {
    return [
      "Mobil, bredband eller annan kommunikation",
      "Surf, hastighet eller utrustning kan ingå",
      "Familje- eller samlingsrabatt kan finnas",
      "Bindningstid och villkor bör kontrolleras",
      "Kontrollera om nivån är högre än du behöver",
    ];
  }

  if (normalizedCategory === "Hälsa och träning") {
    return [
      "Träning, hälsa eller välmående",
      "Gruppass eller digitalt innehåll kan ingå",
      "Flera anläggningar eller familjeplan kan finnas",
      "Bokning eller appfunktioner kan ingå",
      "Kontrollera om du använder tjänsten tillräckligt ofta",
    ];
  }

  if (normalizedCategory === "Shopping och medlemskap") {
    return [
      "Rabatter eller medlemspriser kan ingå",
      "Poäng, bonus eller cashback kan finnas",
      "Fri frakt eller leveransförmåner kan finnas",
      "Exklusiva erbjudanden kan ingå",
      "Kontrollera om förmånerna faktiskt används",
    ];
  }

  if (normalizedCategory === "Ekonomi och försäkring") {
    return [
      "Ekonomitjänst, kort eller försäkringsskydd",
      "Avgifter och självrisk bör kontrolleras",
      "Bonus, cashback eller reseförsäkring kan ingå",
      "Skydd kan överlappa med andra kort eller försäkringar",
      "Kontrollera vilka förmåner och skydd du använder",
    ];
  }

  if (normalizedCategory === "Hem och boende") {
    return [
      "Tjänst för hemmet eller boendet",
      "Fast avgift och rörligt pris bör kontrolleras",
      "Utrustning, support eller smart styrning kan ingå",
      "Bindningstid och avtalsvillkor kan påverka kostnaden",
      "Kontrollera om avtalet fortfarande passar hushållet",
    ];
  }

  if (normalizedCategory === "Resor och transport") {
    return [
      "Resor, biljetter eller transporttjänster",
      "Rabatter eller bonus kan finnas",
      "Pass, periodkort eller medlemsnivå kan påverka priset",
      "Reseförmåner kan överlappa med kort eller medlemskap",
      "Kontrollera om abonnemang eller styckpris är billigast",
    ];
  }

  if (normalizedCategory === "Utbildning") {
    return [
      "Kurser, språk eller kompetensutveckling",
      "Certifikat eller premiuminnehåll kan ingå",
      "Student- eller årsplan kan finnas",
      "Tjänsten kan överlappa med andra utbildningsplattformar",
      "Kontrollera om du använder utbildningen regelbundet",
    ];
  }

  return [
    "Förmåner kan finnas",
    "Kontrollera villkoren",
    "Jämför med andra tjänster",
    "Se om du redan betalar för något liknande",
    "Kontrollera om tjänsten används tillräckligt",
  ];
}

function getEstimatedPlanMonthlyPrice(
  subscription: Subscription,
  planReference: PlanReference,
) {
  const service = findKnownService(subscription.name);
  const serviceName = service?.displayName ?? subscription.name;
  const rangeKey = getPlanPriceRangeKey(
    serviceName,
    planReference.planName,
    activeCurrency,
    "monthly",
  );
  const databaseRange = activePlanPriceRangeMap[rangeKey];

  if (databaseRange) {
    return Math.round(
      (databaseRange.typicalMinPrice + databaseRange.typicalMaxPrice) / 2,
    );
  }

  if (
    planReference.roughMonthlyMin !== undefined &&
    planReference.roughMonthlyMax !== undefined
  ) {
    return Math.round(
      (planReference.roughMonthlyMin + planReference.roughMonthlyMax) / 2,
    );
  }

  return null;
}

function getBenefitlyRecommendations(
  subscriptions: Subscription[],
  overlapInsights: Insight[],
): BenefitlyRecommendation[] {
  const recommendations: BenefitlyRecommendation[] = [];

  const directCandidates = subscriptions
    .filter(
      (subscription) =>
        subscription.usage === "Sällan" &&
        !isConfirmedVeryLowCost(subscription) &&
        (getPriceSanity(subscription)?.level !== "low" ||
          subscription.priceConfirmed),
    )
    .sort((a, b) => getMonthlyPrice(b) - getMonthlyPrice(a));

  const directCandidateIds = new Set(
    directCandidates.map((subscription) => subscription.id),
  );

  directCandidates.forEach((subscription) => {
    const planPosition = getPlanPosition(subscription);
    const cheaperPlan = planPosition?.cheaperPlans.at(-1);
    const secondaryPlanText = cheaperPlan
      ? ` Om du vill behålla tjänsten kan ${cheaperPlan.planName} vara ett billigare alternativ.`
      : "";
    const monthlySaving = Math.round(getMonthlyPrice(subscription));

    recommendations.push({
      id: `cancel-or-pause-${subscription.id}`,
      kind: "cancel_or_pause",
      confidence: "likely",
      priority: 90 + Math.min(monthlySaving, 500) / 100,
      subscriptionId: subscription.id,
      title: subscription.name,
      description: `Du använder tjänsten sällan. Kontrollera först om du verkligen behöver den. Om du pausar eller säger upp den kan hela kostnaden försvinna.${secondaryPlanText}`,
      reason: `${subscription.name} används sällan och kostar ${formatCurrency(monthlySaving)}/mån.`,
      monthlySaving,
      yearlySaving: Math.round(getYearlyPrice(subscription)),
      questions: [
        "Använder någon annan i hushållet tjänsten?",
        "Finns innehåll eller förmåner du vill behålla?",
        ...(cheaperPlan
          ? [
              `Skulle ${cheaperPlan.planName} täcka behovet om du vill behålla tjänsten?`,
            ]
          : []),
      ],
      includeInConfirmedSavings: false,
      status: "Kan pausas eller sägas upp",
      targetPlan: cheaperPlan?.planName,
    });
  });

  subscriptions.forEach((subscription) => {
    if (
      subscription.usage === "Ofta" ||
      directCandidateIds.has(subscription.id)
    ) {
      return;
    }

    const planPosition = getPlanPosition(subscription);
    const cheaperPlan = planPosition?.cheaperPlans.at(-1);

    if (!cheaperPlan) {
      return;
    }

    const estimatedCheaperPrice = getEstimatedPlanMonthlyPrice(
      subscription,
      cheaperPlan,
    );
    const currentMonthlyPrice = getMonthlyPrice(subscription);
    const monthlySaving = estimatedCheaperPrice
      ? Math.max(0, Math.round(currentMonthlyPrice - estimatedCheaperPrice))
      : undefined;

    if (monthlySaving !== undefined && monthlySaving <= 0) {
      return;
    }

    recommendations.push({
      id: `plan-change-${subscription.id}`,
      kind: "plan_change",
      confidence: "needs_confirmation",
      priority: 70 + Math.min(monthlySaving ?? 0, 300) / 100,
      subscriptionId: subscription.id,
      title: `${subscription.name}: ${subscription.plan} → ${cheaperPlan.planName}`,
      description:
        "En billigare plan kan räcka, men kontrollera först vilka funktioner du behöver. Prisuppskattningen är ungefärlig och ska alltid verifieras hos leverantören.",
      reason: `${subscription.name} används ${subscription.usage.toLowerCase()} och har en dyrare plan än ${cheaperPlan.planName}.`,
      monthlySaving,
      yearlySaving:
        monthlySaving !== undefined ? monthlySaving * 12 : undefined,
      questions: [
        "Vilka funktioner i din nuvarande plan använder du?",
        "Behöver du högsta bildkvalitet, fler användare eller extra lagring?",
        `Täcker ${cheaperPlan.planName} ditt behov?`,
      ],
      includeInConfirmedSavings: false,
      status: "Behöver bekräftas",
      targetPlan: cheaperPlan.planName,
    });
  });

  subscriptions.forEach((subscription) => {
    const priceSanity = getPriceSanity(subscription);

    if (!priceSanity) {
      return;
    }

    recommendations.push({
      id: `price-check-${subscription.id}`,
      kind: "price_check",
      confidence: "needs_confirmation",
      priority: priceSanity.level === "extreme" ? 100 : 80,
      subscriptionId: subscription.id,
      title: `Kontrollera priset på ${subscription.name}`,
      description:
        getPlanPriceWarningMessage(subscription) ??
        `Priset verkar ${priceSanity.level === "low" ? "ovanligt lågt" : "ovanligt högt"}. Kontrollera belopp, betalperiod och vald plan.`,
      reason: `Priset avviker från Benefitlys rimlighetskontroll för ${priceSanity.categoryLabel}.`,
      questions: [
        "Är priset angivet per månad eller per år?",
        "Är det kampanjpris, delad kostnad eller arbetsgivarförmån?",
        "Har du valt rätt plan?",
      ],
      includeInConfirmedSavings: false,
      status: "Pris behöver kontrolleras",
    });
  });

  subscriptions.forEach((subscription) => {
    if (
      !hasName(subscription, [
        "bankkort",
        "kreditkort",
        "försäkring",
        "amazon prime",
        "prime video",
      ])
    ) {
      return;
    }

    recommendations.push({
      id: `benefit-check-${subscription.id}`,
      kind: "benefit_check",
      confidence: "needs_confirmation",
      priority: 45,
      subscriptionId: subscription.id,
      title: `Kontrollera förmånerna i ${subscription.name}`,
      description:
        "Tjänsten kan innehålla rabatter, skydd eller andra förmåner som påverkar dess verkliga värde.",
      reason:
        "Benefitly känner igen en tjänst där oanvända förmåner eller överlapp ofta förekommer.",
      questions: [
        "Vilka förmåner har du aktiverat?",
        "Vilka förmåner använder du faktiskt?",
        "Finns samma skydd eller rabatt redan någon annanstans?",
      ],
      includeInConfirmedSavings: false,
      status: "Förmåner behöver kontrolleras",
    });
  });

  overlapInsights.forEach((insight, index) => {
    recommendations.push({
      id: `overlap-${index}`,
      kind: "overlap",
      confidence: "needs_confirmation",
      priority: 60,
      title: insight.title,
      description: insight.text,
      reason: "Flera tjänster verkar täcka liknande behov eller funktioner.",
      questions: [
        "Vilken av tjänsterna använder du mest?",
        "Vilken tjänst har funktioner du inte kan vara utan?",
        "Kan någon tjänst pausas utan att behovet försvinner?",
      ],
      includeInConfirmedSavings: false,
      status: "Jämför innan du ändrar",
    });
  });

  return recommendations.sort((a, b) => b.priority - a.priority);
}

function getSavingsOpportunities(
  subscriptions: Subscription[],
  overlapInsights: Insight[],
): SavingsOpportunity[] {
  return getBenefitlyRecommendations(subscriptions, overlapInsights)
    .filter((recommendation) =>
      ["cancel_or_pause", "plan_change", "overlap"].includes(
        recommendation.kind,
      ),
    )
    .map((recommendation) => ({
      id:
        recommendation.kind === "cancel_or_pause"
          ? `direct-${recommendation.subscriptionId}`
          : recommendation.kind === "plan_change"
            ? `plan-${recommendation.subscriptionId}`
            : recommendation.id,
      kind:
        recommendation.kind === "cancel_or_pause"
          ? "direct"
          : recommendation.kind === "plan_change"
            ? "plan"
            : "overlap",
      title: recommendation.title,
      description: recommendation.description,
      monthlyAmount: recommendation.monthlySaving,
      yearlyAmount: recommendation.yearlySaving,
      status: recommendation.status,
    }));
}

type DashboardAction = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  tone: "red" | "amber" | "green";
};

function getDashboardActions(
  subscriptions: Subscription[],
  overlapInsights: Insight[],
): DashboardAction[] {
  const actions: DashboardAction[] = [];

  const lowUsage = [...subscriptions]
    .filter((item) => item.usage === "Sällan")
    .sort((a, b) => getMonthlyPrice(b) - getMonthlyPrice(a));

  if (lowUsage[0]) {
    actions.push({
      id: `usage-${lowUsage[0].id}`,
      title: lowUsage[0].name,
      subtitle: `Används sällan och kostar ${formatCurrency(getMonthlyPrice(lowUsage[0]))}/mån.`,
      badge: "Se över",
      tone: "red",
    });
  }

  if (overlapInsights[0]) {
    actions.push({
      id: "overlap-0",
      title: overlapInsights[0].title,
      subtitle: overlapInsights[0].text,
      badge: "Jämför",
      tone: "amber",
    });
  }

  const planCandidate = subscriptions.find(
    (item) => item.plan && getPlanPosition(item)?.cheaperPlans.length,
  );

  if (planCandidate) {
    actions.push({
      id: `plan-${planCandidate.id}`,
      title: `${planCandidate.name} ${planCandidate.plan ?? ""}`.trim(),
      subtitle:
        "Det finns billigare prisnivåer. Jämför innehållet innan du byter.",
      badge: "Jämför planer",
      tone: "amber",
    });
  }

  const healthy = subscriptions.find((item) => getBenefitlyScore(item) >= 85);

  if (actions.length < 3 && healthy) {
    actions.push({
      id: `healthy-${healthy.id}`,
      title: healthy.name,
      subtitle: "Pris, plan och användning ser rimliga ut just nu.",
      badge: "Ser bra ut",
      tone: "green",
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: "start",
      title: "Lägg till dina första tjänster",
      subtitle:
        "Börja med streaming, mobil och ett medlemskap för en bättre analys.",
      badge: "Kom igång",
      tone: "green",
    });
  }

  return actions.slice(0, 3);
}

function SmartSummaryCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  detail: string;
  tone: "green" | "amber";
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone === "green" ? "bg-emerald-100" : "bg-amber-100"}`}
        >
          {icon}
        </span>
        <p className="text-sm font-bold text-slate-600">{label}</p>
      </div>
      <p
        className={`mt-4 text-3xl font-black ${tone === "green" ? "text-emerald-800" : "text-amber-700"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{detail}</p>
    </div>
  );
}

function PriorityActionsSection({ actions }: { actions: DashboardAction[] }) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Fler saker att kontrollera</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Bara det som fortfarande är relevant.
          </p>
        </div>
        <a
          href="#services-section"
          className="text-sm font-black text-emerald-800"
        >
          Visa alla →
        </a>
      </div>

      <div className="mt-4 divide-y divide-slate-100">
        {actions.map((action) => (
          <a
            key={action.id}
            href="#services-section"
            className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
          >
            <span
              className={`h-3 w-3 shrink-0 rounded-full ${action.tone === "red" ? "bg-red-500" : action.tone === "amber" ? "bg-amber-500" : "bg-emerald-500"}`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-slate-950">
                {action.title}
              </p>
              <p className="mt-1 line-clamp-1 text-sm font-medium text-slate-500">
                {action.subtitle}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              {action.badge}
            </span>
            <span className="text-slate-400">›</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function BenefitlyScorePanel({
  score,
  subscriptions,
  checkItems,
}: {
  score: number;
  subscriptions: Subscription[];
  checkItems: CheckItem[];
}) {
  const planMissing = subscriptions.filter((item) => !item.plan?.trim()).length;
  const nextSteps: string[] = [];
  const hasServices = subscriptions.length > 0;

  if (planMissing > 0) {
    nextSteps.push(
      `Lägg till plan på ${planMissing} tjänst${planMissing === 1 ? "" : "er"}`,
    );
  }

  if (checkItems.length > 0) {
    nextSteps.push(
      `Kontrollera ${checkItems.length} prioriterad${checkItems.length === 1 ? " sak" : "e saker"}`,
    );
  }

  return (
    <aside className="self-start rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-emerald-800">Benefitly Score</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {hasServices ? "Din kontroll just nu" : "Din första score väntar"}
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
          {hasServices ? `${score}/100` : "Inte beräknad"}
        </span>
      </div>

      {hasServices ? (
        <>
          <div
            className="mx-auto mt-5 flex h-32 w-32 items-center justify-center rounded-full bg-[conic-gradient(#059669_var(--score),#d1fae5_0)] p-2.5"
            style={{ "--score": `${score}%` } as React.CSSProperties}
          >
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
              <p className="text-4xl font-black text-emerald-800">{score}</p>
              <p className="text-xs font-bold text-slate-500">av 100</p>
            </div>
          </div>

          <p className="mt-4 text-center text-sm font-black leading-relaxed text-slate-900">
            {getBenefitlyScoreText(score)}
          </p>

          {nextSteps.length > 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Nästa nivå
              </p>
              <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
                {nextSteps.map((step) => (
                  <li key={step}>○ {step}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              ✓ All grunddata ser komplett ut.
            </div>
          )}
        </>
      ) : (
        <div className="mt-5 rounded-3xl bg-emerald-50 p-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-[7px] border-emerald-100 bg-white text-2xl">
            🔎
          </div>
          <p className="mt-3 text-base font-black text-emerald-950">
            Lägg till minst 3 tjänster
          </p>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-emerald-900">
            Då kan Benefitly räkna ut din första score och visa hur bra kontroll
            du har.
          </p>
        </div>
      )}
    </aside>
  );
}

function BenefitlyInbox({
  subscriptions,
  overlapInsights,
}: {
  subscriptions: Subscription[];
  overlapInsights: Insight[];
}) {
  const messages = getDashboardActions(subscriptions, overlapInsights).slice(1);
  const onboardingMessages: DashboardAction[] = [
    {
      id: "onboarding-streaming",
      title: "Lägg till streaming",
      subtitle: "Börja med en tjänst du använder ofta.",
      badge: "Steg 1",
      tone: "green",
    },
    {
      id: "onboarding-mobile",
      title: "Lägg till mobil eller bredband",
      subtitle: "Då kan Benefitly börja jämföra återkommande kostnader.",
      badge: "Steg 2",
      tone: "green",
    },
    {
      id: "onboarding-membership",
      title: "Lägg till medlemskap eller kort",
      subtitle: "Det hjälper Benefitly att hitta förmåner och överlapp.",
      badge: "Steg 3",
      tone: "green",
    },
  ];
  const assistantMessages =
    subscriptions.length === 0 ? onboardingMessages : messages;

  if (subscriptions.length > 0 && assistantMessages.length === 0) {
    return null;
  }

  return (
    <section
      id="assistant"
      className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm"
    >
      <div>
        <p className="text-sm font-black text-emerald-800">
          Benefitly-assistenten
        </p>
        <h2 className="mt-1 text-xl font-black">
          {subscriptions.length === 0
            ? "Så kommer du igång"
            : "Det här har jag hittat åt dig"}
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-600">
          {subscriptions.length === 0
            ? "Lägg till några vanliga tjänster så börjar analysen direkt."
            : "Rekommendationerna uppdateras när du ändrar dina tjänster."}
        </p>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {assistantMessages.map((message) => (
          <a
            key={message.id}
            href="#services-section"
            className="rounded-2xl border border-white bg-white p-3 shadow-sm transition hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${message.tone === "red" ? "bg-red-500" : message.tone === "amber" ? "bg-amber-500" : "bg-emerald-500"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-950">
                  {message.title}
                </p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                  {message.subtitle}
                </p>
                <p className="mt-2 text-[11px] font-black uppercase tracking-wide text-emerald-700">
                  {message.badge}
                </p>
              </div>
              <span className="text-slate-400">›</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function getBenefitUsageAssessment(
  subscription: Subscription,
  usedCount: number,
  totalCount: number,
) {
  if (totalCount === 0 || usedCount === 0) {
    return {
      title: "Markera det du använder",
      text: "Då kan Benefitly bedöma om tjänsten ger dig tillräckligt värde och om en billigare plan kan räcka.",
      icon: "?",
      className: "border-slate-200 bg-slate-50 text-slate-950",
    };
  }

  const usageRatio = usedCount / totalCount;
  const usedLabel = usedCount === 1 ? "en förmån" : `${usedCount} förmåner`;

  if (usageRatio >= 0.7) {
    return {
      title: "Du får ut mycket av tjänsten",
      text: `Du använder ${usedLabel}. ${subscription.plan ? `${subscription.plan} verkar passa bra` : "Tjänsten verkar ge bra värde"}, men pris och överlapp bör fortfarande jämföras.`,
      icon: "✓",
      className: "border-emerald-200 bg-emerald-50 text-emerald-950",
    };
  }

  if (usageRatio >= 0.35) {
    return {
      title: "Du använder delar av värdet",
      text: `Du använder ${usedLabel}. Kontrollera om en billigare plan innehåller just de delar du behöver.`,
      icon: "↔",
      className: "border-sky-200 bg-sky-50 text-sky-950",
    };
  }

  return {
    title: "Begränsat värde just nu",
    text: `Du använder bara ${usedLabel}. En billigare plan eller en mer specialiserad tjänst kan vara bättre.`,
    icon: "↓",
    className: "border-amber-200 bg-amber-50 text-amber-950",
  };
}

function CompactSubscriptionRow({
  subscription,
  subscriptions,
  onDelete,
  onEdit,
  onConfirmPrice,
  onShowAnalysis,
  onCompare,
}: {
  subscription: Subscription;
  subscriptions: Subscription[];
  onDelete: (id: string) => void;
  onEdit: (subscription: Subscription) => void;
  onConfirmPrice: (id: string) => void;
  onShowAnalysis: (subscription: Subscription) => void;
  onCompare: (subscription: Subscription) => void;
}) {
  const [openPanel, setOpenPanel] = useState<
    "benefits" | "comparison" | "more" | null
  >(null);
  const [comparisonTab, setComparisonTab] = useState<
    "plans" | "alternatives" | "overlap"
  >("plans");
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [showDesktopActions, setShowDesktopActions] = useState(false);
  const [benefitUsage, setBenefitUsage] = useState<Record<string, boolean>>({});
  const [hasLoadedBenefitUsage, setHasLoadedBenefitUsage] = useState(false);
  const hideActionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const rowRef = useRef<HTMLDivElement | null>(null);
  const benefitsPanelRef = useRef<HTMLDivElement | null>(null);
  const inlinePanelRef = useRef<HTMLDivElement | null>(null);
  const icon = getServiceIcon(subscription);
  const score = getBenefitlyScore(subscription);
  const scoreMeta = getBenefitlyScoreMeta(score);
  const action = getRecommendedAction(subscription);
  const rawPriceSanity = getRawPriceSanity(subscription);

  function clearHideActionsTimer() {
    if (hideActionsTimerRef.current) {
      clearTimeout(hideActionsTimerRef.current);
      hideActionsTimerRef.current = null;
    }
  }

  function showActions() {
    clearHideActionsTimer();
    setShowDesktopActions(true);
  }

  function scheduleHideActions() {
    clearHideActionsTimer();

    hideActionsTimerRef.current = setTimeout(() => {
      const rowStillHasFocus = rowRef.current?.contains(document.activeElement);

      if (!rowStillHasFocus && openPanel === null) {
        setShowDesktopActions(false);
      }
    }, 180);
  }

  function togglePanel(panel: "benefits" | "more") {
    clearHideActionsTimer();
    setShowDesktopActions(true);
    setOpenPanel((currentPanel) => (currentPanel === panel ? null : panel));
  }

  function openInlineComparison() {
    clearHideActionsTimer();
    setShowDesktopActions(true);
    setComparisonTab("plans");
    setOpenPanel("comparison");
  }

  useEffect(() => {
    if (openPanel !== "benefits" && openPanel !== "comparison") {
      return;
    }

    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(() => {
        const target =
          openPanel === "benefits"
            ? benefitsPanelRef.current
            : inlinePanelRef.current;

        target?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });

      return () => window.cancelAnimationFrame(secondFrame);
    });

    return () => window.cancelAnimationFrame(firstFrame);
  }, [openPanel]);

  useEffect(() => {
    return () => clearHideActionsTimer();
  }, []);

  useEffect(() => {
    const storageKey = `benefitUsage:${subscription.id}`;
    const savedUsage = localStorage.getItem(storageKey);

    if (savedUsage) {
      try {
        setBenefitUsage(JSON.parse(savedUsage) as Record<string, boolean>);
      } catch {
        setBenefitUsage({});
      }
    } else {
      setBenefitUsage({});
    }

    setHasLoadedBenefitUsage(true);
  }, [subscription.id]);

  useEffect(() => {
    if (!hasLoadedBenefitUsage) {
      return;
    }

    localStorage.setItem(
      `benefitUsage:${subscription.id}`,
      JSON.stringify(benefitUsage),
    );
  }, [benefitUsage, hasLoadedBenefitUsage, subscription.id]);

  function toggleBenefitUsage(benefit: string) {
    setBenefitUsage((current) => ({
      ...current,
      [benefit]: !current[benefit],
    }));
  }

  const usedBenefits = subscription.benefits.filter(
    (benefit) => benefitUsage[benefit],
  );
  const unusedBenefits = subscription.benefits.filter(
    (benefit) => !benefitUsage[benefit],
  );
  const benefitAssessment = getBenefitUsageAssessment(
    subscription,
    usedBenefits.length,
    subscription.benefits.length,
  );
  const benefitUsageRatio =
    subscription.benefits.length > 0
      ? usedBenefits.length / subscription.benefits.length
      : 0;
  const benefitCompareLabel =
    usedBenefits.length === 0
      ? "Markera vad du använder först"
      : benefitUsageRatio < 0.35
        ? "Jämför billigare alternativ"
        : benefitUsageRatio < 0.7
          ? "Kontrollera billigare plan"
          : "Se planer och alternativ";

  const quickActionClassName =
    "group/action relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white/95 text-slate-500 shadow-[0_2px_8px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 hover:shadow-[0_8px_20px_rgba(5,150,105,0.14)] focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:ring-offset-2";

  const tooltipClassName =
    "pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white opacity-0 shadow-lg transition-all duration-150 delay-0 after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-[4px] after:border-transparent after:border-t-slate-950 group-hover/action:translate-y-0 group-hover/action:opacity-100 group-hover/action:delay-300 group-focus/action:translate-y-0 group-focus/action:opacity-100 group-focus/action:delay-0";

  return (
    <div
      ref={rowRef}
      tabIndex={0}
      onMouseEnter={showActions}
      onMouseLeave={scheduleHideActions}
      onFocusCapture={showActions}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          scheduleHideActions();
        }
      }}
      className="group relative border-b border-slate-200 outline-none transition-all duration-300 last:border-b-0 hover:z-10 hover:bg-gradient-to-r hover:from-white hover:via-emerald-50/35 hover:to-white hover:shadow-[0_14px_34px_rgba(15,23,42,0.10)] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400/60 focus-within:z-10 focus-within:bg-emerald-50/35 focus-within:shadow-[0_14px_34px_rgba(15,23,42,0.10)]"
    >
      <div className="grid items-center gap-4 px-5 py-4 transition-all duration-300 ease-out group-hover:-translate-y-0.5 group-focus-within:-translate-y-0.5 lg:grid-cols-[minmax(0,1.4fr)_120px_105px_minmax(180px,1fr)_auto] lg:pr-7">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${icon.className}`}
          >
            {icon.label}
          </div>
          <div className="min-w-0">
            <p className="truncate font-black text-slate-950">
              {subscription.name}
            </p>
            <p className="truncate text-xs font-semibold text-slate-500">
              {getBenefitlyCategory(subscription.category, subscription.name)}
              {subscription.plan ? ` · ${subscription.plan}` : ""}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-600">
              Används {subscription.usage.toLowerCase()}
            </p>
          </div>
        </div>

        <div className="font-black text-slate-950">
          {formatCurrency(getMonthlyPrice(subscription))}/mån
        </div>

        <div
          className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 ${scoreMeta.className}`}
        >
          <span className="font-black">{score}</span>
          <span className="text-[11px] font-black">{scoreMeta.label}</span>
        </div>

        <p
          className={`line-clamp-2 text-sm font-bold ${score >= 85 ? "text-emerald-800" : score >= 65 ? "text-amber-800" : "text-red-700"}`}
        >
          {action}
        </p>

        <div className="flex items-center justify-end lg:pr-2">
          <div
            className={`hidden origin-right items-center gap-2.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex ${
              showDesktopActions || openPanel !== null
                ? "pointer-events-auto translate-x-0 scale-100 opacity-100"
                : "pointer-events-none translate-x-5 scale-[0.96] opacity-0"
            }`}
          >
            <button
              type="button"
              onClick={() => onShowAnalysis(subscription)}
              className={quickActionClassName}
              aria-label={`Visa analys för ${subscription.name}`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19V9" />
                <path d="M10 19V5" />
                <path d="M16 19v-7" />
                <path d="M22 19H2" />
              </svg>
              <span className={tooltipClassName}>Analys</span>
            </button>

            <button
              type="button"
              onClick={() => onCompare(subscription)}
              className={quickActionClassName}
              aria-label={`Jämför ${subscription.name}`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 7h10" />
                <path d="m14 4 3 3-3 3" />
                <path d="M17 17H7" />
                <path d="m10 14-3 3 3 3" />
              </svg>
              <span className={tooltipClassName}>Jämför</span>
            </button>

            <button
              type="button"
              onClick={() => togglePanel("benefits")}
              className={`${quickActionClassName} h-10 w-10 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 text-emerald-700 shadow-[0_4px_14px_rgba(5,150,105,0.12)] hover:scale-105 hover:border-emerald-300 hover:from-emerald-100 hover:to-emerald-200 hover:text-emerald-900 ${openPanel === "benefits" ? "border-emerald-400 from-emerald-100 to-emerald-200 text-emerald-900 ring-2 ring-emerald-100" : ""}`}
              aria-label={`Visa förmåner för ${subscription.name}`}
              aria-expanded={openPanel === "benefits"}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="8" width="18" height="13" rx="2" />
                <path d="M12 8v13" />
                <path d="M3 12h18" />
                <path d="M12 8H8.5A2.5 2.5 0 1 1 11 5.5L12 8Z" />
                <path d="M12 8h3.5A2.5 2.5 0 1 0 13 5.5L12 8Z" />
              </svg>
              <span className={tooltipClassName}>Förmåner</span>
            </button>

            <button
              type="button"
              onClick={() => togglePanel("more")}
              className={`${quickActionClassName} ${openPanel === "more" ? "border-slate-400 bg-slate-100" : ""}`}
              aria-label={`Fler val för ${subscription.name}`}
              aria-expanded={openPanel === "more"}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="currentColor"
              >
                <circle cx="5" cy="12" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="19" cy="12" r="1.6" />
              </svg>
              <span className={tooltipClassName}>Mer</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowMobileActions((isOpen) => !isOpen)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm lg:hidden"
            aria-expanded={showMobileActions}
          >
            {showMobileActions ? "Stäng" : "Åtgärder"}
          </button>
        </div>
      </div>

      {showMobileActions && (
        <div className="grid grid-cols-4 gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => onShowAnalysis(subscription)}
            className="rounded-xl bg-white px-2 py-3 text-center text-xs font-black shadow-sm"
          >
            <span className="block text-lg">📊</span>
            <span className="mt-1 block">Analys</span>
          </button>
          <button
            type="button"
            onClick={() => onCompare(subscription)}
            className="rounded-xl bg-white px-2 py-3 text-center text-xs font-black shadow-sm"
          >
            <span className="block text-lg">⚖️</span>
            <span className="mt-1 block">Jämför</span>
          </button>
          <button
            type="button"
            onClick={() => togglePanel("benefits")}
            className="rounded-xl bg-white px-2 py-3 text-center text-xs font-black shadow-sm"
          >
            <span className="block text-lg">🎁</span>
            <span className="mt-1 block">Förmåner</span>
          </button>
          <button
            type="button"
            onClick={() => togglePanel("more")}
            className="rounded-xl bg-white px-2 py-3 text-center text-xs font-black shadow-sm"
          >
            <span className="block text-lg">•••</span>
            <span className="mt-1 block">Mer</span>
          </button>
        </div>
      )}

      {openPanel === "benefits" && (
        <div
          ref={benefitsPanelRef}
          className="scroll-mt-24 border-t border-emerald-100 bg-gradient-to-b from-emerald-50/80 to-white px-5 py-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                  Ditt värde i tjänsten
                </p>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-emerald-800 shadow-sm ring-1 ring-emerald-100">
                  {usedBenefits.length} av {subscription.benefits.length}{" "}
                  används
                </span>
              </div>
              <h3 className="mt-2 text-lg font-black text-emerald-950">
                Vad använder du i {subscription.name}?
              </h3>
              <p className="mt-1 max-w-2xl text-sm font-medium text-slate-600">
                Markera de delar som faktiskt ger dig värde. Benefitly använder
                svaren för bättre planjämförelser och rekommendationer.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200">
                  {subscription.benefits.length} ingår
                </span>
                <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800">
                  {usedBenefits.length} används
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
                  {unusedBenefits.length} ej markerade
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpenPanel(null)}
              className="self-start rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-800 shadow-sm ring-1 ring-emerald-100 hover:bg-emerald-50"
            >
              Stäng
            </button>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.75fr)]">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Ingår i tjänsten
              </p>
              <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {subscription.benefits.slice(0, 8).map((benefit, index) => {
                  const isUsed = Boolean(benefitUsage[benefit]);

                  return (
                    <button
                      key={benefit}
                      type="button"
                      onClick={() => toggleBenefitUsage(benefit)}
                      aria-pressed={isUsed}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                        index > 0 ? "border-t border-slate-100" : ""
                      } ${
                        isUsed
                          ? "bg-emerald-50 text-emerald-950"
                          : "bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-black transition ${
                          isUsed
                            ? "border-emerald-700 bg-emerald-700 text-white"
                            : "border-slate-300 bg-white text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-bold">
                        {benefit}
                      </span>
                      <span
                        className={`text-xs font-black ${
                          isUsed ? "text-emerald-700" : "text-slate-400"
                        }`}
                      >
                        {isUsed ? "Används" : "Markera"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Markera bara sådant du faktiskt använder eller får värde av.
              </p>
            </div>

            <aside
              className={`rounded-3xl border p-4 ${benefitAssessment.className}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide opacity-75">
                    Benefitlys bedömning
                  </p>
                  <h4 className="mt-1 text-lg font-black">
                    {benefitAssessment.title}
                  </h4>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/75 text-lg shadow-sm">
                  {benefitAssessment.icon}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-relaxed">
                {benefitAssessment.text}
              </p>

              <div className="mt-4 rounded-2xl bg-white/75 p-3 shadow-sm">
                <div className="flex items-center justify-between text-xs font-black">
                  <span>Användningsgrad</span>
                  <span>
                    {subscription.benefits.length > 0
                      ? Math.round(
                          (usedBenefits.length / subscription.benefits.length) *
                            100,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                    style={{
                      width: `${
                        subscription.benefits.length > 0
                          ? (usedBenefits.length /
                              subscription.benefits.length) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {unusedBenefits.length > 0 && usedBenefits.length > 0 && (
                <p className="mt-3 text-xs font-bold opacity-80">
                  {unusedBenefits.length} förmån
                  {unusedBenefits.length === 1 ? "" : "er"} är ännu inte
                  markerad{unusedBenefits.length === 1 ? "" : "e"} som använda.
                </p>
              )}

              <div className="mt-4 border-t border-black/10 pt-4">
                <button
                  type="button"
                  disabled={usedBenefits.length === 0}
                  onClick={openInlineComparison}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl bg-emerald-800 px-4 py-3 text-left text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-900 hover:shadow-md disabled:cursor-not-allowed disabled:bg-white/70 disabled:text-slate-400 disabled:shadow-none"
                >
                  <span>{benefitCompareLabel}</span>
                  <span aria-hidden="true">→</span>
                </button>
                <p className="mt-2 text-xs font-semibold leading-relaxed opacity-75">
                  {usedBenefits.length === 0
                    ? "Markera minst en förmån så kan Benefitly anpassa jämförelsen."
                    : "Jämför din plan med billigare nivåer, mer specialiserade tjänster och möjliga överlapp."}
                </p>
              </div>
            </aside>
          </div>
        </div>
      )}

      {openPanel === "comparison" && (
        <div
          ref={inlinePanelRef}
          className="scroll-mt-24 overflow-hidden border-t border-emerald-100 bg-gradient-to-b from-white to-slate-50/70 px-5 py-4"
        >
          <div className="animate-[benefitlyPanelIn_260ms_cubic-bezier(0.22,1,0.36,1)]">
            <InlineServiceComparisonPanel
              subscription={subscription}
              subscriptions={subscriptions}
              tab={comparisonTab}
              onTabChange={setComparisonTab}
              onBack={() => setOpenPanel("benefits")}
              onClose={() => setOpenPanel(null)}
            />
          </div>
        </div>
      )}

      {openPanel === "more" && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
          {rawPriceSanity && !subscription.priceConfirmed && (
            <button
              onClick={() => onConfirmPrice(subscription.id)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold"
            >
              Priset är korrekt
            </button>
          )}
          <button
            onClick={() => onEdit(subscription)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold"
          >
            Redigera
          </button>
          <button
            onClick={() => onDelete(subscription.id)}
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700"
          >
            Ta bort
          </button>
        </div>
      )}
    </div>
  );
}


function InlineServiceComparisonPanel({
  subscription,
  subscriptions,
  tab,
  onTabChange,
  onBack,
  onClose,
}: {
  subscription: Subscription;
  subscriptions: Subscription[];
  tab: "plans" | "alternatives" | "overlap";
  onTabChange: (tab: "plans" | "alternatives" | "overlap") => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const plans = getPlanReferencesForService(subscription);
  const category = getBenefitlyCategory(
    subscription.category,
    subscription.name,
  );
  const alternatives = subscriptions.filter(
    (item) =>
      item.id !== subscription.id &&
      getBenefitlyCategory(item.category, item.name) === category,
  );
  const relatedOverlaps = getOverlapInsights(subscriptions).filter(
    (insight) =>
      normalizeText(insight.title).includes(normalizeText(subscription.name)) ||
      normalizeText(insight.text).includes(normalizeText(subscription.name)),
  );

  return (
    <section aria-label={`Jämförelse för ${subscription.name}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 transition hover:text-emerald-950"
          >
            <span aria-hidden="true">←</span> Visa förmåner
          </button>
          <p className="mt-2 text-xs font-black uppercase tracking-wide text-emerald-700">
            Jämför ditt värde
          </p>
          <h3 className="mt-1 truncate text-lg font-black text-slate-950 sm:text-xl">
            {subscription.name}
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
            Din plan: {subscription.plan || "inte angiven"} · utgår från det du markerat som värdefullt
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Stäng jämförelsen"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto rounded-2xl bg-slate-100 p-1.5">
        {(
          [
            ["plans", "Planer"],
            ["alternatives", "Liknande tjänster"],
            ["overlap", "Överlapp"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onTabChange(value)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-black transition ${
              tab === value
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 min-h-[180px]">
        {tab === "plans" && (
          plans.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const isCurrent =
                  normalizeText(plan.planName) ===
                  normalizeText(subscription.plan ?? "");

                return (
                  <div
                    key={plan.planName}
                    className={`rounded-3xl border p-4 ${
                      isCurrent
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-black">{plan.planName}</h4>
                      {isCurrent && (
                        <span className="rounded-full bg-emerald-700 px-2.5 py-1 text-[11px] font-black text-white">
                          Din plan
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {plan.roughPriceLabel}
                    </p>
                    <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
                      {plan.highlights.slice(0, 5).map((item) => (
                        <li key={item}>✓ {item}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <ComparisonPlaceholder
              title="Planjämförelse är på väg"
              text="Vyn fungerar nu, men detaljerade planer finns ännu inte för den här tjänsten."
            />
          )
        )}

        {tab === "alternatives" && (
          alternatives.length > 0 ? (
            <div className="space-y-3">
              {alternatives.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-black">{item.name}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {item.plan || "Plan ej angiven"} · används {item.usage.toLowerCase()}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-black">
                      {formatCurrency(getMonthlyPrice(item))}/mån
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      Liknande kategori, men innehållet kan skilja sig
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ComparisonPlaceholder
              title="Inga liknande tjänster inlagda ännu"
              text="När du lägger till fler tjänster i samma kategori visas de här."
            />
          )
        )}

        {tab === "overlap" && (
          relatedOverlaps.length > 0 ? (
            <div className="space-y-3">
              {relatedOverlaps.map((insight) => (
                <div
                  key={insight.title}
                  className="rounded-3xl border border-amber-200 bg-amber-50 p-4"
                >
                  <p className="font-black text-amber-950">{insight.title}</p>
                  <p className="mt-2 text-sm font-semibold text-amber-900">
                    {insight.text}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <ComparisonPlaceholder
              title="Inget tydligt överlapp hittat"
              text="Benefitly hittar fler samband när fler tjänster och förmåner är inlagda."
            />
          )
        )}
      </div>
    </section>
  );
}

function SavingsOpportunitiesSheet({
  opportunities,
  directMonthlySavings,
  additionalPlanSavings,
  onClose,
  onOpenAnalysis,
}: {
  opportunities: SavingsOpportunity[];
  directMonthlySavings: number;
  additionalPlanSavings: number;
  onClose: () => void;
  onOpenAnalysis: (subscriptionId: string) => void;
}) {
  const directOpportunities = opportunities.filter(
    (opportunity) => opportunity.kind === "direct",
  );
  const planOpportunities = opportunities.filter(
    (opportunity) => opportunity.kind === "plan",
  );
  const overlapOpportunities = opportunities.filter(
    (opportunity) => opportunity.kind === "overlap",
  );

  function getSubscriptionId(opportunity: SavingsOpportunity) {
    if (opportunity.kind === "direct") {
      return opportunity.id.replace("direct-", "");
    }

    if (opportunity.kind === "plan") {
      return opportunity.id.replace("plan-", "");
    }

    return null;
  }

  function OpportunityCard({
    opportunity,
  }: {
    opportunity: SavingsOpportunity;
  }) {
    const subscriptionId = getSubscriptionId(opportunity);
    const tone =
      opportunity.kind === "direct"
        ? "border-emerald-200 bg-emerald-50"
        : opportunity.kind === "plan"
          ? "border-amber-200 bg-amber-50"
          : "border-sky-200 bg-sky-50";

    return (
      <div className={`min-w-0 overflow-hidden rounded-3xl border p-4 ${tone}`}>
        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <p className="break-words font-black text-slate-950">
              {opportunity.title}
            </p>
            <p className="mt-1 break-words text-sm font-medium leading-relaxed text-slate-700">
              {opportunity.description}
            </p>
          </div>

          {opportunity.monthlyAmount !== undefined && (
            <div className="min-w-0 text-left sm:shrink-0 sm:text-right">
              <p className="break-words text-lg font-black text-emerald-800">
                {opportunity.kind === "plan" ? "Spara " : ""}
                {formatCurrency(opportunity.monthlyAmount)}/mån
              </p>
              <p className="text-xs font-bold text-slate-500">
                {formatCurrency(
                  opportunity.yearlyAmount ?? opportunity.monthlyAmount * 12,
                )}{" "}
                per år
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 flex min-w-0 flex-col gap-2 border-t border-black/5 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="w-fit max-w-full break-words rounded-full bg-white/80 px-3 py-1 text-xs font-black text-slate-700">
            {opportunity.status}
          </span>

          {subscriptionId && (
            <button
              type="button"
              onClick={() => onOpenAnalysis(subscriptionId)}
              className="inline-flex w-fit max-w-full items-center gap-1 self-start whitespace-nowrap rounded-xl bg-white/80 px-3 py-2 text-xs font-black text-emerald-800 hover:bg-white hover:underline sm:self-auto"
            >
              Visa analys <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-3 pt-12 backdrop-blur-sm sm:px-6"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <section className="max-h-[90vh] w-full max-w-4xl overflow-x-hidden overflow-y-auto rounded-t-[2rem] bg-white p-5 pr-6 shadow-2xl sm:rounded-[2rem] sm:p-6 sm:pr-8">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
              Benefitlys sparöversikt
            </p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">
              Möjliga besparingar
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600">
              Benefitly skiljer på kostnader som kan tas bort och planbyten som
              först behöver bekräftas. Beloppen är vägledning, inte löften.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl bg-emerald-950 p-4 text-white">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-100">
              Besparing att undersöka
            </p>
            <p className="mt-1 text-2xl font-black">
              {formatCurrency(directMonthlySavings)}/mån
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-100">
              Tjänster som används sällan och kan pausas eller sägas upp.
            </p>
          </div>
          <div className="rounded-3xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">
              Ytterligare planpotential
            </p>
            <p className="mt-1 text-2xl font-black">
              {additionalPlanSavings > 0
                ? `${formatCurrency(additionalPlanSavings)}/mån`
                : "Ingen summa ännu"}
            </p>
            <p className="mt-1 text-xs font-semibold text-amber-800">
              Kräver att en billigare plan fortfarande täcker dina behov.
            </p>
          </div>
        </div>

        {opportunities.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-3xl">🎉</p>
            <h3 className="mt-3 text-xl font-black">
              Inga tydliga besparingar hittade ännu
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-slate-600">
              Lägg till fler tjänster, plannivåer och användning så får
              Benefitly bättre underlag.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {directOpportunities.length > 0 && (
              <div>
                <h3 className="text-lg font-black">
                  Kan pausas eller sägas upp
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Hela kostnaden kan försvinna, men du bestämmer efter kontroll.
                </p>
                <div className="mt-3 space-y-3">
                  {directOpportunities.map((opportunity) => (
                    <OpportunityCard
                      key={opportunity.id}
                      opportunity={opportunity}
                    />
                  ))}
                </div>
              </div>
            )}

            {planOpportunities.length > 0 && (
              <div>
                <h3 className="text-lg font-black">
                  Billigare planer att överväga
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Kontrollera funktioner som 4K, lagring, skärmar eller
                  familjedelning innan byte.
                </p>
                <div className="mt-3 space-y-3">
                  {planOpportunities.map((opportunity) => (
                    <OpportunityCard
                      key={opportunity.id}
                      opportunity={opportunity}
                    />
                  ))}
                </div>
              </div>
            )}

            {overlapOpportunities.length > 0 && (
              <div>
                <h3 className="text-lg font-black">Överlapp att jämföra</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Här visas ingen totalsumma förrän Benefitly vet vilken tjänst
                  du kan avstå från.
                </p>
                <div className="mt-3 space-y-3">
                  {overlapOpportunities.map((opportunity) => (
                    <OpportunityCard
                      key={opportunity.id}
                      opportunity={opportunity}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
        >
          Stäng
        </button>
      </section>
    </div>
  );
}

function ServiceAnalysisModal({
  subscription,
  onClose,
  onCompare,
}: {
  subscription: Subscription;
  onClose: () => void;
  onCompare: () => void;
}) {
  const insights = getSmartCardInsights(subscription);
  const score = getBenefitlyScore(subscription);
  const scoreMeta = getBenefitlyScoreMeta(score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
              Benefitlys analys
            </p>
            <h2 className="mt-1 text-3xl font-black">{subscription.name}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {formatCurrency(getMonthlyPrice(subscription))}/mån · används{" "}
              {subscription.usage.toLowerCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-[130px_1fr]">
          <div className={`rounded-3xl border p-5 ${scoreMeta.className}`}>
            <p className="text-xs font-black uppercase">Score</p>
            <p className="mt-2 text-4xl font-black">{score}</p>
            <p className="mt-1 text-xs font-black">{scoreMeta.label}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Rekommenderad åtgärd
            </p>
            <p className="mt-2 text-lg font-black text-slate-950">
              {getRecommendedAction(subscription)}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 p-5">
          <h3 className="font-black">Det här baseras analysen på</h3>
          <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
            {insights.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700"
          >
            Stäng
          </button>
          <button
            onClick={onCompare}
            className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white"
          >
            Jämför planer och alternativ
          </button>
        </div>
      </section>
    </div>
  );
}

function ServiceComparisonModal({
  subscription,
  subscriptions,
  onClose,
}: {
  subscription: Subscription;
  subscriptions: Subscription[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"plans" | "alternatives" | "overlap">("plans");
  const plans = getPlanReferencesForService(subscription);
  const category = getBenefitlyCategory(
    subscription.category,
    subscription.name,
  );
  const alternatives = subscriptions.filter(
    (item) =>
      item.id !== subscription.id &&
      getBenefitlyCategory(item.category, item.name) === category,
  );
  const relatedOverlaps = getOverlapInsights(subscriptions).filter(
    (insight) =>
      normalizeText(insight.title).includes(normalizeText(subscription.name)) ||
      normalizeText(insight.text).includes(normalizeText(subscription.name)),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
              Jämförelse
            </p>
            <h2 className="mt-1 text-3xl font-black">{subscription.name}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Din plan: {subscription.plan || "inte angiven"} ·{" "}
              {formatCurrency(getMonthlyPrice(subscription))}/mån
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto rounded-2xl bg-slate-100 p-1.5">
          {(
            [
              ["plans", "Planer"],
              ["alternatives", "Liknande tjänster"],
              ["overlap", "Överlapp"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-black ${tab === value ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "plans" && (
          <div className="mt-5">
            {plans.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => {
                  const isCurrent =
                    normalizeText(plan.planName) ===
                    normalizeText(subscription.plan ?? "");
                  return (
                    <div
                      key={plan.planName}
                      className={`rounded-3xl border p-5 ${isCurrent ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-black">{plan.planName}</h3>
                        {isCurrent && (
                          <span className="rounded-full bg-emerald-700 px-2.5 py-1 text-[11px] font-black text-white">
                            Din plan
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {plan.roughPriceLabel}
                      </p>
                      <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-700">
                        {plan.highlights.slice(0, 5).map((item) => (
                          <li key={item}>✓ {item}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ComparisonPlaceholder
                title="Planjämförelse är på väg"
                text="Vyn fungerar nu, men detaljerade planer finns ännu inte för den här tjänsten."
              />
            )}
          </div>
        )}

        {tab === "alternatives" && (
          <div className="mt-5">
            {alternatives.length > 0 ? (
              <div className="space-y-3">
                {alternatives.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-3 rounded-3xl border border-slate-200 p-5 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-black">{item.name}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {item.plan || "Plan ej angiven"} · används{" "}
                        {item.usage.toLowerCase()}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-black">
                        {formatCurrency(getMonthlyPrice(item))}/mån
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        Liknande kategori, men innehållet kan skilja sig
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ComparisonPlaceholder
                title="Inga liknande tjänster inlagda ännu"
                text="När du lägger till fler tjänster i samma kategori visas de här för enkel jämförelse."
              />
            )}
          </div>
        )}

        {tab === "overlap" && (
          <div className="mt-5">
            {relatedOverlaps.length > 0 ? (
              <div className="space-y-3">
                {relatedOverlaps.map((insight) => (
                  <div
                    key={insight.title}
                    className="rounded-3xl border border-amber-200 bg-amber-50 p-5"
                  >
                    <p className="font-black text-amber-950">{insight.title}</p>
                    <p className="mt-2 text-sm font-semibold text-amber-900">
                      {insight.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <ComparisonPlaceholder
                title="Inget tydligt överlapp hittat"
                text="Benefitly hittar fler samband när fler tjänster och planer är inlagda."
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function ComparisonPlaceholder({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="text-2xl">🔎</p>
      <h3 className="mt-2 text-lg font-black">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm font-medium text-slate-600">
        {text}
      </p>
    </div>
  );
}

function FreeIncludedSection({ onAddClick }: { onAddClick: () => void }) {
  return (
    <section className="mt-8 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-emerald-700">
            Ingår gratis
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Börja manuellt, utan kontovägg
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Gratisversionen räcker för att lägga in abonnemang, medlemskap, kort
            och andra tjänster, se kostnad per månad och år, hitta överlapp och
            få en tydlig nästa åtgärd.
          </p>
        </div>

        <div className="grid gap-2 text-sm font-bold text-slate-700 sm:grid-cols-2 lg:min-w-[460px]">
          <FreeIncludedItem text="Manuell inmatning" />
          <FreeIncludedItem text="Kostnad per månad och år" />
          <FreeIncludedItem text="Överlapp och dubbla tjänster" />
          <FreeIncludedItem text="Förmåner och sparförslag" />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold text-emerald-900">
          Tips: lägg in 3 tjänster, till exempel streaming, mobil och kort, för
          att få en bättre första analys.
        </p>
        <button
          onClick={onAddClick}
          className="rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800"
        >
          Lägg till tjänst
        </button>
      </div>
    </section>
  );
}

function FreeIncludedItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-xs text-white">
        ✓
      </span>
      <span>{text}</span>
    </div>
  );
}

function CheckItemsCard({ checkItems }: { checkItems: CheckItem[] }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-xl">
          ⚠️
        </div>

        <div>
          <p className="text-sm font-medium text-slate-500">
            Saker att kontrollera
          </p>
          <p className="mt-1 text-3xl font-black text-amber-700">
            {checkItems.length}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Prioriterade kontroller</p>

        {checkItems.length > 0 && (
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 hover:bg-slate-200"
          >
            {showDetails ? "Dölj ▲" : "Visa detaljer ▼"}
          </button>
        )}
      </div>

      {showDetails && checkItems.length > 0 && (
        <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-3">
          {checkItems.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white p-3 shadow-sm">
              <p className="text-sm font-black text-slate-900">{item.title}</p>

              <ul className="mt-2 space-y-1">
                {item.reasons.map((reason) => (
                  <li
                    key={reason}
                    className="text-xs font-semibold text-slate-600"
                  >
                    • {reason}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardCard({
  icon,
  title,
  value,
  description,
  highlight = false,
  warning = false,
}: {
  icon: string;
  title: string;
  value: string;
  description: string;
  highlight?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${
            highlight
              ? "bg-emerald-100"
              : warning
                ? "bg-amber-100"
                : "bg-slate-100"
          }`}
        >
          {icon}
        </div>

        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p
            className={`mt-1 text-3xl font-black ${
              highlight
                ? "text-emerald-700"
                : warning
                  ? "text-amber-700"
                  : "text-slate-950"
            }`}
          >
            {value}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function DetectiveReport({
  subscriptions,
  possibleMonthlySavings,
  rarelyUsed,
  overlapInsights,
  strongWarnings,
  priceWarnings,
  checkItems,
  bestNextAction,
}: {
  subscriptions: Subscription[];
  possibleMonthlySavings: number;
  rarelyUsed: Subscription[];
  overlapInsights: Insight[];
  strongWarnings: Subscription[];
  priceWarnings: Subscription[];
  checkItems: CheckItem[];
  bestNextAction: Insight | null;
}) {
  const [showNextActionDetails, setShowNextActionDetails] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(false);

  if (subscriptions.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xl">
            📋
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
              Benefitly-analys
            </p>
            <h2 className="mt-1 text-xl font-black">
              Din första översikt börjar här
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Lägg till 3–5 tjänster, till exempel streaming, mobil och kort. Då
              kan Benefitly börja hitta kostnader, förmåner, överlapp och en
              tydlig nästa åtgärd.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const firstOverlap = overlapInsights[0];
  const focusSubscription = getReportFocusSubscription(subscriptions);
  const reportCheckCount = checkItems.length;
  const score = getOverallBenefitlyScore(
    subscriptions,
    checkItems,
    possibleMonthlySavings,
  );
  const scoreText = getBenefitlyScoreText(score);
  const categoryCount = new Set(
    subscriptions.map((item) => getBenefitlyCategory(item.category, item.name)),
  ).size;
  const confirmedPrices = subscriptions.filter(
    (item) => item.priceConfirmed,
  ).length;
  const servicesWithPlan = subscriptions.filter((item) =>
    item.plan?.trim(),
  ).length;
  const hasUsefulSignals =
    reportCheckCount > 0 ||
    overlapInsights.length > 0 ||
    possibleMonthlySavings > 0;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
            📋
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
              Benefitly-analys
            </p>
            <h2 className="text-2xl font-black">
              {score} / 100 i kontrollpoäng
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {scoreText}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
          {formatCheckCount(reportCheckCount)}
        </div>
      </div>

      {bestNextAction && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                Nästa bästa åtgärd
              </p>
              <h3 className="mt-1 font-black text-emerald-950">
                {bestNextAction.title}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setShowNextActionDetails(!showNextActionDetails)}
              className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-800 hover:bg-emerald-100"
            >
              {showNextActionDetails ? "Dölj ▲" : "Visa detaljer ▼"}
            </button>
          </div>

          {showNextActionDetails && (
            <div className="mt-3">
              <p className="text-sm font-medium text-emerald-900">
                {bestNextAction.text}
              </p>

              {focusSubscription && (
                <div className="mt-3 rounded-2xl bg-white/80 p-3 text-sm font-bold text-emerald-950">
                  {formatCurrency(getMonthlyPrice(focusSubscription))}/mån kan
                  motsvara {formatCurrency(getYearlyPrice(focusSubscription))}{" "}
                  per år.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Din analys visar
          </p>

          <button
            type="button"
            onClick={() => setShowAllDetails(!showAllDetails)}
            className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 hover:bg-slate-100"
          >
            {showAllDetails ? "Dölj detaljer ▲" : "Visa mer ▼"}
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <ReportLine
            icon="✅"
            text={`${subscriptions.length} tjänst${
              subscriptions.length === 1 ? "" : "er"
            } i ${categoryCount} kategori${categoryCount === 1 ? "" : "er"}`}
            strong
          />

          <ReportLine
            icon="💰"
            text={`Besparing att undersöka: ${formatCurrency(
              possibleMonthlySavings,
            )}/mån`}
            strong={possibleMonthlySavings > 0}
          />

          {firstOverlap ? (
            <ReportLine icon="🔁" text={firstOverlap.title} />
          ) : (
            <ReportLine
              icon="🔁"
              text="Inga tydliga överlapp hittade ännu. Lägg till fler tjänster för bättre jämförelse."
            />
          )}

          {reportCheckCount === 0 && (
            <ReportLine
              icon="🟢"
              text="Inga akuta varningssignaler hittades i det du lagt in."
            />
          )}

          {showAllDetails && (
            <>
              <ReportLine
                icon="🧩"
                text={`${servicesWithPlan} av ${subscriptions.length} tjänster har vald plan. Fler planer ger smartare analys.`}
              />

              <ReportLine
                icon="🧾"
                text={`${confirmedPrices} pris${
                  confirmedPrices === 1 ? "" : "er"
                } är bekräftade av dig.`}
              />

              {priceWarnings.length > 0 && (
                <ReportLine icon="⚠️" text="Minst ett pris bör kontrolleras." />
              )}

              {rarelyUsed.length > 0 && (
                <ReportLine
                  icon="👀"
                  text={`${rarelyUsed.length} tjänst${
                    rarelyUsed.length === 1 ? "" : "er"
                  } används sällan.`}
                />
              )}

              {strongWarnings.length > 0 && (
                <ReportLine
                  icon="🔥"
                  text={`${strongWarnings.length} tydlig sparsignal${
                    strongWarnings.length === 1 ? "" : "er"
                  } hittades.`}
                />
              )}
            </>
          )}
        </div>
      </div>

      {!hasUsefulSignals && subscriptions.length < 3 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">
          Lägg till två tjänster till, gärna mobil och kort. Då får Benefitly
          bättre chans att hitta verkliga överlapp och förmåner.
        </div>
      )}
    </section>
  );
}

function getOverallBenefitlyScore(
  subscriptions: Subscription[],
  checkItems: CheckItem[],
  possibleMonthlySavings: number,
) {
  if (subscriptions.length === 0) {
    return 0;
  }

  const serviceCoverage = Math.min(subscriptions.length * 12, 42);
  const planCoverage = Math.round(
    (subscriptions.filter((item) => item.plan?.trim()).length /
      subscriptions.length) *
      24,
  );
  const usageCoverage = Math.round(
    (subscriptions.filter((item) => item.usage).length / subscriptions.length) *
      18,
  );
  const pricePenalty = Math.min(checkItems.length * 7, 28);
  const savingsPenalty = possibleMonthlySavings > 0 ? 8 : 0;

  return Math.max(
    12,
    Math.min(
      100,
      24 +
        serviceCoverage +
        planCoverage +
        usageCoverage -
        pricePenalty -
        savingsPenalty,
    ),
  );
}

function getBenefitlyScoreText(score: number) {
  if (score >= 85) {
    return "Du har riktigt bra kontroll över dina återkommande kostnader.";
  }

  if (score >= 65) {
    return "Bra grund. Lägg till fler planer och priser för ännu bättre analys.";
  }

  if (score >= 40) {
    return "Du är igång. Några fler tjänster gör analysen mycket smartare.";
  }

  return "Lägg till fler tjänster för att låsa upp den smarta analysen.";
}

function getReportFocusSubscription(subscriptions: Subscription[]) {
  const priceWarning = getHighestPriceWarning(subscriptions);

  if (priceWarning) {
    return priceWarning;
  }

  const rarelyUsedExpensive = subscriptions
    .filter((item) => item.usage === "Sällan" && getMonthlyPrice(item) >= 150)
    .sort((a, b) => getMonthlyPrice(b) - getMonthlyPrice(a));

  if (rarelyUsedExpensive.length > 0) {
    return rarelyUsedExpensive[0];
  }

  const rarelyUsed = subscriptions
    .filter((item) => item.usage === "Sällan" && !isConfirmedVeryLowCost(item))
    .sort((a, b) => getMonthlyPrice(b) - getMonthlyPrice(a));

  if (rarelyUsed.length > 0) {
    return rarelyUsed[0];
  }

  const sometimesExpensive = subscriptions
    .filter((item) => item.usage === "Ibland" && getMonthlyPrice(item) >= 250)
    .sort((a, b) => getMonthlyPrice(b) - getMonthlyPrice(a));

  if (sometimesExpensive.length > 0) {
    return sometimesExpensive[0];
  }

  return null;
}

function ReportLine({
  icon,
  text,
  strong = false,
}: {
  icon: string;
  text: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm">
        {icon}
      </span>
      <p
        className={`text-sm ${
          strong
            ? "font-extrabold text-emerald-700"
            : "font-medium text-slate-700"
        }`}
      >
        {text}
      </p>
    </div>
  );
}

function StorageStatusBadge({ status }: { status: string }) {
  const isGood =
    status.includes("Benefitly") ||
    status.includes("Supabase") ||
    status.includes("Dina ändringar sparas");
  const isWorking =
    status.includes("Sparar") ||
    status.includes("Ansluter") ||
    status.includes("Rensar");

  return (
    <div
      className={`rounded-full border px-4 py-2 text-sm font-bold shadow-sm ${
        isGood
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : isWorking
            ? "border-slate-200 bg-white text-slate-600"
            : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      {isGood ? "✓" : isWorking ? "⏳" : "⚠️"} {status}
    </div>
  );
}

function PlanPriceWarningModal({
  message,
  onCancel,
  onConfirm,
}: {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-amber-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
            ⚠️
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">
              Benefitly-priskontroll
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Pris och plan verkar inte matcha
            </h2>
            <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          Du kan spara ändå om du vet att priset stämmer, till exempel vid
          kampanj, familjedelning eller arbetsgivarförmån.
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-100"
          >
            Ändra
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800"
          >
            Spara ändå
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({
  currency,
  onCurrencyChange,
  onClose,
}: {
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600">
              <span>⚙️</span>
              Inställningar
            </div>

            <h2 className="mt-3 text-3xl font-black tracking-tight">
              Anpassa Benefitly
            </h2>

            <p className="mt-3 max-w-xl text-sm text-slate-600">
              Här kan du välja valuta och se framtida val för import och
              datakopplingar. Språkstöd kommer senare när appens texter är mer
              färdiga.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Allmänt</h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-bold text-slate-600">Språk</p>
                <div className="mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700">
                  Svenska
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Fler språk kommer senare när texterna är färdiga.
                </p>
              </div>

              <FormField label="Valuta">
                <select
                  value={currency}
                  onChange={(event) =>
                    onCurrencyChange(event.target.value as CurrencyCode)
                  }
                  className={inputClassName}
                >
                  <option value="SEK">SEK - svenska kronor</option>
                  <option value="EUR">EUR - euro</option>
                  <option value="USD">USD - dollar</option>
                  <option value="GBP">GBP - pund</option>
                  <option value="DKK">DKK - danska kronor</option>
                  <option value="NOK">NOK - norska kronor</option>
                </select>
              </FormField>
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-500">
              Valuta ändrar hur belopp visas och hur prisvarningar bedöms. Appen
              räknar inte om gamla belopp mellan valutor ännu.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-black text-slate-950">
              Data, import och Premium
            </h3>
            <p className="mt-2 text-sm font-medium text-slate-600">
              Gratisversionen använder manuell inmatning. Import, mejlskanning,
              bankkoppling, prisjämförelser och smartare analys hör till
              kommande Premium.
            </p>

            <div className="mt-4 grid gap-3">
              <SettingsStatusLine
                title="Manuell inmatning"
                text="Aktiv i gratisversionen."
                status="Aktiv"
              />
              <SettingsStatusLine
                title="Kvitton och filer"
                text="Framtida Premium-val för att hitta kostnader, rabatter och förmåner."
                status="Premium · frivilligt"
              />
              <SettingsStatusLine
                title="Mejlskanning"
                text="Framtida Premium-val för att hitta kvitton, fakturor och återkommande betalningar."
                status="Premium · frivilligt"
              />
              <SettingsStatusLine
                title="Bankkoppling"
                text="Framtida Premium-val via säker bankkoppling/open banking. Aldrig ett krav."
                status="Premium · frivilligt"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <h3 className="text-lg font-black text-emerald-950">Integritet</h3>
            <p className="mt-2 text-sm font-medium text-emerald-900">
              Gratisversionen använder bara det du själv skriver in, till
              exempel abonnemang, medlemskap, kort och andra tjänster. Den
              kopplar inte bank eller mejl. Tjänsterna sparas i
              Benefitly-databasen med en anonym användare, så du slipper en
              synlig inloggningsvägg. Framtida bankkoppling ska ske säkert via
              godkänd koppling/open banking, inte genom att du skriver
              banklösenord i appen.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
        >
          Spara och stäng
        </button>
      </section>
    </div>
  );
}

function SettingsStatusLine({
  title,
  text,
  status,
}: {
  title: string;
  text: string;
  status: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <p className="font-black text-slate-950">{title}</p>
          <p className="mt-1 text-sm text-slate-600">{text}</p>
        </div>

        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
          {status}
        </span>
      </div>
    </div>
  );
}

function PremiumPreviewCard({
  onShowExamples,
}: {
  onShowExamples: () => void;
}) {
  return (
    <section className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-xl">
          ✨
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black uppercase tracking-wide text-violet-700">
              Kommande Premium
            </p>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-violet-700 shadow-sm">
              Frivilligt
            </span>
          </div>

          <h3 className="mt-1 text-lg font-black text-slate-950">
            Hitta mer än bara abonnemang
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Gratisversionen är manuell och utan synlig inloggningsvägg. Premium
            kan senare hjälpa dig hitta återkommande kostnader, medlemskap,
            rabatter, förmåner, överlapp och smartare sparmöjligheter — bara om
            användaren själv väljer det.
          </p>

          <div className="mt-3 grid gap-2 text-xs font-bold text-slate-700 sm:grid-cols-2">
            <span className="rounded-2xl bg-white px-3 py-2 shadow-sm">
              🔁 Återkommande kostnader
            </span>
            <span className="rounded-2xl bg-white px-3 py-2 shadow-sm">
              🏷️ Rabatter och förmåner
            </span>
            <span className="rounded-2xl bg-white px-3 py-2 shadow-sm">
              🔍 Överlapp och dubbla tjänster
            </span>
            <span className="rounded-2xl bg-white px-3 py-2 shadow-sm">
              🔐 Frivilliga kopplingar
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={onShowExamples}
              className="rounded-2xl border border-violet-200 bg-white px-4 py-2 text-sm font-black text-violet-700 hover:bg-violet-50"
            >
              Visa exempel på Premium
            </button>

            <p className="text-xs font-bold text-slate-500">
              Gratisversionen kräver inga kopplingar.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PremiumDetailsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-violet-700">
              <span>✨</span>
              Premium-exempel
            </div>

            <h2 className="mt-3 text-3xl font-black tracking-tight">
              Premium kan hitta mer än kostnader
            </h2>

            <p className="mt-3 max-w-xl text-sm text-slate-600">
              Premium är inte aktivt ännu. Det här visar bara hur framtida
              premiumfunktioner kan hjälpa dig att hitta återkommande kostnader,
              medlemskap, rabatter, oanvända förmåner, överlapp, billigare
              alternativ och smartare påminnelser.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <PremiumSection
            icon="📥"
            title="Import som du själv väljer"
            subtitle="Automatisk hjälp utan krav"
            items={[
              "Ladda upp kvitton eller filer för att hitta kostnader och förmåner.",
              "Mejlskanning kan senare hitta kvitton, fakturor och återkommande betalningar.",
              "Bankkoppling kan bli ett frivilligt alternativ via säker bankkoppling/open banking.",
              "Du kan alltid fortsätta använda appen manuellt utan att koppla något.",
            ]}
          />

          <PremiumSection
            icon="🏷️"
            title="Rabatter nära dig"
            subtitle="Baserat på verklig data"
            items={[
              "Visa bekräftade rabatter från dina medlemskap, kort och förmåner.",
              "Matcha rabatter mot butiker och kategorier, till exempel vinterkläder, resor eller elektronik.",
              "Påminna när en relevant rabatt kan vara värd att använda.",
              "Inga gissningar: appen ska visa vad den faktiskt har grund för.",
            ]}
          />

          <PremiumSection
            icon="🧭"
            title="Smartare analys"
            subtitle="Mer än abonnemang"
            items={[
              "Hitta överlapp mellan abonnemang, försäkringar, bankkort och medlemskap.",
              "Visa förmåner du redan har rätt till men kanske inte använder.",
              "Jämföra din kostnad mot billigare alternativ när appen har tillräcklig data.",
              "För mobilabonnemang kan surfmängd, pris och användning vägas ihop.",
              "Bygga en smart sparplan med vad du bör kontrollera först.",
            ]}
          />

          <PremiumSection
            icon="⏰"
            title="Smarta påminnelser"
            subtitle="När tipsen är relevanta"
            items={[
              "Påminna inför förnyelser, uppsägningstider och provperioder.",
              "Ge säsongstips, till exempel inför vinterkläder, semester eller skolstart.",
              "Koppla påminnelser till rabatter och förmåner som appen vet att du har.",
              "Hjälpa dig använda rätt rabatt innan du handlar.",
            ]}
          />
        </div>

        <div className="mt-6 rounded-2xl bg-slate-100 p-4">
          <p className="text-sm font-black text-slate-800">
            Du väljer själv vad du vill koppla.
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Gratisversionen kopplar inte bank eller mejl. Premium ska kunna
            använda kvitton, filer, mejl eller säker bankkoppling om du själv
            väljer det. Bankkoppling är aldrig ett krav, ska inte kräva att du
            skriver banklösenord i appen och ska kunna kopplas bort igen.
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
        >
          Jag förstår
        </button>
      </section>
    </div>
  );
}

function PremiumSection({
  icon,
  title,
  subtitle,
  items,
}: {
  icon: string;
  title: string;
  subtitle: string;
  items: string[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-xl">
          {icon}
        </span>

        <div>
          <p className="text-xs font-black uppercase tracking-wide text-violet-700">
            {subtitle}
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{title}</h3>

          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-0.5 text-emerald-700">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ServiceSuggestionDropdown({
  services,
  onChoose,
}: {
  services: KnownService[];
  onChoose: (service: KnownService) => void;
}) {
  return (
    <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-2 shadow-xl">
      <p className="px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500">
        Vanliga tjänster
      </p>

      <div className="grid gap-1">
        {services.map((service) => (
          <button
            key={service.displayName}
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              onChoose(service);
            }}
            className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left hover:bg-slate-100"
          >
            <div>
              <p className="text-sm font-black text-slate-900">
                {service.displayName}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {getBenefitlyCategory(service.category, service.displayName)}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              Välj
            </span>
          </button>
        ))}
      </div>

      <p className="px-3 py-2 text-xs font-semibold text-slate-500">
        Finns den inte i listan? Skriv namnet själv.
      </p>
    </div>
  );
}

function RecognizedServiceBox({
  service,
  selectedPlan,
  onPlanChange,
  onUseCategory,
  onUseBillingPeriod,
  onChoosePlan,
}: {
  service: KnownService;
  selectedPlan: string;
  onPlanChange: (plan: string) => void;
  onUseCategory: () => void;
  onUseBillingPeriod: () => void;
  onChoosePlan: (plan: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
            Smart igenkänning
          </p>

          <h4 className="mt-1 text-lg font-black text-emerald-950">
            Känd tjänst: {service.displayName}
          </h4>

          <p className="mt-2 text-sm font-medium text-emerald-900">
            {service.note}
          </p>

          <div className="mt-4">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
              Vanliga planer
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {service.plans.map((planName) => (
                <button
                  key={planName}
                  type="button"
                  onClick={() => onChoosePlan(planName)}
                  className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                >
                  {planName}
                </button>
              ))}
            </div>

            <div className="mt-4 max-w-xl">
              <FormField label="Vald plan / nivå">
                <input
                  value={selectedPlan}
                  onChange={(event) => onPlanChange(event.target.value)}
                  placeholder="Välj ovan eller skriv själv"
                  className={inputClassName}
                />
              </FormField>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            onClick={onUseCategory}
            className="rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
          >
            Använd kategori:{" "}
            {getBenefitlyCategory(service.category, service.displayName)}
          </button>

          <button
            type="button"
            onClick={onUseBillingPeriod}
            className="rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
          >
            {getBillingPeriodSuggestionLabel(service.recommendedBillingPeriod)}
          </button>
        </div>
      </div>

      <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-xs font-semibold text-slate-600">
        Appen föreslår vanliga val, men priset skriver du själv.
      </p>
    </div>
  );
}

function InlinePlanPriceWarning({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-950 md:col-span-2">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-xl">
          ⚠️
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-amber-700">
            Benefitly-priskontroll
          </p>
          <p className="mt-1 text-sm font-bold leading-relaxed">{message}</p>
          <p className="mt-2 text-xs font-semibold text-amber-800">
            Du kan ändå spara om priset stämmer, till exempel vid kampanj, delad
            kostnad eller arbetsgivarförmån.
          </p>
        </div>
      </div>
    </div>
  );
}

function GettingStartedGuide({
  onAddClick,
  onSkipClick,
}: {
  onAddClick: () => void;
  onSkipClick: () => void;
}) {
  return (
    <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-emerald-700">
            Kom igång
          </p>

          <h2 className="mt-1 text-2xl font-black">
            Få en smartare analys på 1 minut
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Lägg till några abonnemang, medlemskap eller kort. Benefitly visar
            vad som kostar mest, används sällan, kan överlappa och vad du bör
            kontrollera först.
          </p>

          <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-3">
            <GuideStep number="1" text="Lägg till streaming" />
            <GuideStep number="2" text="Lägg till mobil eller gym" />
            <GuideStep number="3" text="Lägg till kort eller försäkring" />
          </div>
        </div>

        <div className="flex shrink-0 gap-3">
          <button
            onClick={onAddClick}
            className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
          >
            Lägg till första
          </button>

          <button
            onClick={onSkipClick}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            Hoppa över
          </button>
        </div>
      </div>
    </section>
  );
}

function GuideStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-xs font-black text-white">
        {number}
      </span>
      <span className="font-semibold">{text}</span>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-600">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function EmptyState({ onAddClick }: { onAddClick: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-emerald-300 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
            🔎
          </span>
          <div>
            <h3 className="text-xl font-black">
              Lägg till dina första tjänster
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
              Börja med tre saker du redan betalar för. Då kan Benefitly visa
              kostnader, förmåner, möjliga besparingar och vad du bör
              kontrollera först.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-700">
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                📺 Streaming
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                📱 Mobil
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                💳 Medlemskap eller kort
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onAddClick}
          className="shrink-0 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
        >
          Lägg till första tjänsten
        </button>
      </div>
    </div>
  );
}

function getServiceIcon(subscription: Subscription) {
  const name = normalizeText(subscription.name);

  if (name.includes("netflix")) {
    return {
      label: "N",
      className: "bg-slate-950 text-red-500",
    };
  }

  if (name.includes("spotify")) {
    return {
      label: "S",
      className: "bg-emerald-500 text-slate-950",
    };
  }

  if (name.includes("hbo") || name.includes("max")) {
    return {
      label: "MAX",
      className: "bg-indigo-700 text-white",
    };
  }

  if (name.includes("disney")) {
    return {
      label: "D+",
      className: "bg-blue-700 text-white",
    };
  }

  if (name.includes("youtube")) {
    return {
      label: "YT",
      className: "bg-red-600 text-white",
    };
  }

  if (name.includes("google one") || name.includes("google")) {
    return {
      label: "G1",
      className: "border border-slate-200 bg-white text-blue-600",
    };
  }

  if (name.includes("microsoft 365") || name.includes("office")) {
    return {
      label: "M365",
      className: "bg-blue-600 text-white",
    };
  }

  if (name.includes("icloud")) {
    return {
      label: "☁",
      className: "bg-sky-100 text-sky-700",
    };
  }

  if (name.includes("dropbox")) {
    return {
      label: "DB",
      className: "bg-blue-500 text-white",
    };
  }

  if (name.includes("crunchyroll")) {
    return {
      label: "C",
      className: "bg-orange-500 text-white",
    };
  }

  if (name.includes("nordic wellness")) {
    return {
      label: "NW",
      className: "bg-slate-900 text-white",
    };
  }

  if (name.includes("sats")) {
    return {
      label: "SATS",
      className: "bg-red-700 text-white",
    };
  }

  if (name.includes("fitness24seven") || name.includes("fitness 24 seven")) {
    return {
      label: "F24",
      className: "bg-purple-700 text-white",
    };
  }

  if (name.includes("foodora")) {
    return {
      label: "FO",
      className: "bg-pink-500 text-white",
    };
  }

  if (name.includes("wolt")) {
    return {
      label: "W",
      className: "bg-sky-500 text-white",
    };
  }

  if (name.includes("amazon prime") || name.includes("prime video")) {
    return {
      label: "PR",
      className: "bg-slate-900 text-sky-300",
    };
  }

  if (name.includes("bankkort") || name.includes("kreditkort")) {
    return {
      label: "💳",
      className: "bg-emerald-100 text-emerald-800",
    };
  }

  if (name.includes("försäkring") || name.includes("insurance")) {
    return {
      label: "🛡",
      className: "bg-amber-100 text-amber-800",
    };
  }

  return {
    label: subscription.name.slice(0, 2).toUpperCase(),
    className: "bg-slate-900 text-white",
  };
}

type PlanReference = {
  planName: string;
  priceLevel: "budget" | "standard" | "premium" | "highest";
  roughPriceLabel: string;
  highlights: string[];
  roughMonthlyMin?: number;
  roughMonthlyMax?: number;
};

function getPriceLevelLabel(level: PlanReference["priceLevel"]) {
  if (level === "budget") {
    return "Lägst prisnivå";
  }

  if (level === "standard") {
    return "Standardnivå";
  }

  if (level === "premium") {
    return "Premium";
  }

  return "Högst prisnivå";
}

function getPriceLevelClassName(level: PlanReference["priceLevel"]) {
  if (level === "budget") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (level === "standard") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (level === "premium") {
    return "border-violet-200 bg-violet-50 text-violet-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getPlanReferencesForService(
  subscription: Subscription,
): PlanReference[] {
  const normalizedName = normalizeText(subscription.name);

  if (normalizedName.includes("netflix")) {
    return [
      {
        planName: "Med reklam",
        priceLevel: "budget",
        roughPriceLabel: "Från ca låg nivå",
        roughMonthlyMin: 59,
        roughMonthlyMax: 119,
        highlights: [
          "Filmer och serier",
          "Reklam ingår",
          "Begränsade nedladdningar kan gälla",
          "Full HD kan ingå beroende på land",
          "Profiler och barnprofil",
          "Passar om du vill hålla kostnaden nere",
        ],
      },
      {
        planName: "Standard",
        priceLevel: "standard",
        roughPriceLabel: "Från ca mellannivå",
        roughMonthlyMin: 99,
        roughMonthlyMax: 179,
        highlights: [
          "Filmer och serier utan reklam där planen erbjuder det",
          "Full HD",
          "Flera profiler",
          "Barnprofil",
          "Nedladdningar kan ingå",
          "Passar ofta för normal användning",
        ],
      },
      {
        planName: "Premium",
        priceLevel: "premium",
        roughPriceLabel: "Från ca premium-nivå",
        roughMonthlyMin: 149,
        roughMonthlyMax: 249,
        highlights: [
          "4K Ultra HD kan ingå",
          "HDR kan ingå",
          "Bättre ljud kan ingå",
          "Fler samtidiga enheter",
          "Flera profiler och barnprofil",
          "Passar bäst om flera i hushållet använder tjänsten",
        ],
      },
    ];
  }

  if (normalizedName.includes("spotify")) {
    return [
      {
        planName: "Individual",
        priceLevel: "standard",
        roughPriceLabel: "Från ca standardnivå",
        roughMonthlyMin: 110,
        roughMonthlyMax: 140,
        highlights: [
          "Musik och podcasts",
          "Reklamfritt lyssnande",
          "Offline-lyssning",
          "Högre ljudkvalitet än gratisnivå",
          "Passar en person",
        ],
      },
      {
        planName: "Duo",
        priceLevel: "premium",
        roughPriceLabel: "Billigare än två separata konton",
        roughMonthlyMin: 160,
        roughMonthlyMax: 180,
        highlights: [
          "Två separata konton",
          "Reklamfritt lyssnande",
          "Offline-lyssning",
          "Passar två personer i samma hushåll",
          "Kan ersätta två individuella abonnemang",
        ],
      },
      {
        planName: "Family",
        priceLevel: "premium",
        roughPriceLabel: "Bäst vid flera användare",
        roughMonthlyMin: 200,
        roughMonthlyMax: 230,
        highlights: [
          "Flera separata konton",
          "Familjemix och barnläge kan ingå",
          "Reklamfritt lyssnande",
          "Offline-lyssning",
          "Kan bli prisvärt om flera använder Spotify",
        ],
      },
      {
        planName: "Student",
        priceLevel: "budget",
        roughPriceLabel: "Rabatterad nivå",
        roughMonthlyMin: 65,
        roughMonthlyMax: 90,
        highlights: [
          "Rabatterat studentpris",
          "Musik och podcasts",
          "Offline-lyssning",
          "Kräver normalt verifierad studentstatus",
        ],
      },
    ];
  }

  if (normalizedName.includes("disney")) {
    return [
      {
        planName: "Standard",
        priceLevel: "standard",
        roughPriceLabel: "Från ca mellannivå",
        roughMonthlyMin: 69,
        roughMonthlyMax: 139,
        highlights: [
          "Disney, Pixar, Marvel och Star Wars kan ingå",
          "Barnprofiler",
          "Profiler",
          "HD eller Full HD beroende på plan och land",
          "Passar familjeunderhållning",
        ],
      },
      {
        planName: "Premium",
        priceLevel: "premium",
        roughPriceLabel: "Från ca premium-nivå",
        roughMonthlyMin: 109,
        roughMonthlyMax: 189,
        highlights: [
          "Högre bildkvalitet kan ingå",
          "Fler samtidiga strömmar kan ingå",
          "Nedladdningar kan ingå",
          "Disney, Pixar, Marvel, Star Wars och National Geographic kan ingå",
          "Passar hushåll som använder tjänsten ofta",
        ],
      },
    ];
  }

  if (normalizedName.includes("google one")) {
    return [
      {
        planName: "Basic",
        priceLevel: "budget",
        roughPriceLabel: "Lägre lagringsnivå",
        roughMonthlyMin: 15,
        roughMonthlyMax: 35,
        highlights: [
          "Extra Google-lagring",
          "Google Photos och Drive",
          "Familjedelning kan ingå",
          "Passar om du bara behöver lite extra lagring",
        ],
      },
      {
        planName: "Standard",
        priceLevel: "standard",
        roughPriceLabel: "Mellan lagringsnivå",
        roughMonthlyMin: 25,
        roughMonthlyMax: 55,
        highlights: [
          "Mer Google-lagring",
          "Google Photos och Drive",
          "Familjedelning kan ingå",
          "Backup och lagring för flera enheter",
        ],
      },
      {
        planName: "Premium",
        priceLevel: "premium",
        roughPriceLabel: "Högre lagringsnivå",
        roughMonthlyMin: 79,
        roughMonthlyMax: 179,
        highlights: [
          "Stor Google-lagring",
          "Familjedelning",
          "Backup av mobil och bilder",
          "Kan överlappa med iCloud, Dropbox eller OneDrive",
          "Vissa extra Google-funktioner kan ingå beroende på plan",
        ],
      },
    ];
  }

  if (
    normalizedName.includes("microsoft 365") ||
    normalizedName.includes("office")
  ) {
    return [
      {
        planName: "Personal",
        priceLevel: "standard",
        roughPriceLabel: "En person",
        roughMonthlyMin: 60,
        roughMonthlyMax: 120,
        highlights: [
          "Word, Excel och PowerPoint",
          "OneDrive-lagring",
          "Outlook och OneNote kan ingå",
          "Passar en användare",
          "Kan ersätta separat molnlagring",
        ],
      },
      {
        planName: "Family",
        priceLevel: "premium",
        roughPriceLabel: "Flera personer",
        roughMonthlyMin: 90,
        roughMonthlyMax: 180,
        highlights: [
          "Office-appar för flera användare",
          "OneDrive-lagring per användare",
          "Familjedelning",
          "Backup och filsynkning",
          "Kan bli prisvärt om flera använder Office eller OneDrive",
        ],
      },
    ];
  }

  return [];
}

function getSelectedPlanPriceRange(subscription: Subscription) {
  const selectedPlanText = getPlanText(subscription.plan);

  if (!selectedPlanText) {
    return null;
  }

  const service = findKnownService(subscription.name);
  const serviceName = service?.displayName ?? subscription.name;
  const directKey = getPlanPriceRangeKey(
    serviceName,
    subscription.plan,
    activeCurrency,
    "monthly",
  );

  if (activePlanPriceRangeMap[directKey]) {
    return activePlanPriceRangeMap[directKey];
  }

  return (
    Object.values(activePlanPriceRangeMap).find(
      (range) =>
        normalizeText(range.serviceDisplayName) ===
          normalizeText(serviceName) &&
        normalizeText(range.planName) === selectedPlanText &&
        range.currency === activeCurrency &&
        range.billingPeriod === "monthly",
    ) ?? null
  );
}

function getSelectedPlanReference(subscription: Subscription) {
  const planReferences = getPlanReferencesForService(subscription);
  const selectedPlan = getPlanText(subscription.plan);

  if (!selectedPlan) {
    return null;
  }

  return (
    planReferences.find(
      (plan) => normalizeText(plan.planName) === selectedPlan,
    ) ??
    planReferences.find((plan) =>
      selectedPlan.includes(normalizeText(plan.planName)),
    ) ??
    null
  );
}

function getPlanPriceSanity(subscription: Subscription): PriceSanity | null {
  const selectedPlan = getSelectedPlanReference(subscription);
  const selectedPlanRange = getSelectedPlanPriceRange(subscription);

  const minPrice =
    selectedPlanRange?.typicalMinPrice ?? selectedPlan?.roughMonthlyMin;
  const maxPrice =
    selectedPlanRange?.typicalMaxPrice ?? selectedPlan?.roughMonthlyMax;
  const planName = selectedPlanRange?.planName ?? selectedPlan?.planName;

  if (!minPrice || !maxPrice || !planName) {
    return null;
  }

  const monthlyPrice = getMonthlyPrice(subscription);
  const multiplier = getCurrencyMultiplier();
  const typicalMinLimit = Math.round(minPrice * multiplier);
  const typicalMaxLimit = Math.round(maxPrice * multiplier);
  const lowLimit = Math.max(
    0,
    Math.round((selectedPlanRange?.lowPrice ?? typicalMinLimit) * multiplier),
  );
  const highLimit = Math.round(
    (selectedPlanRange?.highPrice ?? typicalMaxLimit) * multiplier,
  );
  const extremeHighLimit = Math.max(
    highLimit + 1,
    Math.round(highLimit * 1.25),
  );

  if (monthlyPrice > 0 && monthlyPrice < lowLimit) {
    return {
      level: "low",
      lowLimit,
      categoryLabel: `vald plan (${planName})`,
    };
  }

  if (monthlyPrice > highLimit) {
    return {
      level: monthlyPrice > extremeHighLimit ? "extreme" : "unusual",
      unusualLimit: highLimit,
      extremeLimit: extremeHighLimit,
      categoryLabel: `vald plan (${planName})`,
    };
  }

  return null;
}

function formatMoney(amount: number) {
  return `${Math.round(amount)}`;
}

function getDraftPlanPriceWarningMessage({
  name,
  category,
  price,
  billingPeriod,
  usage,
  plan,
}: {
  name: string;
  category: string;
  price: string;
  billingPeriod: BillingPeriod;
  usage: string;
  plan: string;
}) {
  const priceAsNumber = Math.round(Number(price));

  if (
    !name ||
    price === "" ||
    Number.isNaN(priceAsNumber) ||
    priceAsNumber < 0
  ) {
    return null;
  }

  return getPlanPriceWarningMessage({
    id: "draft",
    name,
    category,
    price: priceAsNumber,
    billingPeriod,
    usage,
    plan: plan.trim(),
    priceConfirmed: false,
    benefits: [],
  });
}

function getPlanPriceWarningMessage(subscription: Subscription) {
  const sanity = getPlanPriceSanity(subscription);
  const selectedPlan = getSelectedPlanReference(subscription);
  const selectedPlanRange = getSelectedPlanPriceRange(subscription);
  const planName = selectedPlanRange?.planName ?? selectedPlan?.planName;
  const minPrice =
    selectedPlanRange?.typicalMinPrice ?? selectedPlan?.roughMonthlyMin;
  const maxPrice =
    selectedPlanRange?.typicalMaxPrice ?? selectedPlan?.roughMonthlyMax;

  if (!sanity || !planName || !minPrice || !maxPrice) {
    return null;
  }

  const rangeText = `${formatMoney(minPrice)}–${formatMoney(maxPrice)} kr/mån`;

  if (sanity.level === "low") {
    return `Priset verkar lågt för ${subscription.name} ${planName}. Normal prisnivå är ungefär ${rangeText}. Kontrollera att du har valt rätt plan, rätt betalperiod och rätt pris.`;
  }

  return `Priset verkar högt för ${subscription.name} ${planName}. Normal prisnivå är ungefär ${rangeText}. Kontrollera att du har valt rätt plan, rätt betalperiod och rätt pris.`;
}

function getPlanPosition(subscription: Subscription) {
  const planReferences = getPlanReferencesForService(subscription);
  const selectedPlan = getSelectedPlanReference(subscription);

  if (!selectedPlan) {
    return null;
  }

  const index = planReferences.findIndex(
    (plan) =>
      normalizeText(plan.planName) === normalizeText(selectedPlan.planName),
  );

  if (index < 0) {
    return null;
  }

  return {
    index,
    cheaperPlans: planReferences.slice(0, index),
    moreExpensivePlans: planReferences.slice(index + 1),
  };
}

function getBenefitlyScore(subscription: Subscription) {
  let score = 78;
  const priceSanity = getPriceSanity(subscription);
  const planPosition = getPlanPosition(subscription);

  if (subscription.usage === "Ofta") {
    score += 12;
  }

  if (subscription.usage === "Sällan") {
    score -= 18;
  }

  if (subscription.usage === "Ibland") {
    score -= 5;
  }

  if (priceSanity?.level === "low") {
    score -= 8;
  }

  if (priceSanity?.level === "unusual") {
    score -= 15;
  }

  if (priceSanity?.level === "extreme") {
    score -= 30;
  }

  if (!subscription.plan) {
    score -= 2;
  }

  if (
    planPosition &&
    planPosition.cheaperPlans.length > 0 &&
    subscription.usage !== "Ofta"
  ) {
    score -= 10;
  }

  if (isLikelyFreeMembership(subscription)) {
    score = 90;
  }

  return Math.max(20, Math.min(98, score));
}

function getBenefitlyScoreMeta(score: number) {
  if (score >= 85) {
    return {
      label: "Bra kontroll",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  if (score >= 65) {
    return {
      label: "Kan optimeras",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  return {
    label: "Bör kollas",
    className: "border-red-200 bg-red-50 text-red-800",
  };
}

function getSmartCardInsights(subscription: Subscription) {
  const insights: string[] = [];
  const priceSanity = getPriceSanity(subscription);
  const planReferences = getPlanReferencesForService(subscription);
  const selectedPlanReference = getSelectedPlanReference(subscription);
  const planPosition = getPlanPosition(subscription);

  if (subscription.usage === "Ofta") {
    insights.push(
      "Du använder tjänsten ofta, vilket gör den lättare att motivera.",
    );
  } else if (subscription.usage === "Ibland") {
    insights.push(
      "Du använder tjänsten ibland. Kontrollera om vald plan matchar behovet.",
    );
  } else {
    insights.push(
      "Tjänsten används sällan, så den är värd att kontrollera först.",
    );
  }

  if (priceSanity?.level === "low") {
    insights.push(
      "Priset verkar ovanligt lågt. Kontrollera om det är kampanj, delad kostnad eller fel period.",
    );
  } else if (priceSanity) {
    insights.push(
      "Priset sticker ut. Kontrollera att beloppet och betalperioden är rätt.",
    );
  }

  if (planReferences.length > 1) {
    if (!subscription.plan) {
      insights.push("Lägg till plan för att få bättre analys och jämförelse.");
    } else if (selectedPlanReference && planPosition) {
      if (
        planPosition.cheaperPlans.length > 0 &&
        subscription.usage !== "Ofta"
      ) {
        insights.push(
          "Det finns billigare prisnivåer. Jämför innehållet innan du byter.",
        );
      } else if (planPosition.cheaperPlans.length > 0) {
        insights.push(
          "Du har inte lägsta prisnivån, men hög användning kan göra planen rimlig.",
        );
      } else {
        insights.push("Du verkar ha en låg prisnivå för den här tjänsten.");
      }
    } else {
      insights.push(
        "Planen känns inte igen exakt. Välj en vanlig plan om du vill jämföra bättre.",
      );
    }
  }

  if (subscription.benefits.length >= 10) {
    insights.push(
      `Benefitly känner till ${subscription.benefits.length} innehållspunkter för den här planen.`,
    );
  }

  if (insights.length < 3) {
    insights.push(
      "Fler inlagda tjänster ger bättre överlapp och smartare råd.",
    );
  }

  return insights.slice(0, 4);
}

function getSelectedPlanContent(subscription: Subscription) {
  const selectedPlanReference = getSelectedPlanReference(subscription);

  if (subscription.benefits.length > 0) {
    return subscription.benefits;
  }

  return selectedPlanReference?.highlights ?? [];
}

function PlanComparisonSection({
  subscription,
}: {
  subscription: Subscription;
}) {
  const [showPlans, setShowPlans] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const planReferences = getPlanReferencesForService(subscription);
  const selectedPlan = getPlanText(subscription.plan);

  if (planReferences.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-slate-200 bg-white px-5 py-3">
      <button
        type="button"
        onClick={() => setShowPlans(!showPlans)}
        className="flex w-full items-center justify-between text-left text-sm font-bold text-slate-800"
      >
        <span>Jämför planer</span>
        <span className="text-xs font-black text-slate-500">
          {showPlans ? "Dölj ▲" : `${planReferences.length} planer · visa ▼`}
        </span>
      </button>

      {showPlans && (
        <div className="mt-3 space-y-3">
          <div className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
            Priserna visas som ungefärliga prisnivåer. Kontrollera alltid
            aktuellt pris hos leverantören.
          </div>

          {planReferences.map((plan) => {
            const isCurrentPlan = selectedPlan === normalizeText(plan.planName);
            const isExpanded = expandedPlan === plan.planName;

            return (
              <div
                key={plan.planName}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-950">
                        {plan.planName}
                      </p>
                      {isCurrentPlan && (
                        <span className="rounded-full bg-emerald-700 px-2.5 py-1 text-[11px] font-black text-white">
                          Din plan
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {plan.roughPriceLabel}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${getPriceLevelClassName(plan.priceLevel)}`}
                    >
                      {getPriceLevelLabel(plan.priceLevel)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPlan(isExpanded ? null : plan.planName)
                      }
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-black text-slate-700 hover:bg-slate-100"
                    >
                      {isExpanded ? "Dölj" : "Visa innehåll"}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {plan.highlights.map((highlight) => (
                      <div
                        key={highlight}
                        className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                      >
                        ✓ {highlight}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SelectedPlanContentSection({
  subscription,
}: {
  subscription: Subscription;
}) {
  const [showContent, setShowContent] = useState(false);
  const [showAllContent, setShowAllContent] = useState(false);
  const previewCount = 6;
  const content = getSelectedPlanContent(subscription);
  const hasManyItems = content.length > previewCount;
  const visibleItems = showAllContent
    ? content
    : content.slice(0, previewCount);

  if (content.length === 0) {
    return null;
  }

  function handleToggleContent() {
    if (showContent) {
      setShowContent(false);
      setShowAllContent(false);
      return;
    }

    setShowContent(true);
  }

  return (
    <div className="border-t border-slate-200 bg-slate-50 px-5 py-3">
      <button
        type="button"
        onClick={handleToggleContent}
        className="flex w-full items-center justify-between text-left text-sm font-bold text-slate-700"
      >
        <span>
          {subscription.plan
            ? `Innehåll i ${subscription.plan}`
            : "Förmåner och innehåll"}
        </span>
        <span className="text-xs font-black text-slate-500">
          {showContent
            ? "Dölj ▲"
            : hasManyItems
              ? `${content.length} punkter · visa viktigaste ▼`
              : `${content.length} punkter ▼`}
        </span>
      </button>

      {showContent && (
        <div className="mt-3 pb-2">
          <div className="mb-3 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm">
            {hasManyItems && !showAllContent
              ? `Visar de ${previewCount} viktigaste av ${content.length}.`
              : `Visar alla ${content.length} punkter.`}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {visibleItems.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
              >
                ✓ {item}
              </div>
            ))}
          </div>

          {hasManyItems && (
            <button
              type="button"
              onClick={() => setShowAllContent(!showAllContent)}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-100"
            >
              {showAllContent
                ? "Visa färre"
                : `Visa alla ${content.length} punkter`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SubscriptionCard({
  subscription,
  onDelete,
  onEdit,
  onConfirmPrice,
}: {
  subscription: Subscription;
  onDelete: (id: string) => void;
  onEdit: (subscription: Subscription) => void;
  onConfirmPrice: (id: string) => void;
}) {
  const valueAssessment = getValueAssessment(subscription);
  const recommendedAction = getRecommendedAction(subscription);
  const recommendationReason = getRecommendationReason(subscription);
  const serviceIcon = getServiceIcon(subscription);
  const rawPriceSanity = getRawPriceSanity(subscription);
  const shouldShowConfirmPriceButton =
    rawPriceSanity !== null && !subscription.priceConfirmed;
  const benefitlyScore = getBenefitlyScore(subscription);
  const scoreMeta = getBenefitlyScoreMeta(benefitlyScore);
  const smartInsights = getSmartCardInsights(subscription);
  const planPriceWarningMessage = getPlanPriceWarningMessage(subscription);
  const [isPlanPriceWarningHidden, setIsPlanPriceWarningHidden] =
    useState(false);
  const shouldShowPlanPriceWarning =
    Boolean(planPriceWarningMessage) && !isPlanPriceWarningHidden;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-black shadow-sm ${serviceIcon.className}`}
            >
              {serviceIcon.label}
            </div>

            <div>
              <h3 className="text-lg font-black">{subscription.name}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {getBenefitlyCategory(subscription.category, subscription.name)}
                {subscription.plan ? ` • ${subscription.plan}` : ""}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Användning:{" "}
                <span
                  className={`font-bold ${
                    subscription.usage === "Ofta"
                      ? "text-emerald-700"
                      : subscription.usage === "Sällan"
                        ? "text-amber-700"
                        : "text-slate-800"
                  }`}
                >
                  {subscription.usage}
                </span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-lg font-black">
              {formatCurrency(getMonthlyPrice(subscription))}/mån
            </p>
            {subscription.billingPeriod === "yearly" ? (
              <p className="mt-1 text-xs font-bold text-slate-500">
                {formatCurrency(subscription.price)} per år
              </p>
            ) : (
              <p className="mt-1 text-xs font-bold text-slate-500">
                {getBillingPeriodLabel(subscription.billingPeriod)}
              </p>
            )}

            <div
              className={`mt-4 rounded-full border px-3 py-1 text-xs font-bold ${valueAssessment.className}`}
            >
              {valueAssessment.label}
            </div>

            {shouldShowConfirmPriceButton && (
              <button
                type="button"
                onClick={() => onConfirmPrice(subscription.id)}
                className="mt-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-black text-slate-700 hover:bg-slate-100"
              >
                Priset är korrekt
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[150px_1fr]">
          <div className={`rounded-2xl border p-4 ${scoreMeta.className}`}>
            <p className="text-xs font-black uppercase tracking-wide opacity-80">
              Benefitly Score
            </p>
            <p className="mt-1 text-3xl font-black">{benefitlyScore}</p>
            <p className="mt-1 text-xs font-black">{scoreMeta.label}</p>
          </div>

          <div className="rounded-2xl bg-slate-100 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Benefitlys analys
            </p>
            <ul className="mt-2 space-y-1.5">
              {smartInsights.map((insight) => (
                <li
                  key={insight}
                  className="flex gap-2 text-sm font-semibold text-slate-800"
                >
                  <span className="text-emerald-700">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
            {shouldShowRecommendationReason(subscription) && (
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Varför: {recommendationReason}
              </p>
            )}
          </div>
        </div>

        {shouldShowPlanPriceWarning && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0">⚠️</span>
                <span className="truncate">
                  Pris/plan behöver kollas · {planPriceWarningMessage}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsPlanPriceWarningHidden(true)}
                className="shrink-0 rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-black text-amber-800 hover:bg-amber-100"
                aria-label="Dölj prisvarning"
              >
                Jag förstår
              </button>
            </div>
          </div>
        )}

        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Rekommenderad åtgärd
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {recommendedAction}
          </p>
        </div>
      </div>

      <PlanComparisonSection subscription={subscription} />
      <SelectedPlanContentSection subscription={subscription} />

      <div className="border-t border-slate-200 bg-slate-50 px-5 py-3">
        <div className="flex justify-end gap-3">
          <button
            onClick={() => onEdit(subscription)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            Redigera
          </button>

          <button
            onClick={() => onDelete(subscription.id)}
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
          >
            Ta bort
          </button>
        </div>
      </div>
    </article>
  );
}
