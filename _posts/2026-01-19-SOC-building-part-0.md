---
title: Building a SOC From Scratch (Overview)
categories:
  - blue-teaming
tags:
classes: narrow
toc: true
toc_sticky: true
layout: single
read_time: true
---

This post introduces a multi-part series documenting the design and build-out of a Security Operations Center during my RapidAscent apprenticeship. Each entry focuses on decisions, tradeoffs, and lessons learned rather than tools or step-by-step instructions.


## What this project is

The premise is simple on paper—“build a SOC”—but the work quickly moves beyond tools and dashboards. Instead of starting with alerts, we start with the business. My team and I created a fictional organization, defined its mission, and worked through what actually needs to be protected. From there, every decision flows forward: systems selection, threat modeling, architecture, and security controls.

## How we approached it

Across the project, I rotated through multiple perspectives you’d see in a real SOC:

- Thinking like an analyst during investigations  
- Thinking like an engineer when designing detection and architecture  
- Thinking like a security lead when balancing risk, documentation, and operational tradeoffs



## The environment we worked in

We deliberately worked in an imperfect environment. That meant mixed operating systems, a Windows 10 endpoint, and a designated legacy system—because real SOCs rarely defend clean, modern networks. This forced us to deal with risk realistically, not theoretically.

**Why this matters:** Most SOCs don’t defend clean, modern environments. Designing controls around legacy systems forces realistic risk decisions instead of idealized ones.


---

## How this series is structured

Each stage of the project builds on the last:

- Establishing organizational context and roles,
- Selecting and justifying core systems,
- Modeling threats and prioritizing risk,
- Designing logical and network architectures,
- And planning security controls before anything is deployed.

Once planning and documentation are complete, we move into implementation. In this phase, systems are hardened and aligned with NIST and GRC requirements, then validated through testing to determine whether our detections can identify threats operating within the environment.

# What this series will cover

This blog isn’t a step-by-step tutorial or a tool review. It’s a record of _how decisions were made_, what tradeoffs mattered, and how offensive and defensive thinking intersect when you’re responsible for defending an environment. My goal is to show how I think as a SOC analyst and security engineer—not just what I can configure.

If you’re interested in detection engineering, threat hunting, incident response, or how SOCs are actually built in practice, this series is where that work lives.
