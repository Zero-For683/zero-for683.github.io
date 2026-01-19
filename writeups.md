---
title: Writeups
layout: single
permalink: /writeups/
classes: wide
---
## Sections

- [Incident Response](/categories/#incident-response)
- [Threat Hunting](/categories/#threat-hunting)
- [Detection Engineering](/categories/#detection-engineering)
- [Offensive Security](/categories/#offensive-security)

## Recent
{% for post in site.posts limit:8 %}
- **{{ post.date | date: "%Y-%m-%d" }}** — [{{ post.title }}]({{ post.url }})
{% endfor %}
