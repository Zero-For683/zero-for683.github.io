---
title: "Writeups"
layout: single
permalink: /writeups/
classes: wide
---

### Browse by Category

<div class="cat-pills">
{% for cat in site.categories %}
  <a href="/categories/#{{ cat[0] }}" class="cat-pill">{{ cat[0] | replace: "-", " " | capitalize }}</a>
{% endfor %}
</div>

---

### All Posts

<div class="post-grid">
{% for post in site.posts %}
<div class="post-card">
  <div class="post-card__tags">
  {% for cat in post.categories %}
    <span class="post-card__tag">{{ cat | replace: "-", " " | capitalize }}</span>
  {% endfor %}
  </div>
  <div class="post-card__title"><a href="{{ post.url }}">{{ post.title }}</a></div>
  <div class="post-card__date">{{ post.date | date: "%B %d, %Y" }}</div>
</div>
{% endfor %}
</div>
