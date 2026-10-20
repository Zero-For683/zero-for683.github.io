---
title: Writeups
layout: single
permalink: /writeups/
description: Technical walkthroughs, lab investigations, and security engineering notes.
---

## Browse by topic

<div class="cat-pills">{% assign groups = site.categories | sort %}{% for group in groups %}<a href="{{ '/categories/' | relative_url }}#{{ group[0] | slugify }}" class="cat-pill">{{ group[0] | replace: '-', ' ' | capitalize }} <span>{{ group[1].size }}</span></a>{% endfor %}</div>

## All articles

<div class="article-list">{% for post in site.posts %}<a class="article-row" href="{{ post.url | relative_url }}"><div><span class="overline">{{ post.categories | join: ' / ' | replace: '-', ' ' }}</span><h3>{{ post.title }}</h3><time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: '%B %-d, %Y' }}</time></div><span class="row-arrow" aria-hidden="true">→</span></a>{% endfor %}</div>
