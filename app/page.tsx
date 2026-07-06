"use client";

import { useEffect, useRef, useState } from "react";

type BillingPeriod = "monthly" | "yearly";

type Subscription = {
  id: number;
  name: string;
  category: string;
  price: number;
  billingPeriod?: BillingPeriod;
  usage: string;
  plan?: string;
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

const inputClassName =
  "w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-600";

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
    id: 1,
    name: "Spotify Premium",
    category: "Streaming",
    price: 119,
    billingPeriod: "monthly",
    usage: "Ofta",
    plan: "Premium",
    benefits: getBenefitsForSubscription(
      "Spotify Premium",
      "Streaming",
      "Premium"
    ),
  },
  {
    id: 2,
    name: "Microsoft 365",
    category: "Molnlagring",
    price: 99,
    billingPeriod: "monthly",
    usage: "Ibland",
    plan: "Family",
    benefits: getBenefitsForSubscription(
      "Microsoft 365",
      "Molnlagring",
      "Family"
    ),
  },
  {
    id: 3,
    name: "Google One",
    category: "Molnlagring",
    price: 25,
    billingPeriod: "monthly",
    usage: "Sällan",
    plan: "",
    benefits: getBenefitsForSubscription("Google One", "Molnlagring", ""),
  },
  {
    id: 4,
    name: "Nordic Wellness",
    category: "Gym",
    price: 399,
    billingPeriod: "monthly",
    usage: "Sällan",
    plan: "",
    benefits: getBenefitsForSubscription("Nordic Wellness", "Gym", ""),
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

export default function Home() {
  const [subscriptions, setSubscriptions] =
    useState<Subscription[]>(initialSubscriptions);

  const [hasLoaded, setHasLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [hasSkippedGuide, setHasSkippedGuide] = useState(false);
  const [showPremiumDetails, setShowPremiumDetails] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>("SEK");

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Streaming");
  const [price, setPrice] = useState("");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [usage, setUsage] = useState("Ofta");
  const [plan, setPlan] = useState("");
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);

  const recognizedService = findKnownService(name);
  const suggestedServices = getSuggestedServices(name);

  activeCurrency = currency;
  activeLocale = currencyLocales[currency];

  useEffect(() => {
    const savedSubscriptions = localStorage.getItem("subscriptions");
    const savedGuideChoice = localStorage.getItem("hasSkippedGuide");
    const savedSettings = localStorage.getItem("appSettings");
    const browserDefaults = getBrowserDefaultSettings();

    if (savedSubscriptions) {
      setSubscriptions(JSON.parse(savedSubscriptions));
    }

    if (savedGuideChoice === "true") {
      setHasSkippedGuide(true);
    }

    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings) as AppSettings;
      setCurrency(parsedSettings.currency ?? browserDefaults.currency);
    } else {
      setCurrency(browserDefaults.currency);
    }

    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (hasLoaded) {
      localStorage.setItem("subscriptions", JSON.stringify(subscriptions));
    }
  }, [subscriptions, hasLoaded]);

  useEffect(() => {
    if (hasLoaded) {
      localStorage.setItem(
        "appSettings",
        JSON.stringify({ language: "sv", currency })
      );
    }
  }, [currency, hasLoaded]);

  const monthlyCost = subscriptions.reduce(
    (sum, item) => sum + getMonthlyPrice(item),
    0
  );
  const yearlyCost = subscriptions.reduce(
    (sum, item) => sum + getYearlyPrice(item),
    0
  );

  const rarelyUsed = subscriptions.filter((item) => item.usage === "Sällan");

  const savingsCandidates = rarelyUsed.filter(
    (item) =>
      (getPriceSanity(item)?.level !== "low" || item.priceConfirmed) &&
      !isConfirmedVeryLowCost(item)
  );

  const possibleMonthlySavings = savingsCandidates.reduce(
    (sum, item) => sum + getMonthlyPrice(item),
    0
  );

  const possibleYearlySavings = savingsCandidates.reduce(
    (sum, item) => sum + getYearlyPrice(item),
    0
  );

  const overlapInsights = getOverlapInsights(subscriptions);

  const strongWarnings = subscriptions.filter(
    (item) => item.usage === "Sällan" && getMonthlyPrice(item) >= 150
  );

  const priceWarnings = subscriptions.filter(
    (item) => getPriceSanity(item) !== null
  );

  const checkItems = getCheckItems(subscriptions, overlapInsights);
  const thingsToCheck = checkItems.length;

  const bestNextAction = getBestNextAction(subscriptions);

  function resetForm() {
    setName("");
    setCategory("Streaming");
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

    const service = findKnownService(value);

    if (service) {
      setCategory(service.category);
      setBillingPeriod(service.recommendedBillingPeriod ?? "monthly");
    }
  }

  function handleChooseSuggestedService(service: KnownService) {
    setName(service.displayName);
    setCategory(service.category);
    setBillingPeriod(service.recommendedBillingPeriod ?? "monthly");
    setPlan("");
    setShowServiceSuggestions(false);
  }

  function handleAddOrUpdateSubscription(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const submitter = event.nativeEvent.submitter as HTMLButtonElement | null;
    const shouldAddAnother = submitter?.value === "addAnother";

    const priceAsNumber = Number(price);

    if (!name || price === "" || priceAsNumber < 0) {
      alert("Fyll i namn och ett pris som är 0 eller större.");
      return;
    }

    const cleanedPlan = plan.trim();

    if (editingId !== null) {
      setSubscriptions(
        subscriptions.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name,
                category,
                price: priceAsNumber,
                billingPeriod,
                usage,
                plan: cleanedPlan,
                priceConfirmed: false,
                benefits: getBenefitsForSubscription(
                  name,
                  category,
                  cleanedPlan
                ),
              }
            : item
        )
      );

      resetForm();
      setShowForm(false);
      return;
    }

    const newSubscription: Subscription = {
      id: Date.now(),
      name,
      category,
      price: priceAsNumber,
      billingPeriod,
      usage,
      plan: cleanedPlan,
      priceConfirmed: false,
      benefits: getBenefitsForSubscription(name, category, cleanedPlan),
    };

    setSubscriptions([newSubscription, ...subscriptions]);

    resetForm();
    setShowForm(shouldAddAnother);

    if (shouldAddAnother) {
      focusNameField();
    }
  }

  function handleDeleteSubscription(id: number) {
    setSubscriptions(subscriptions.filter((item) => item.id !== id));

    if (editingId === id) {
      resetForm();
      setShowForm(false);
    }
  }

  function handleEditSubscription(subscription: Subscription) {
    setEditingId(subscription.id);
    setName(subscription.name);
    setCategory(subscription.category);
    setPrice(subscription.price.toString());
    setBillingPeriod(subscription.billingPeriod ?? "monthly");
    setUsage(subscription.usage);
    setPlan(subscription.plan ?? "");
    setShowForm(true);
  }

  function handleConfirmPrice(id: number) {
    setSubscriptions(
      subscriptions.map((item) =>
        item.id === id ? { ...item, priceConfirmed: true } : item
      )
    );
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

  function handleStartFromScratch() {
    const shouldReset = window.confirm(
      "Vill du rensa alla abonnemang och börja från noll?"
    );

    if (!shouldReset) {
      return;
    }

    setSubscriptions([]);
    localStorage.setItem("subscriptions", JSON.stringify([]));
    resetForm();
    setShowForm(true);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50 text-slate-950">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-900 text-xl text-white shadow-sm">
                🔎
              </div>

              <div>
                <p className="text-lg font-extrabold tracking-tight text-emerald-950">
                  Benefitly
                </p>
                <p className="text-xs font-medium text-slate-500">
                  Koll på abonnemang och förmåner
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-3 md:flex">
              {hasSkippedGuide && (
                <button
                  onClick={handleShowGuideAgain}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-100"
                >
                  Visa guide
                </button>
              )}

              <button
                onClick={() => setShowSettings(true)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-100"
              >
                ⚙️ Inställningar
              </button>

              <button
                onClick={handleStartFromScratch}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-100"
              >
                Börja från noll
              </button>

              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-900 text-xs text-white">
                  ✓
                </span>
                Gratisversion
              </div>
            </div>
          </div>

          <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-emerald-700">
                Översikt
              </p>

              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 xl:text-5xl 2xl:text-6xl">
                Din Benefitly-rapport
              </h1>

              <p className="mt-5 max-w-2xl text-lg text-slate-600">
                Lägg in dina abonnemang och få en snabb rapport över kostnader,
                sällan använda tjänster, överlapp och vad du bör kontrollera först.
                Rapporten visar{" "}
                <span className="font-bold text-slate-950">
                  {formatCheckCount(thingsToCheck)}
                </span>{" "}
                och en besparing att kolla på{" "}
                <span className="font-extrabold text-emerald-700">
                  {formatCurrency(possibleMonthlySavings)}/mån.
                </span>
              </p>

              <section className="mt-8 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                <DashboardCard
                  icon="💳"
                  title="Månadskostnad"
                  value={formatCurrency(monthlyCost)}
                  description={`${formatCurrency(yearlyCost)} per år`}
                />

                <DashboardCard
                  icon="🐷"
                  title="Besparing att kolla"
                  value={formatCurrency(possibleMonthlySavings)}
                  description={`${formatCurrency(possibleYearlySavings)} per år`}
                  highlight
                />

                <DashboardCard
                  icon="📄"
                  title="Abonnemang"
                  value={subscriptions.length.toString()}
                  description="Inlagda tjänster"
                />

                <CheckItemsCard checkItems={checkItems} />
              </section>
            </div>

            <div className="space-y-4">
              <DetectiveReport
                subscriptions={subscriptions}
                possibleMonthlySavings={possibleMonthlySavings}
                rarelyUsed={rarelyUsed}
                overlapInsights={overlapInsights}
                strongWarnings={strongWarnings}
                priceWarnings={priceWarnings}
                checkItems={checkItems}
                bestNextAction={bestNextAction}
              />

              <PremiumPreviewCard
                onShowExamples={() => setShowPremiumDetails(true)}
              />
            </div>
          </section>
        </header>

        <div className="mb-6 flex flex-wrap gap-3 md:hidden">
          {hasSkippedGuide && (
            <button
              onClick={handleShowGuideAgain}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"
            >
              Visa guide
            </button>
          )}

          <button
            onClick={() => setShowSettings(true)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"
          >
            ⚙️ Inställningar
          </button>

          <button
            onClick={handleStartFromScratch}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"
          >
            Börja från noll
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
            Gratisversion
          </div>
        </div>

        {!hasSkippedGuide && (
          <GettingStartedGuide
            onAddClick={handleGuideAddClick}
            onSkipClick={handleSkipGuide}
          />
        )}

        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight">
                Dina abonnemang
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Snabb överblick över kostnad, användning och åtgärd.
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
                {editingId !== null
                  ? "Redigera abonnemang"
                  : "Lägg till abonnemang"}
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
                          150
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
                        setCategory(recognizedService.category)
                      }
                      onUseBillingPeriod={() =>
                        setBillingPeriod(
                          recognizedService.recommendedBillingPeriod ?? "monthly"
                        )
                      }
                      onChoosePlan={(selectedPlan) => setPlan(selectedPlan)}
                    />
                  </div>
                )}

                <FormField label="Kategori">
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className={inputClassName}
                  >
                    <option>Streaming</option>
                    <option>Molnlagring</option>
                    <option>Gym</option>
                    <option>Mobil</option>
                    <option>Bankkort</option>
                    <option>Försäkring</option>
                    <option>Medlemskap</option>
                    <option>Mat och leverans</option>
                    <option>Shopping</option>
                    <option>Transport</option>
                    <option>Nyheter</option>
                    <option>Spel</option>
                    <option>Utbildning</option>
                    <option>Hälsa</option>
                    <option>AI och verktyg</option>
                    <option>Annat</option>
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
                      Valfritt. Skriv plan om du vet den, annars kan du lämna tomt.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  value="save"
                  className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  {editingId !== null
                    ? "Spara ändringar"
                    : "Spara abonnemang"}
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
            <div className="grid gap-4 xl:grid-cols-2">
              {subscriptions.map((subscription) => (
                <SubscriptionCard
                  key={subscription.id}
                  subscription={subscription}
                  onDelete={handleDeleteSubscription}
                  onEdit={handleEditSubscription}
                  onConfirmPrice={handleConfirmPrice}
                />
              ))}
            </div>
          )}
        </section>
      </section>

      {showPremiumDetails && (
        <PremiumDetailsModal onClose={() => setShowPremiumDetails(false)} />
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

function findKnownService(name: string) {
  const normalizedName = normalizeText(name);

  if (!normalizedName) {
    return null;
  }

  return (
    knownServices.find((service) =>
      service.matchNames.some((matchName) =>
        normalizedName.includes(normalizeText(matchName))
      )
    ) ?? null
  );
}

function getSuggestedServices(searchText: string) {
  const normalizedSearch = normalizeText(searchText);

  if (!normalizedSearch) {
    return knownServices.slice(0, 18);
  }

  return knownServices
    .map((service) => {
      const displayName = normalizeText(service.displayName);
      const category = normalizeText(service.category);
      const normalizedMatchNames = service.matchNames.map((matchName) =>
        normalizeText(matchName)
      );

      let score = -1;

      if (displayName.startsWith(normalizedSearch)) {
        score = 100;
      } else if (
        normalizedMatchNames.some((matchName) =>
          matchName.startsWith(normalizedSearch)
        )
      ) {
        score = 90;
      } else if (displayName.includes(normalizedSearch)) {
        score = 70;
      } else if (
        normalizedMatchNames.some((matchName) =>
          matchName.includes(normalizedSearch)
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
  const multiplier = getCurrencyMultiplier();

  function makeLimit(unusual: number, extreme: number, categoryLabel: string) {
    return {
      unusual: Math.round(unusual * multiplier),
      extreme: Math.round(extreme * multiplier),
      categoryLabel,
    };
  }

  if (category === "Streaming") {
    return makeLimit(500, 1000, "streaming");
  }

  if (category === "Molnlagring") {
    return makeLimit(500, 1000, "molnlagring");
  }

  if (category === "Gym") {
    return makeLimit(1000, 2000, "gym");
  }

  if (category === "Mobil") {
    return makeLimit(800, 1500, "mobil");
  }

  if (category === "Bankkort") {
    return makeLimit(500, 1000, "bankkort");
  }

  if (category === "Försäkring") {
    return makeLimit(2000, 4000, "försäkring");
  }

  if (category === "Mat och leverans") {
    return makeLimit(500, 1000, "mat och leverans");
  }

  if (category === "Medlemskap") {
    return makeLimit(500, 1000, "medlemskap");
  }

  if (category === "Shopping") {
    return makeLimit(1000, 2000, "shopping");
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
    subscription.category === "Medlemskap" ||
    subscription.category === "Shopping"
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

  const categoriesThatUsuallyCostMoney = [
    "Streaming",
    "Molnlagring",
    "Gym",
    "Mobil",
    "Mat och leverans",
    "Medlemskap",
    "Transport",
    "Nyheter",
    "Spel",
    "Utbildning",
    "Hälsa",
    "AI och verktyg",
  ];

  if (!categoriesThatUsuallyCostMoney.includes(service.category)) {
    return null;
  }

  return Math.round(20 * getCurrencyMultiplier());
}

function getRawPriceSanity(subscription: Subscription): PriceSanity | null {
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

function getOverlapInsights(subscriptions: Subscription[]): Insight[] {
  const insights: Insight[] = [];

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

  const cloudServices = subscriptions.filter(
    (item) =>
      item.category === "Molnlagring" ||
      hasName(item, ["icloud", "google one", "microsoft 365", "dropbox"])
  );

  const musicServices = subscriptions.filter((item) =>
    hasName(item, ["spotify", "apple music", "youtube music", "youtube premium"])
  );

  const streamingServices = subscriptions.filter(
    (item) =>
      item.category === "Streaming" ||
      hasName(item, [
        "netflix",
        "disney",
        "hbo",
        "max",
        "viaplay",
        "prime video",
        "tv4",
        "crunchyroll",
      ])
  );

  const insuranceServices = subscriptions.filter(
    (item) =>
      item.category === "Försäkring" ||
      item.category === "Bankkort" ||
      hasName(item, ["försäkring", "kreditkort", "bankkort"])
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
      text: `${formatOverlapNames(streamingServices)} finns i listan. Fundera på om alla används varje månad.`,
    });
  }

  if (insuranceServices.length > 1) {
    insights.push({
      title: `${formatOverlapNames(insuranceServices)} kan ge överlappande skydd`,
      text: "Bankkort, hemförsäkring och reseförsäkring kan ibland ge liknande skydd.",
    });
  }

  return insights;
}

function getCheckItems(
  subscriptions: Subscription[],
  overlapInsights: Insight[]
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

      if (subscription.category === "Mobil" && monthlyPrice >= 250) {
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
      title: "Lägg till dina första abonnemang",
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
            getMonthlyPrice(priceWarning)
          )}/mån, vilket verkar ovanligt lågt för en känd betaltjänst. Kontrollera om priset är rätt inskrivet, om det är kampanjpris, delad kostnad, provperiod eller om något saknas.`,
        };
      }

      return {
        title: `Kontrollera priset på ${priceWarning.name}`,
        text: `${priceWarning.name} kostar ${formatCurrency(
          getMonthlyPrice(priceWarning)
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
        getMonthlyPrice(item)
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
        item.category === "Mobil" ||
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
        ])
    )
    .sort((a, b) => getMonthlyPrice(b) - getMonthlyPrice(a));

  const mobileToCheck = mobileSubscriptions.find(
    (item) => getMonthlyPrice(item) >= 250 || item.usage !== "Ofta"
  );

  if (mobileToCheck) {
    return {
      title: `Kolla surfmängden i ${mobileToCheck.name}`,
      text: `Gratisversionen kan inte se faktisk mobildata, men ${mobileToCheck.name} kostar ${formatCurrency(
        getMonthlyPrice(mobileToCheck)
      )}/mån. Kolla om en billigare surfmängd räcker.`,
    };
  }

  const cardOrInsurance = subscriptions.find(
    (item) =>
      item.category === "Bankkort" ||
      item.category === "Försäkring" ||
      hasName(item, ["bankkort", "kreditkort", "försäkring"])
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
        getMonthlyPrice(item)
      )}/mån och används ibland. Se om billigare plan räcker.`,
    };
  }

  const mostExpensive = [...subscriptions].sort(
    (a, b) => getMonthlyPrice(b) - getMonthlyPrice(a)
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
      description: "Kostar 0 kr. Värdet beror på om rabatter, bonus eller förmåner används.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  if (priceSanity?.level === "low") {
    return {
      label: "Ovanligt lågt pris",
      description: `${formatCurrency(
        getMonthlyPrice(subscription)
      )}/mån verkar ovanligt lågt för en känd betaltjänst.`,
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (priceSanity?.level === "extreme") {
    return {
      label: "Extremt hög kostnad",
      description: `${formatCurrency(
        getMonthlyPrice(subscription)
      )}/mån verkar extremt högt. Det kan vara rimligt om förmånerna är mycket värdefulla.`,
      className: "border-red-200 bg-red-50 text-red-800",
    };
  }

  if (priceSanity?.level === "unusual") {
    return {
      label: "Ovanligt hög kostnad",
      description: `${formatCurrency(
        getMonthlyPrice(subscription)
      )}/mån verkar högt för ${priceSanity.categoryLabel}.`,
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (isConfirmedVeryLowCost(subscription)) {
    return {
      label: "Låg kostnad",
      description: `Priset är bekräftat och kostnaden är bara ${formatCurrency(
        getMonthlyPrice(subscription)
      )}/mån.`,
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  if (subscription.usage === "Sällan" && getMonthlyPrice(subscription) >= 150) {
    return {
      label: "Dyrt för låg användning",
      description: `${formatCurrency(
        getMonthlyPrice(subscription)
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

  if (priceSanity) {
    return "Kontrollera priset, år/månad och vad som ingår. Det kan vara rimligt om förmånerna är mycket värdefulla.";
  }

  if (isConfirmedVeryLowCost(subscription)) {
    return `Behåll om du får någon nytta av tjänsten. Besparingen är bara ${formatCurrency(
      getMonthlyPrice(subscription)
    )}/mån.`;
  }

  if (subscription.usage === "Sällan" && getMonthlyPrice(subscription) >= 150) {
    return "Pausa eller säg upp om du inte behöver den.";
  }

  if (subscription.usage === "Sällan") {
    return "Kolla om tjänsten fortfarande behövs.";
  }

  if (subscription.category === "Mobil" && getMonthlyPrice(subscription) >= 250) {
    return "Kolla surfmängd och billigare plan.";
  }

  if (subscription.category === "Bankkort") {
    return "Kolla årsavgift och vilka förmåner du använder.";
  }

  if (subscription.category === "Försäkring") {
    return "Kolla om skyddet redan ingår någon annanstans.";
  }

  if (subscription.usage === "Ibland" && getMonthlyPrice(subscription) >= 250) {
    return "Kolla billigare plan eller alternativ.";
  }

  if (subscription.usage === "Ofta") {
    return "Behåll, men kontrollera att planen är rätt.";
  }

  return "Följ upp senare.";
}

function getRecommendationReason(subscription: Subscription) {
  const priceSanity = getPriceSanity(subscription);

  if (isLikelyFreeMembership(subscription)) {
    return "0 kr/mån påverkar inte kostnaden, men förmånerna kan ändå vara värda att använda.";
  }

  if (priceSanity?.level === "low") {
    return `${formatCurrency(
      getMonthlyPrice(subscription)
    )}/mån verkar ovanligt lågt för en känd betaltjänst.`;
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

function getBenefitsForSubscription(
  name: string,
  category: string,
  plan?: string
) {
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
  if (category === "Streaming") {
    return [
      "Underhållning",
      "Familjeplan kan bero på tjänst och plan",
      "Offline-läge kan bero på tjänst och plan",
      "Profiler kan finnas",
      "Kontrollera om billigare plan räcker",
    ];
  }

  if (category === "Molnlagring") {
    return [
      "Extra lagring",
      "Familjedelning kan bero på plan",
      "Backup av filer",
      "Synkning mellan enheter",
      "Kan överlappa med annan molnlagring",
    ];
  }

  if (category === "Gym") {
    return [
      "Träning",
      "Gruppass kan bero på medlemskap",
      "Flera anläggningar kan bero på medlemskap",
      "App eller bokning kan finnas",
      "Kontrollera om du använder medlemskapet tillräckligt",
    ];
  }

  if (category === "Mobil") {
    return [
      "Surf",
      "Samtal och sms",
      "Rabatter kan finnas",
      "Familjeabonnemang kan finnas",
      "Kontrollera om du har för mycket surf",
    ];
  }

  if (category === "Bankkort") {
    return [
      "Reseförsäkring kan ingå",
      "Köpskydd kan ingå",
      "Rabatter kan finnas",
      "Bonus eller cashback kan finnas",
      "Kontrollera årsavgiften",
    ];
  }

  if (category === "Försäkring") {
    return [
      "Skydd vid skada",
      "Villkor bör jämföras",
      "Överlapp kan finnas",
      "Självrisk bör kontrolleras",
      "Kontrollera om skyddet redan ingår någon annanstans",
    ];
  }

  if (category === "Medlemskap") {
    return [
      "Rabatter kan ingå",
      "Bonusar kan finnas",
      "Medlemsförmåner",
      "Exklusiva erbjudanden kan finnas",
      "Kontrollera om medlemskapet används tillräckligt",
    ];
  }

  if (category === "Mat och leverans") {
    return [
      "Rabatter kan finnas",
      "Fri leverans kan bero på erbjudande eller medlemskap",
      "Kampanjer kan finnas",
      "Medlemskap kan löna sig vid ofta användning",
      "Kontrollera extra avgifter",
    ];
  }

  if (category === "Shopping") {
    return [
      "Medlemsrabatter kan finnas",
      "Poäng eller bonus kan ingå",
      "Exklusiva erbjudanden kan finnas",
      "Fri frakt kan bero på nivå",
      "Kontrollera om poäng eller rabatter går ut",
    ];
  }

  return [
    "Förmåner kan finnas",
    "Kontrollera villkoren",
    "Jämför med andra tjänster",
    "Se om du betalar för något liknande redan",
    "Kontrollera om tjänsten används tillräckligt",
  ];
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
                  <li key={reason} className="text-xs font-semibold text-slate-600">
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

  if (subscriptions.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Din första Benefitly-rapport</h2>
        <p className="mt-2 text-sm text-slate-600">
          Lägg till några abonnemang för att få en snabb analys.
        </p>
      </section>
    );
  }

  const firstOverlap = overlapInsights[0];
  const focusSubscription = getReportFocusSubscription(subscriptions);
  const reportCheckCount = checkItems.length;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
          📋
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
            Detektivrapport
          </p>
          <h2 className="text-2xl font-black">
            {formatCheckCount(reportCheckCount)}
          </h2>
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
                  {formatCurrency(getMonthlyPrice(focusSubscription))}/mån kan motsvara{" "}
                  {formatCurrency(getYearlyPrice(focusSubscription))} per år.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
          Din rapport visar
        </p>

        <div className="mt-3 space-y-3">
          <ReportLine
            icon="✅"
            text={`Besparing att undersöka: ${formatCurrency(
              possibleMonthlySavings
            )}/mån`}
            strong
          />

          <ReportLine
            icon="⚠️"
            text={`${checkItems.length} unik kontrollpunkt${
              checkItems.length === 1 ? "" : "er"
            }`}
          />

          {priceWarnings.length > 0 && (
            <ReportLine
              icon="🧾"
              text="Minst ett pris bör kontrolleras"
            />
          )}

          {firstOverlap && <ReportLine icon="🔁" text={firstOverlap.title} />}
        </div>
      </div>
    </section>
  );
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
              datakopplingar. Språkstöd kommer senare när appens texter är mer färdiga.
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
              Valuta ändrar hur belopp visas och hur prisvarningar bedöms.
              Appen räknar inte om gamla belopp mellan valutor ännu.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-black text-slate-950">Data, import och Premium</h3>
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
              Gratisversionen använder bara det du själv skriver in och kopplar
              inte bank eller mejl. I denna testversion sparas uppgifterna lokalt
              i din webbläsare. Framtida bankkoppling ska ske säkert via godkänd
              koppling/open banking, inte genom att du skriver banklösenord i appen.
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
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-xl">
          🔒
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide text-violet-700">
            Kommande Premium
          </p>

          <h3 className="mt-1 text-lg font-black text-slate-950">
            Hitta mer än abonnemang
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Premium kan i framtiden hitta rabatter, förmåner, överlapp,
            billigare alternativ och smarta påminnelser. Bankkoppling är aldrig ett krav.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              Import
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              Rabatter nära dig
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              Smart analys
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={onShowExamples}
              className="rounded-2xl border border-violet-200 bg-white px-4 py-2 text-sm font-black text-violet-700 hover:bg-violet-50"
            >
              Visa exempel
            </button>

            <p className="text-xs font-bold text-slate-500">
              Du väljer själv vad du vill koppla.
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
              Exempel på vad Premium kan hitta
            </h2>

            <p className="mt-3 max-w-xl text-sm text-slate-600">
              Premium är inte aktivt ännu. Det här visar bara hur framtida
              premiumfunktioner kan hjälpa dig att hitta abonnemang, rabatter,
              förmåner, billigare alternativ och smartare påminnelser.
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
            använda kvitton, filer, mejl eller säker bankkoppling om du själv väljer
            det. Bankkoppling är aldrig ett krav, ska inte kräva att du skriver
            banklösenord i appen och ska kunna kopplas bort igen.
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
                {service.category}
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
            Använd kategori: {service.category}
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
            Få en bättre rapport på 1 minut
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
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <p className="text-5xl">🔎</p>

      <h3 className="mt-4 text-2xl font-black">Du har inga abonnemang ännu</h3>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        Välj en vanlig tjänst eller skriv själv för att få en snabb rapport.
      </p>

      <button
        onClick={onAddClick}
        className="mt-6 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
      >
        Lägg till första abonnemanget
      </button>
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

  if (
    name.includes("fitness24seven") ||
    name.includes("fitness 24 seven")
  ) {
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

function SubscriptionCard({
  subscription,
  onDelete,
  onEdit,
  onConfirmPrice,
}: {
  subscription: Subscription;
  onDelete: (id: number) => void;
  onEdit: (subscription: Subscription) => void;
  onConfirmPrice: (id: number) => void;
}) {
  const [showBenefits, setShowBenefits] = useState(false);
  const valueAssessment = getValueAssessment(subscription);
  const recommendedAction = getRecommendedAction(subscription);
  const recommendationReason = getRecommendationReason(subscription);
  const serviceIcon = getServiceIcon(subscription);
  const rawPriceSanity = getRawPriceSanity(subscription);
  const shouldShowConfirmPriceButton =
    rawPriceSanity !== null && !subscription.priceConfirmed;

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
                {subscription.category}
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

        <div className="mt-4 rounded-2xl bg-slate-100 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Rekommenderad åtgärd
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {recommendedAction}
          </p>
          {shouldShowRecommendationReason(subscription) && (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Varför: {recommendationReason}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-5 py-3">
        <button
          onClick={() => setShowBenefits(!showBenefits)}
          className="flex w-full items-center justify-between text-left text-sm font-bold text-slate-700"
        >
          <span>Förmåner</span>
          <span>{showBenefits ? "▲" : "▼"}</span>
        </button>

        {showBenefits && (
          <ul className="mt-3 space-y-1 pb-2">
            {subscription.benefits.map((benefit) => (
              <li key={benefit} className="text-sm text-slate-700">
                • {benefit}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex justify-end gap-3">
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