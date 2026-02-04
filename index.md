---
layout: splash
permalink: /
title: "Gabriel Barbir"
excerpt: "Cybersecurity Engineer · OSCP · U.S. Navy Veteran<br><small style='opacity: 0.7;'>Detection engineering, threat hunting, and SOC operations.</small>"
header:
  overlay_color: "#0d1b2a"
  actions:
    - label: "<i class='fab fa-linkedin'></i> LinkedIn"
      url: "https://www.linkedin.com/in/gabriel-barbir/"
    - label: "<i class='fab fa-github'></i> GitHub"
      url: "https://github.com/Zero-For683"
    - label: "About Me"
      url: "/about/"
feature_row:
  - title: "SOC Engineering"
    excerpt: "A 6-part series documenting the design, architecture, and build-out of a full Security Operations Center from the ground up."
    url: "/categories/#blue-teaming"
    btn_label: "Read Series →"
    btn_class: "btn--primary btn--small"
  - title: "Security Writeups"
    excerpt: "Exploitation walkthroughs, remediation breakdowns, and hands-on analysis from real lab environments and CTF challenges."
    url: "/writeups/"
    btn_label: "View Writeups →"
    btn_class: "btn--primary btn--small"
  - title: "About"
    excerpt: "U.S. Navy veteran with hands-on SOC engineering, detection engineering, and incident response experience."
    url: "/about/"
    btn_label: "Learn More →"
    btn_class: "btn--primary btn--small"
---

{% include feature_row type="center" %}

---

## Recent Writing

<div class="post-grid">
{% for post in site.posts limit:6 %}
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

<div class="cta-row">
  <a href="/writeups/" class="btn btn--outline--inverse btn--small">View All Posts →</a>
</div>
