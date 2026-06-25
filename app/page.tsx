"use client";

import { useEffect, useState } from "react";

type Subscription = {
  id: number;
  name: string;
  category: string;
  price: number;
  usage: string;
  plan?: string;
  benefits: string[];
};

type Insight = {
  title: string;
  text: string;
};

type KnownService = {
  displayName: string;
  matchNames: string[];
  category: string;
  plans: string[];
  note: string;
};

const inputClassName =
  "w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-600";

const knownServices: KnownService[] = [
  {
    displayName: "Netflix",
    matchNames: ["netflix"],
    category: "Streaming",
    plans: ["Standard", "Premium", "Med reklam"],
    note: "Netflix känns igen. Välj den plan du har och skriv in vad du faktiskt betalar.",
  },
  {
    displayName: "Spotify",
    matchNames: ["spotify"],
    category: "Streaming",
    plans: ["Individual", "Duo", "Family", "Student"],
    note: "Spotify känns igen. Kolla om Duo eller Family passar bättre om flera använder tjänsten.",
  },
  {
    displayName: "Max / HBO Max",
    matchNames: ["max", "hbo", "hbo max"],
    category: "Streaming",
    plans: ["Basic", "Standard", "Premium", "Sport"],
    note: "Max känns igen. Kontrollera om du har ett paket med extra innehåll eller sport.",
  },
  {
    displayName: "Disney+",
    matchNames: ["disney", "disney+"],
    category: "Streaming",
    plans: ["Standard", "Premium"],
    note: "Disney+ känns igen. Välj plan och skriv priset du faktiskt betalar.",
  },
  {
    displayName: "YouTube Premium",
    matchNames: ["youtube premium"],
    category: "Streaming",
    plans: ["Individual", "Family", "Student"],
    note: "YouTube Premium kan även innehålla YouTube Music. Kolla så du inte betalar dubbelt för musik.",
  },
  {
    displayName: "YouTube Music",
    matchNames: ["youtube music"],
    category: "Streaming",
    plans: ["Individual", "Family", "Student"],
    note: "YouTube Music känns igen. Kontrollera om det redan ingår i YouTube Premium.",
  },
  {
    displayName: "Apple Music",
    matchNames: ["apple music"],
    category: "Streaming",
    plans: ["Individual", "Family", "Student"],
    note: "Apple Music känns igen. Kolla om du även har musik via någon annan tjänst.",
  },
  {
    displayName: "Viaplay",
    matchNames: ["viaplay"],
    category: "Streaming",
    plans: ["Film & Serier", "Medium", "Total", "Sport"],
    note: "Viaplay känns igen. Sportpaket kan vara dyrare, så kontrollera om du använder det.",
  },
  {
    displayName: "TV4 Play",
    matchNames: ["tv4", "tv4 play", "cmore", "c more"],
    category: "Streaming",
    plans: ["Basic", "Plus", "Premium", "Sport"],
    note: "TV4 Play känns igen. Kontrollera om sport eller premiuminnehåll ingår.",
  },
  {
    displayName: "Amazon Prime / Prime Video",
    matchNames: ["amazon prime", "prime video", "prime"],
    category: "Streaming",
    plans: ["Prime", "Prime Video"],
    note: "Prime kan innehålla flera förmåner. Kolla om du använder mer än bara video.",
  },
  {
    displayName: "Crunchyroll",
    matchNames: ["crunchyroll"],
    category: "Streaming",
    plans: ["Fan", "Mega Fan", "Ultimate Fan"],
    note: "Crunchyroll känns igen. Välj plan och skriv in vad du betalar.",
  },
  {
    displayName: "Google One",
    matchNames: ["google one"],
    category: "Molnlagring",
    plans: ["Basic", "Standard", "Premium"],
    note: "Google One känns igen. Kan överlappa med iCloud, Dropbox eller OneDrive.",
  },
  {
    displayName: "Microsoft 365",
    matchNames: ["microsoft 365", "office 365", "microsoft office"],
    category: "Molnlagring",
    plans: ["Personal", "Family"],
    note: "Microsoft 365 känns igen. OneDrive-lagring ingår ofta och kan överlappa med annan molnlagring.",
  },
  {
    displayName: "iCloud",
    matchNames: ["icloud", "apple icloud"],
    category: "Molnlagring",
    plans: ["50 GB", "200 GB", "2 TB", "6 TB", "12 TB"],
    note: "iCloud känns igen. Kan överlappa med Google One eller Microsoft 365.",
  },
  {
    displayName: "Dropbox",
    matchNames: ["dropbox"],
    category: "Molnlagring",
    plans: ["Basic", "Plus", "Family", "Professional"],
    note: "Dropbox känns igen. Kolla om du redan har tillräcklig lagring via annan tjänst.",
  },
  {
    displayName: "Nordic Wellness",
    matchNames: ["nordic wellness"],
    category: "Gym",
    plans: ["Bas", "Standard", "Premium", "Student"],
    note: "Nordic Wellness känns igen. Gym är extra viktigt att jämföra med hur ofta du faktiskt tränar.",
  },
  {
    displayName: "SATS",
    matchNames: ["sats"],
    category: "Gym",
    plans: ["Basic", "Premium", "All access", "Student"],
    note: "SATS känns igen. Kontrollera om du behöver tillgång till flera center.",
  },
  {
    displayName: "Fitness24Seven",
    matchNames: ["fitness24seven", "fitness 24 seven", "fitness 24/7"],
    category: "Gym",
    plans: ["Gym", "Gym + gruppträning", "Student"],
    note: "Fitness24Seven känns igen. Kolla om du använder gymmet tillräckligt ofta.",
  },
  {
    displayName: "Foodora",
    matchNames: ["foodora"],
    category: "Mat och leverans",
    plans: ["Pro", "Plus", "Medlemskap"],
    note: "Foodora känns igen. Matleverans kan bli dyrt om avgifter och småköp glöms bort.",
  },
  {
    displayName: "Wolt",
    matchNames: ["wolt"],
    category: "Mat och leverans",
    plans: ["Wolt+", "Medlemskap"],
    note: "Wolt känns igen. Kontrollera om medlemskapet lönar sig jämfört med hur ofta du beställer.",
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
    note: "Mobilabonnemang känns igen. Kontrollera om du betalar för mer surf än du använder.",
  },
  {
    displayName: "Bankkort / kreditkort",
    matchNames: ["bankkort", "kreditkort", "visa", "mastercard"],
    category: "Bankkort",
    plans: ["Standard", "Premium", "Platinum", "Kort med bonus"],
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
    note: "Försäkring känns igen. Kontrollera villkor och om skyddet redan ingår någon annanstans.",
  },
];

