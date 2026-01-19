---
title: Building a SOC From Scratch (Overview)
categories:
  - "[homelab, tooling, blue-teaming]"
tags:
---

# Building a SOC from Scratch

This series documents one of the largest projects I’ve worked on during my `RapidAscent` apprenticeship: designing and building a Security Operations Center from the ground up.

The premise is simple on paper—_“build a SOC”_—but the work quickly moves beyond tools and dashboards. Instead of starting with alerts, we start with the business. My team and I created a fictional organization, defined its mission, and worked through what actually needs to be protected. From there, every decision flows forward: systems selection, threat modeling, architecture, and security controls.

Across the project, I rotated through multiple perspectives you’d see in a real SOC:

- thinking like an analyst during investigations,
- like an engineer when designing detection and architecture,
- and like a security lead when balancing risk, documentation, and operational tradeoffs.

We deliberately worked in an imperfect environment. That meant mixed operating systems, a Windows 10 endpoint, and a designated legacy system—because real SOCs rarely defend clean, modern networks. This forced us to deal with risk realistically, not theoretically.

Each stage of the project builds on the last:

- establishing organizational context and roles,
- selecting and justifying core systems,
- modeling threats and prioritizing risk,
- designing logical and network architectures,
- and planning security controls before anything is deployed.

This blog isn’t a step-by-step tutorial or a tool review. It’s a record of _how decisions were made_, what tradeoffs mattered, and how offensive and defensive thinking intersect when you’re responsible for defending an environment. My goal is to show how I think as a SOC analyst and security engineer—not just what I can configure.

If you’re interested in detection engineering, threat hunting, incident response, or how SOCs are actually built in practice, this series is where that work lives.