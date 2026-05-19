const AFFILIATES = [
  {
    name: "Polar.sh",
    url: "https://polar.sh?ref=revvel-skill-runner",
    blurb: "GitHub-native funding for open source & indie devs.",
  },
  {
    name: "Vercel",
    url: "https://vercel.com?ref=revvel-skill-runner",
    blurb: "Deploy Next.js apps with zero config.",
  },
  {
    name: "Resend",
    url: "https://resend.com?ref=revvel-skill-runner",
    blurb: "Modern email API for newsletters & transactional mail.",
  },
];

export default function AffiliateMarketing() {
  return (
    <section className="my-16">
      <h2 className="text-2xl font-bold mb-4">Tools we recommend</h2>
      <p className="text-sm opacity-70 mb-6">
        Some links below are affiliate links — we earn a small commission at no
        extra cost to you.
      </p>
      <ul className="grid sm:grid-cols-3 gap-4">
        {AFFILIATES.map((a) => (
          <li key={a.name} className="p-4 border rounded-lg">
            <a
              href={a.url}
              rel="sponsored noopener noreferrer"
              target="_blank"
              className="font-semibold text-blue-600 hover:underline"
            >
              {a.name}
            </a>
            <p className="text-sm mt-1 opacity-80">{a.blurb}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