const initialSubscriptions: Subscription[] = [
  {
    id: 1,
    name: "Spotify Premium",
    category: "Streaming",
    price: 119,
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
    usage: "Sällan",
    plan: "",
    benefits: getBenefitsForSubscription("Google One", "Molnlagring", ""),
  },
  {
    id: 4,
    name: "Nordic Wellness",
    category: "Gym",
    price: 399,
    usage: "Sällan",
    plan: "",
    benefits: getBenefitsForSubscription("Nordic Wellness", "Gym", ""),
  },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Home() {
  const [subscriptions, setSubscriptions] =
    useState<Subscription[]>(initialSubscriptions);

  const [hasLoaded, setHasLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [hasSkippedGuide, setHasSkippedGuide] = useState(false);
  const [showPremiumDetails, setShowPremiumDetails] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Streaming");
  const [price, setPrice] = useState("");
  const [usage, setUsage] = useState("Ofta");
  const [plan, setPlan] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);

  const recognizedService = findKnownService(name);

  useEffect(() => {
    const savedSubscriptions = localStorage.getItem("subscriptions");
    const savedGuideChoice = localStorage.getItem("hasSkippedGuide");

    if (savedSubscriptions) {
      setSubscriptions(JSON.parse(savedSubscriptions));
    }

    if (savedGuideChoice === "true") {
      setHasSkippedGuide(true);
    }

    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (hasLoaded) {
      localStorage.setItem("subscriptions", JSON.stringify(subscriptions));
    }
  }, [subscriptions, hasLoaded]);

  const monthlyCost = subscriptions.reduce((sum, item) => sum + item.price, 0);
  const yearlyCost = monthlyCost * 12;

  const rarelyUsed = subscriptions.filter((item) => item.usage === "Sällan");

  const possibleMonthlySavings = rarelyUsed.reduce(
    (sum, item) => sum + item.price,
    0
  );

  const possibleYearlySavings = possibleMonthlySavings * 12;

  const overlapInsights = getOverlapInsights(subscriptions);

  const strongWarnings = subscriptions.filter(
    (item) => item.usage === "Sällan" && item.price >= 150
  );

  const priceWarnings = subscriptions.filter(
    (item) => getPriceSanity(item) !== null
  );

  const thingsToCheck =
    rarelyUsed.length +
    overlapInsights.length +
    strongWarnings.length +
    priceWarnings.length;

  const bestNextAction = getBestNextAction(subscriptions);

  function resetForm() {
    setName("");
    setCategory("Streaming");
    setPrice("");
    setUsage("Ofta");
    setPlan("");
    setEditingId(null);
  }

  function handleNameChange(value: string) {
    setName(value);

    const service = findKnownService(value);

    if (service) {
      setCategory(service.category);
    }
  }

  function handleAddOrUpdateSubscription(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const priceAsNumber = Number(price);

    if (!name || !price || priceAsNumber <= 0) {
      alert("Fyll i namn och ett pris som är större än 0.");
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
                usage,
                plan: cleanedPlan,
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
      usage,
      plan: cleanedPlan,
      benefits: getBenefitsForSubscription(name, category, cleanedPlan),
    };

    setSubscriptions([newSubscription, ...subscriptions]);

    resetForm();
    setShowForm(false);
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
    setUsage(subscription.usage);
    setPlan(subscription.plan ?? "");
    setShowForm(true);
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
                  Förmånsdetektiven
                </p>
                <p className="text-xs font-medium text-slate-500">
                  Din abonnemangsrapport
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
                onClick={handleStartFromScratch}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-100"
              >
                Börja från noll
              </button>

              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-900 text-xs text-white">
                  A
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
                Din abonnemangsrapport
              </h1>

              <p className="mt-5 max-w-2xl text-lg text-slate-600">
                Rapporten visar{" "}
                <span className="font-bold text-slate-950">
                  {thingsToCheck}
                </span>{" "}
                saker att kontrollera och en besparing att kolla på{" "}
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

                <DashboardCard
                  icon="⚠️"
                  title="Saker att kolla"
                  value={thingsToCheck.toString()}
                  description="Saker att kontrollera"
                  warning
                />
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
                  <input
                    value={name}
                    onChange={(event) => handleNameChange(event.target.value)}
                    placeholder="Exempel: Netflix"
                    className={inputClassName}
                  />
                </FormField>

                <div>
                  <FormField label="Faktisk kostnad per månad">
                    <input
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      placeholder="Exempel: 179"
                      type="number"
                      className={inputClassName}
                    />
                  </FormField>
                  <p className="mt-1 text-xs text-slate-500">
                    Skriv priset du faktiskt betalar. Kolla kontoutdrag, mejl
                    eller abonnemangssidan om du är osäker.
                  </p>
                </div>

                {recognizedService && (
                  <div className="md:col-span-2">
                    <RecognizedServiceBox
                      service={recognizedService}
                      onUseCategory={() =>
                        setCategory(recognizedService.category)
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
                    Valfritt. Appen kan föreslå vanliga planer, men du skriver
                    själv vad du faktiskt betalar.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  {editingId !== null
                    ? "Spara ändringar"
                    : "Spara abonnemang"}
                </button>

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
                />
              ))}
            </div>
          )}
        </section>
      </section>

      {showPremiumDetails && (
        <PremiumDetailsModal onClose={() => setShowPremiumDetails(false)} />
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

function hasName(subscription: Subscription, words: string[]) {
  const normalizedName = normalizeText(subscription.name);
  return words.some((word) => normalizedName.includes(word));
}

type PriceSanityLevel = "unusual" | "extreme";

type PriceSanity = {
  level: PriceSanityLevel;
  unusualLimit: number;
  extremeLimit: number;
  categoryLabel: string;
};

function getPriceLimitsForCategory(category: string) {
  if (category === "Streaming") {
    return { unusual: 500, extreme: 1000, categoryLabel: "streaming" };
  }

  if (category === "Molnlagring") {
    return { unusual: 500, extreme: 1000, categoryLabel: "molnlagring" };
  }

  if (category === "Gym") {
    return { unusual: 1000, extreme: 2000, categoryLabel: "gym" };
  }

  if (category === "Mobil") {
    return { unusual: 800, extreme: 1500, categoryLabel: "mobil" };
  }

  if (category === "Bankkort") {
    return { unusual: 500, extreme: 1000, categoryLabel: "bankkort" };
  }

  if (category === "Försäkring") {
    return { unusual: 2000, extreme: 4000, categoryLabel: "försäkring" };
  }

  if (category === "Mat och leverans") {
    return { unusual: 500, extreme: 1000, categoryLabel: "mat och leverans" };
  }

  if (category === "Medlemskap") {
    return { unusual: 500, extreme: 1000, categoryLabel: "medlemskap" };
  }

  if (category === "Shopping") {
    return { unusual: 1000, extreme: 2000, categoryLabel: "shopping" };
  }

  return { unusual: 1000, extreme: 2000, categoryLabel: "den här kategorin" };
}

function getPriceSanity(subscription: Subscription): PriceSanity | null {
  const limits = getPriceLimitsForCategory(subscription.category);

  if (subscription.price >= limits.extreme) {
    return {
      level: "extreme",
      unusualLimit: limits.unusual,
      extremeLimit: limits.extreme,
      categoryLabel: limits.categoryLabel,
    };
  }

  if (subscription.price >= limits.unusual) {
    return {
      level: "unusual",
      unusualLimit: limits.unusual,
      extremeLimit: limits.extreme,
      categoryLabel: limits.categoryLabel,
    };
  }

  return null;
}

function getHighestPriceWarning(subscriptions: Subscription[]) {
  return [...subscriptions]
    .filter((item) => getPriceSanity(item) !== null)
    .sort((a, b) => {
      const aSanity = getPriceSanity(a);
      const bSanity = getPriceSanity(b);

      if (aSanity?.level === "extreme" && bSanity?.level !== "extreme") {
        return -1;
      }

      if (bSanity?.level === "extreme" && aSanity?.level !== "extreme") {
        return 1;
      }

      return b.price - a.price;
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
      return {
        title: `Kontrollera priset på ${priceWarning.name}`,
        text: `${priceWarning.name} kostar ${formatCurrency(
          priceWarning.price
        )}/mån, vilket verkar ${
          sanity.level === "extreme" ? "extremt högt" : "ovanligt högt"
        } för ${sanity.categoryLabel}. Kontrollera om priset är rätt inskrivet eller om det gäller per år.`,
      };
    }
  }

  const rarelyUsedExpensive = subscriptions
    .filter((item) => item.usage === "Sällan" && item.price >= 150)
    .sort((a, b) => b.price - a.price);

  if (rarelyUsedExpensive.length > 0) {
    const item = rarelyUsedExpensive[0];

    return {
      title: `Börja med ${item.name}`,
      text: `${item.name} kostar ${formatCurrency(
        item.price
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
    .sort((a, b) => b.price - a.price);

  const mobileToCheck = mobileSubscriptions.find(
    (item) => item.price >= 250 || item.usage !== "Ofta"
  );

  if (mobileToCheck) {
    return {
      title: `Kolla surfmängden i ${mobileToCheck.name}`,
      text: `Gratisversionen kan inte se faktisk mobildata, men ${mobileToCheck.name} kostar ${formatCurrency(
        mobileToCheck.price
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
    .filter((item) => item.usage === "Sällan")
    .sort((a, b) => b.price - a.price);

  if (rarelyUsed.length > 0) {
    const item = rarelyUsed[0];

    return {
      title: `Kolla ${item.name}`,
      text: `${item.name} används sällan. Fundera på om den fortfarande behövs.`,
    };
  }

  const sometimesExpensive = subscriptions
    .filter((item) => item.usage === "Ibland" && item.price >= 250)
    .sort((a, b) => b.price - a.price);

  if (sometimesExpensive.length > 0) {
    const item = sometimesExpensive[0];

    return {
      title: `Kolla priset på ${item.name}`,
      text: `${item.name} kostar ${formatCurrency(
        item.price
      )}/mån och används ibland. Se om billigare plan räcker.`,
    };
  }

  const mostExpensive = [...subscriptions].sort((a, b) => b.price - a.price)[0];

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

  if (priceSanity?.level === "extreme") {
    return {
      label: "Extremt hög kostnad",
      description: `${formatCurrency(
        subscription.price
      )}/mån verkar extremt högt för ${priceSanity.categoryLabel}.`,
      className: "border-red-200 bg-red-50 text-red-800",
    };
  }

  if (priceSanity?.level === "unusual") {
    return {
      label: "Ovanligt hög kostnad",
      description: `${formatCurrency(
        subscription.price
      )}/mån verkar högt för ${priceSanity.categoryLabel}.`,
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (subscription.usage === "Sällan" && subscription.price >= 150) {
    return {
      label: "Dyrt för låg användning",
      description: `${formatCurrency(
        subscription.price
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

  if (subscription.usage === "Ibland" && subscription.price >= 250) {
    return {
      label: "Kolla priset",
      description: "Används ibland men kostar en del.",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (subscription.usage === "Ofta" && subscription.price <= 150) {
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

  if (priceSanity) {
    return "Kontrollera om priset är rätt inskrivet eller om det gäller per år.";
  }

  if (subscription.usage === "Sällan" && subscription.price >= 150) {
    return "Pausa eller säg upp om du inte behöver den.";
  }

  if (subscription.usage === "Sällan") {
    return "Kolla om tjänsten fortfarande behövs.";
  }

  if (subscription.category === "Mobil" && subscription.price >= 250) {
    return "Kolla surfmängd och billigare plan.";
  }

  if (subscription.category === "Bankkort") {
    return "Kolla årsavgift och vilka förmåner du använder.";
  }

  if (subscription.category === "Försäkring") {
    return "Kolla om skyddet redan ingår någon annanstans.";
  }

  if (subscription.usage === "Ibland" && subscription.price >= 250) {
    return "Kolla billigare plan eller alternativ.";
  }

  if (subscription.usage === "Ofta") {
    return "Behåll, men kontrollera att planen är rätt.";
  }

  return "Följ upp senare.";
}

function getRecommendationReason(subscription: Subscription) {
  const priceSanity = getPriceSanity(subscription);

  if (priceSanity) {
    return `${formatCurrency(subscription.price)}/mån verkar ${
      priceSanity.level === "extreme" ? "extremt högt" : "ovanligt högt"
    } för ${priceSanity.categoryLabel}.`;
  }

  if (subscription.usage === "Sällan" && subscription.price >= 150) {
    return `${formatCurrency(subscription.price)}/mån och används sällan.`;
  }

  if (subscription.usage === "Sällan") {
    return "Används sällan.";
  }

  if (subscription.usage === "Ibland" && subscription.price >= 250) {
    return `${formatCurrency(subscription.price)}/mån och används ibland.`;
  }

  return "";
}

function shouldShowRecommendationReason(subscription: Subscription) {
  if (getPriceSanity(subscription)) {
    return true;
  }

  if (subscription.usage === "Sällan") {
    return true;
  }

  if (subscription.usage === "Ibland" && subscription.price >= 250) {
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
  bestNextAction,
}: {
  subscriptions: Subscription[];
  possibleMonthlySavings: number;
  rarelyUsed: Subscription[];
  overlapInsights: Insight[];
  strongWarnings: Subscription[];
  priceWarnings: Subscription[];
  bestNextAction: Insight | null;
}) {
  if (subscriptions.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Din första rapport</h2>
        <p className="mt-2 text-sm text-slate-600">
          Lägg till några abonnemang för att få en snabb analys.
        </p>
      </section>
    );
  }

  const firstOverlap = overlapInsights[0];
  const focusSubscription = getReportFocusSubscription(subscriptions);

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
            {rarelyUsed.length + overlapInsights.length} saker att kontrollera
          </h2>
        </div>
      </div>

      {bestNextAction && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
            Nästa bästa åtgärd
          </p>
          <h3 className="mt-1 font-black text-emerald-950">
            {bestNextAction.title}
          </h3>
          <p className="mt-1 text-sm font-medium text-emerald-900">
            {bestNextAction.text}
          </p>

          {focusSubscription && (
            <div className="mt-3 rounded-2xl bg-white/80 p-3 text-sm font-bold text-emerald-950">
              {formatCurrency(focusSubscription.price)}/mån kan motsvara{" "}
              {formatCurrency(focusSubscription.price * 12)} per år.
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
            text={`${rarelyUsed.length} abonnemang används sällan`}
          />

          {strongWarnings.length > 0 && (
            <ReportLine
              icon="🔥"
              text={`${strongWarnings.length} dyr tjänst används sällan`}
            />
          )}

          {priceWarnings.length > 0 && (
            <ReportLine
              icon="🧾"
              text={`${priceWarnings.length} pris bör kontrolleras`}
            />
          )}

          {firstOverlap && <ReportLine icon="🔁" text={firstOverlap.title} />}
        </div>
      </div>
    </section>
  );
}

function getReportFocusSubscription(subscriptions: Subscription[]) {
  const rarelyUsedExpensive = subscriptions
    .filter((item) => item.usage === "Sällan" && item.price >= 150)
    .sort((a, b) => b.price - a.price);

  if (rarelyUsedExpensive.length > 0) {
    return rarelyUsedExpensive[0];
  }

  const rarelyUsed = subscriptions
    .filter((item) => item.usage === "Sällan")
    .sort((a, b) => b.price - a.price);

  if (rarelyUsed.length > 0) {
    return rarelyUsed[0];
  }

  const sometimesExpensive = subscriptions
    .filter((item) => item.usage === "Ibland" && item.price >= 250)
    .sort((a, b) => b.price - a.price);

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
            Se vad Premium kan hitta
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Hitta fler besparingar med bank, mejl, rabatter och smartare
            analys.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              Bank & mejl
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              Rabatter & förmåner
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              Sparplan
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
              Ingen bank eller mejl kopplas i gratisversionen.
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
              premiumfunktioner kan hjälpa dig att hitta pengar, rabatter och
              skydd du redan har rätt till.
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
            icon="🏦"
            title="Bank & mejl"
            subtitle="Automatisk upptäckt"
            items={[
              "Hitta abonnemang automatiskt via banktransaktioner.",
              "Upptäck mejlkvitton, fakturor och återkommande betalningar.",
              "Visa tjänster du kanske har glömt bort.",
              "Samla kostnader per månad och år.",
            ]}
          />

          <PremiumSection
            icon="🏷️"
            title="Rabatter & förmåner"
            subtitle="Saker du redan kan ha rätt till"
            items={[
              "Visa rabatter via bankkort, medlemskap eller abonnemang.",
              "Hitta förmåner nära dig, till exempel hotell, resor, restauranger och upplevelser.",
              "Påminna om förmåner som ingår men inte används.",
              "Visa om ett kort eller medlemskap faktiskt ger värde.",
            ]}
          />

          <PremiumSection
            icon="🧭"
            title="Smart sparplan"
            subtitle="Djupare analys"
            items={[
              "Räkna på faktisk användning, till exempel mobildata, gym och molnlagring.",
              "Hitta dubbla försäkringar och överlappande skydd.",
              "Prioritera vad du bör göra först.",
              "Visa en tydligare sparplan med möjlig besparing per månad och år.",
            ]}
          />
        </div>

        <div className="mt-6 rounded-2xl bg-slate-100 p-4">
          <p className="text-sm font-black text-slate-800">
            Du väljer själv vad du vill koppla.
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Ingen bank eller mejl läses i gratisversionen. Om sådana funktioner
            byggs senare ska användaren tydligt godkänna vad som kopplas och
            kunna koppla bort det igen.
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

function RecognizedServiceBox({
  service,
  onUseCategory,
  onChoosePlan,
}: {
  service: KnownService;
  onUseCategory: () => void;
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
          </div>
        </div>

        <button
          type="button"
          onClick={onUseCategory}
          className="rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
        >
          Använd kategori: {service.category}
        </button>
      </div>

      <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-xs font-semibold text-slate-600">
        Gratisversionen gissar inte priset. Välj gärna plan här, men skriv
        själv in den faktiska kostnaden från kontoutdrag, mejl eller
        abonnemangssidan. Automatisk prisupptäckt hör hemma i Premium.
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
            Lägg till några abonnemang, medlemskap eller kort. Du kan börja med
            streaming, mobil, gym, bankkort eller försäkring.
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
        Lägg till dina första abonnemang för att få en snabb rapport.
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
}: {
  subscription: Subscription;
  onDelete: (id: number) => void;
  onEdit: (subscription: Subscription) => void;
}) {
  const [showBenefits, setShowBenefits] = useState(false);
  const valueAssessment = getValueAssessment(subscription);
  const recommendedAction = getRecommendedAction(subscription);
  const recommendationReason = getRecommendationReason(subscription);
  const serviceIcon = getServiceIcon(subscription);

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
              {formatCurrency(subscription.price)}/mån
            </p>

            <div
              className={`mt-4 rounded-full border px-3 py-1 text-xs font-bold ${valueAssessment.className}`}
            >
              {valueAssessment.label}
            </div>
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