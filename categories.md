---
title: Topics
layout: single
permalink: /categories/
description: Explore the latest three articles in each topic, or open a topic to browse its complete archive.
---

<div class="cat-pills">{% assign groups = site.categories | sort %}{% for group in groups %}<a class="cat-pill" href="#{{ group[0] | slugify }}">{{ group[0] | replace: '-', ' ' | capitalize }} <span>{{ group[1].size }}</span></a>{% endfor %}</div>

{% for group in groups %}
<h2 id="{{ group[0] | slugify }}"><a href="{{ '/topics/' | append: group[0] | append: '/' | relative_url }}">{{ group[0] | replace: '-', ' ' | capitalize }}</a></h2>
<div class="article-list">{% assign posts = group[1] | sort: 'path' | sort: 'date' | reverse %}{% for post in posts limit:3 %}<a class="article-row" href="{{ post.url | relative_url }}"><div><h3>{{ post.title }}</h3><time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: '%B %-d, %Y' }}</time></div><span class="row-arrow" aria-hidden="true">→</span></a>{% endfor %}</div>
<a class="text-link" href="{{ '/topics/' | append: group[0] | append: '/' | relative_url }}">View all {{ group[1].size }} {{ group[0] | replace: '-', ' ' }} articles →</a>
{% endfor %}
