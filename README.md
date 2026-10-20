# Gabriel Barbir — Security knowledge base

A GitHub Pages / Jekyll site with local documentation layouts. Content lives in `_posts/`; existing post URLs are preserved. Navigation groups are generated from post categories.

## Preview locally

With Ruby and Bundler installed:

```sh

bundle install

bundle exec jekyll serve --host 127.0.0.1

```

Open http://127.0.0.1:4000. GitHub Pages can build this site directly from the existing publishing branch.

## Customize

- `_config.yml`: site identity, author, and external profile links.

- `_data/navigation.yml`: primary navigation.

- `index.md`: homepage summary and featured topics.

- `assets/css/knowledge.css`: colors, spacing, and responsive layouts.

- `_layouts/default.html`: shared three-column shell.

- `assets/js/knowledge.js`: search, theme, outline, and code copying.

Search uses the generated `search.json` index; new posts appear automatically. The interface defaults to dark mode and remembers the visitor's selected theme. No remote theme, tracking, or external font requests are required.
