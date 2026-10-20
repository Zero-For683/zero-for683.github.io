---
layout: single
permalink: /
title: Research, Projects & Writeups
description: Practical research and field notes on building, attacking, and defending systems.
---

<div class="intro-note"><span class="note-label">GABRIEL BARBIR</span><p>Cybersecurity Professional · OSCP · GSEC · U.S. Navy Veteran</p><p>My work spans detection engineering, threat hunting, incident response, and offensive security. This is where I document the environments I build, the techniques I test, and what I learn along the way.</p><div class="inline-links"><a href="/about/">More about me <span aria-hidden="true">→</span></a><a href="https://www.linkedin.com/in/gabriel-barbir/">LinkedIn ↗</a><a href="https://github.com/Zero-For683">GitHub ↗</a></div></div>

## Explore the knowledge base

Follow a project from its foundations, or jump into a specific technique. Each writeup captures the process, evidence, and lessons learned.

<div class="topic-grid">
<a class="topic-card" href="/topics/blue-teaming/"><span class="topic-number">01 / DEFENSE</span><h3>Defensive security</h3><p>Protecting systems through security operations, risk management, and resilient design.</p><span class="card-link">Explore defensive security <span aria-hidden="true">→</span></span></a>
<a class="topic-card" href="/topics/homelab/"><span class="topic-number">02 / HANDS-ON PRACTICE</span><h3>Labs & research</h3><p>Exploring technologies, testing techniques, and building practical experience in realistic environments.</p><span class="card-link">Explore the labs <span aria-hidden="true">→</span></span></a>
<a class="topic-card" href="/topics/offensive-security/"><span class="topic-number">03 / OFFENSE</span><h3>Offensive security</h3><p>Understanding vulnerabilities, attack techniques, and the lessons they offer for better defense.</p><span class="card-link">Explore offensive security <span aria-hidden="true">→</span></span></a>
<a class="topic-card" href="/projects/"><span class="topic-number">04 / APPLIED WORK</span><h3>Projects & engineering</h3><p>Turning security ideas into working solutions, with the decisions and lessons behind each build.</p><span class="card-link">Explore projects <span aria-hidden="true">→</span></span></a>
</div>

## Recent writing

<div class="article-list">
{% for post in site.posts limit:6 %}
<a class="article-row" href="{{ post.url | relative_url }}"><div><span class="overline">{{ post.categories.first | replace: '-', ' ' | capitalize }}</span><h3>{{ post.title }}</h3><time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: '%B %-d, %Y' }}</time></div><span class="row-arrow" aria-hidden="true">→</span></a>
{% endfor %}
</div>

<a class="text-link" href="/writeups/">View all writeups →</a>
