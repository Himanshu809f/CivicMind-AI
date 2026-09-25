export function renderErrorPage(options?: { config?: boolean }): string {
  const config = options?.config === true;
  const title = config ? "CivicMind AI — service unavailable" : "This page didn't load";
  const heading = config
    ? "CivicMind AI can't reach its services"
    : "This page didn't load";
  const body = config
    ? "The app's secure connection details are missing, so sign-in and complaints can't load right now. Your saved data is safe. If this site was just published, publish it again, then retry."
    : "Something went wrong on our end. You can try refreshing or head back home.";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.png" type="image/png" />
    <style>
      :root { color-scheme: light dark; --bg: #f7f8fb; --fg: #101323; --muted: #4b5563; --card: #ffffff; --border: #e3e6ef; --brand: #2f5bd7; }
      @media (prefers-color-scheme: dark) {
        :root { --bg: #0a0d1a; --fg: #eef1fb; --muted: #9aa3bd; --card: #121629; --border: #242a44; --brand: #5b87ff; }
      }
      body { font: 15px/1.6 "Manrope", system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--fg); display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 32rem; width: 100%; padding: 1.75rem; background: var(--card); border: 1px solid var(--border); border-radius: 1rem; box-shadow: 0 18px 40px -24px rgba(16, 19, 35, 0.35); }
      .brand { display: flex; align-items: center; gap: 0.65rem; margin-bottom: 1.5rem; }
      .mark { width: 2.25rem; height: 2.25rem; border-radius: 0.75rem; background: linear-gradient(135deg, var(--brand), #7c4ddc); }
      .name { font-weight: 700; letter-spacing: -0.01em; }
      .tag { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--muted); font-weight: 600; }
      h1 { font-size: 1.2rem; margin: 0 0 0.6rem; letter-spacing: -0.01em; }
      p { color: var(--muted); margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
      a, button { padding: 0.55rem 1rem; border-radius: 0.5rem; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: var(--brand); color: #fff; }
      .secondary { background: transparent; color: var(--fg); border-color: var(--border); }
      a:focus-visible, button:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
    </style>
  </head>
  <body>
    <div class="card" role="alert">
      <div class="brand">
        <span class="mark" aria-hidden="true"></span>
        <span><span class="name">CivicMind AI</span><span class="tag">Public issue intelligence</span></span>
      </div>
      <h1>${heading}</h1>
      <p>${body}</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Retry connection</button>
        <a class="secondary" href="/">Back to home</a>
      </div>
    </div>
  </body>
</html>`;
}
