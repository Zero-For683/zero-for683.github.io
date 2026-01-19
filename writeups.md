---
title: Writeups
layout: single
permalink: /writeups/
classes: wide
---
## Sections

- [Incident Response](/categories/#incident-response)
- [Threat Hunting](/categories/#threat-hunting)
- [Blue Teaming](/categories/#blue-teaming)
- [Offensive Security](/categories/#offensive-security)

## Recent
{% for post in site.posts limit:8 %}
- **{{ post.date | date: "%Y-%m-%d" }}** — [{{ post.title }}]({{ post.url }})
{% endfor %}
