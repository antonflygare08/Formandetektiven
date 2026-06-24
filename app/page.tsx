"use client";

import { useEffect, useState } from "react";

type Subscription = {
  id: number;
  name: string;
  category: string;
  price: number;
  usage: string;
  benefits: string[];
};

const initialSubscriptions: Subscription[] = [
  {
    id: 1,
    name: "Spotify Premium",
    category: "Streaming",
    price: 119,
    usage: "Ofta",
    benefits: ["Musik utan reklam", "Offline-lyssning", "Familjeplan finns"],
  },
  {
    id: 2,
    name: "Microsoft 365",
    category: "Molnlagring",
    price: 99,
    usage: "Ibland",
    benefits: ["Office-appar", "OneDrive-lagring", "Familjedelning"],
  },
  {
    id: 3,
    name: "Google One",
    category: "Molnlagring",
    price: 25,
    usage: "Sällan",
    benefits: ["Extra lagring", "Familjedelning", "Google-support"],
  },
  {
    id: 4,
    name: "Nordic Wellness",
    category: "Gym",
    price: 399,
    usage: "Sällan",
    benefits: ["Gymträning", "Gruppass", "Flera anläggningar"],
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

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Streaming");
  const [price, setPrice] = useState("");
  const [usage, setUsage] = useState("Ofta");

  useEffect(() => {
    const savedSubscriptions = localStorage.getItem("subscriptions");

    if (savedSubscriptions) {
      setSubscriptions(JSON.parse(savedSubscriptions));
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

  const cloudSubscriptions = subscriptions.filter(
    (item) => item.category === "Molnlagring"
  );

  const rarelyUsed = subscriptions.filter((item) => item.usage === "Sällan");

  function handleAddSubscription(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const priceAsNumber = Number(price);

    if (!name || !price || priceAsNumber <= 0) {
      alert("Fyll i namn och ett pris som är större än 0.");
      return;
    }

    const newSubscription: Subscription = {
      id: Date.now(),
      name,
      category,
      price: priceAsNumber,
      usage,
      benefits: getDefaultBenefits(category),
    };

    setSubscriptions([newSubscription, ...subscriptions]);

    setName("");
    setCategory("Streaming");
    setPrice("");
    setUsage("Ofta");
    setShowForm(false);
  }

  function handleDeleteSubscription(id: number) {
    setSubscriptions(subscriptions.filter((item) => item.id !== id));
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Förmånsdetektiven
          </p>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Hitta pengar och förmåner du redan har rätt till.
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Lägg in dina abonnemang, medlemskap och kort. Appen visar vad som
            ingår, vad som överlappar och var du kan spara pengar.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <DashboardCard
            title="Månadskostnad"
            value={formatCurrency(monthlyCost)}
            description="Det du betalar varje månad"
          />

          <DashboardCard
            title="Årskostnad"
            value={formatCurrency(yearlyCost)}
            description="Din ungefärliga kostnad per år"
          />

          <DashboardCard
            title="Abonnemang"
            value={subscriptions.length.toString()}
            description="Inlagda tjänster"
          />

          <DashboardCard
            title="Möjliga överlapp"
            value={cloudSubscriptions.length > 1 ? "1" : "0"}
            description="Saker du kanske betalar dubbelt för"
          />
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Dina abonnemang</h2>

              <button
                onClick={() => setShowForm(!showForm)}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {showForm ? "Stäng" : "Lägg till"}
              </button>
            </div>

            {showForm && (
              <form
                onSubmit={handleAddSubscription}
                className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="text-lg font-bold">Lägg till abonnemang</h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Namn
                    </label>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Exempel: Netflix"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Kostnad per månad
                    </label>
                    <input
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      placeholder="Exempel: 129"
                      type="number"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Kategori
                    </label>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
                    >
                      <option>Streaming</option>
                      <option>Molnlagring</option>
                      <option>Gym</option>
                      <option>Mobil</option>
                      <option>Bankkort</option>
                      <option>Försäkring</option>
                      <option>Medlemskap</option>
                      <option>Annat</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Användning
                    </label>
                    <select
                      value={usage}
                      onChange={(event) => setUsage(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
                    >
                      <option>Ofta</option>
                      <option>Ibland</option>
                      <option>Sällan</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Spara abonnemang
                </button>
              </form>
            )}

            {subscriptions.length === 0 ? (
              <EmptyState onAddClick={() => setShowForm(true)} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {subscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.id}
                    id={subscription.id}
                    name={subscription.name}
                    category={subscription.category}
                    price={subscription.price}
                    usage={subscription.usage}
                    benefits={subscription.benefits}
                    onDelete={handleDeleteSubscription}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <Recommendations
              cloudOverlap={cloudSubscriptions.length > 1}
              rarelyUsed={rarelyUsed}
            />

            <BenefitsSummary />
          </aside>
        </section>
      </section>
    </main>
  );
}

function getDefaultBenefits(category: string) {
  if (category === "Streaming") {
    return ["Underhållning", "Familjeplan kan finnas", "Offline-läge kan ingå"];
  }

  if (category === "Molnlagring") {
    return ["Extra lagring", "Familjedelning kan finnas", "Backup av filer"];
  }

  if (category === "Gym") {
    return ["Träning", "Gruppass kan ingå", "Flera anläggningar kan ingå"];
  }

  if (category === "Mobil") {
    return ["Surf", "Samtal och sms", "Rabatter kan finnas"];
  }

  if (category === "Bankkort") {
    return [
      "Reseförsäkring kan ingå",
      "Köpskydd kan ingå",
      "Rabatter kan finnas",
    ];
  }

  if (category === "Försäkring") {
    return ["Skydd vid skada", "Villkor bör jämföras", "Överlapp kan finnas"];
  }

  if (category === "Medlemskap") {
    return ["Rabatter kan ingå", "Bonusar kan finnas", "Medlemsförmåner"];
  }

  return [
    "Förmåner kan finnas",
    "Kontrollera villkoren",
    "Jämför med andra tjänster",
  ];
}

function DashboardCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function EmptyState({ onAddClick }: { onAddClick: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <p className="text-4xl">🔎</p>

      <h3 className="mt-4 text-xl font-bold">Du har inga abonnemang ännu</h3>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        Lägg till dina första abonnemang, medlemskap eller kort för att börja
        hitta kostnader, överlapp och missade förmåner.
      </p>

      <button
        onClick={onAddClick}
        className="mt-5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        Lägg till första abonnemanget
      </button>
    </div>
  );
}

function SubscriptionCard({
  id,
  name,
  category,
  price,
  usage,
  benefits,
  onDelete,
}: {
  id: number;
  name: string;
  category: string;
  price: number;
  usage: string;
  benefits: string[];
  onDelete: (id: number) => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">{name}</h3>
          <p className="mt-1 text-sm text-slate-500">{category}</p>
        </div>

        <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
          {formatCurrency(price)}/mån
        </p>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-slate-500">Användning</p>
        <p className="mt-1 font-semibold">{usage}</p>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-slate-500">Förmåner</p>
        <ul className="mt-2 space-y-1">
          {benefits.map((benefit) => (
            <li key={benefit} className="text-sm text-slate-700">
              • {benefit}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => onDelete(id)}
        className="mt-5 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        Ta bort
      </button>
    </article>
  );
}

function Recommendations({
  cloudOverlap,
  rarelyUsed,
}: {
  cloudOverlap: boolean;
  rarelyUsed: Subscription[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">Sparförslag</h2>

      <div className="mt-4 space-y-3">
        {cloudOverlap && (
          <RecommendationItem
            title="Möjlig dubbel molnlagring"
            text="Du har flera tjänster som erbjuder molnlagring. Kontrollera om du verkligen behöver alla."
          />
        )}

        {rarelyUsed.map((item) => (
          <RecommendationItem
            key={item.id}
            title={`${item.name} används sällan`}
            text="Överväg att pausa, byta plan eller säga upp tjänsten om du inte använder den."
          />
        ))}

        <RecommendationItem
          title="Kontrollera bankkortsförmåner"
          text="Många bankkort kan innehålla reseförsäkring, köpskydd eller rabatter."
        />
      </div>
    </section>
  );
}

function RecommendationItem({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl bg-emerald-50 p-4">
      <h3 className="font-semibold text-emerald-950">{title}</h3>
      <p className="mt-1 text-sm text-emerald-900">{text}</p>
    </div>
  );
}

function BenefitsSummary() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">Missade förmåner</h2>

      <div className="mt-4 space-y-3">
        <BenefitItem text="Familjeplan kan finnas för vissa tjänster." />
        <BenefitItem text="Bankkort kan ge reseförsäkring eller köpskydd." />
        <BenefitItem text="Gymkort kan ge tillgång till fler anläggningar." />
        <BenefitItem text="Molnlagring kan redan ingå i en tjänst du har." />
      </div>
    </section>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
      {text}
    </div>
  );
}