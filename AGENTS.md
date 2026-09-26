<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Provide public Lovable Cloud browser connection values through Vite config fallbacks so fresh preview and production builds cannot omit them.
- Register the offline service worker only on published/custom domains, never in localhost or Lovable preview, to prevent stale preview bundles.
