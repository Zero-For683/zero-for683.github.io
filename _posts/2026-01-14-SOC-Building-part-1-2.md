---
title: Building a SOC From Scratch (Part 1) - Profile Building & Operational Due Diligence
categories:
  - blue-teaming
tags:
  - soc
  - atlas-industrial
  - wazuh
---


## Stage 1: Defining the Organization

The first step in this multi-part series is establishing the organizational foundation the SOC is designed to protect. Before selecting tools or writing detections, we focused on defining three core elements:
- The company’s name and mission
- Team roles and responsibilities
- The organization’s foundational purpose, including critical capabilities, requirements, and vulnerabilities

### Company Identity

Because this is a fictional organization, our team created **Atlas Industrial** as the company name. Atlas Industrial represents a small-sized industrial business with real-world operational and security constraints.

**Mission Statement**

> Atlas Industrial manufactures and distributes high-quality computer components online, supporting businesses and consumers with reliable and efficient technology solutions.

This mission guided every design decision that followed—from system selection to risk prioritization.

## Team Roles & Responsibilities

Our team consisted of four members, with roles assigned to mirror a small but realistic SOC structure:
- Gabriel: Team Lead / Security Architect  
- P1: SOC Manager / Compliance Officer  
- P2: SOC Analyst  
- P3: SOC Analyst  

*Names have been removed for privacy.*


As **Team Lead**, I coordinate efforts across the project and ensured deliverables were completed on schedule. In my role as **Security Architect**, I designed system integrations, security controls, and the overall defensive strategy.

The SOC Manager role focused on documentation, continuity, and compliance oversight, while analysts were dedicated to operating and maintaining complex systems such as Active Directory and Kerberos.

## Foundational Purpose

At its core, Atlas Industrial’s foundational purpose is:

**Operational reliability that sustains customer trust**

### Critical Capabilities

- Manufacturing computer components
- On-time order fulfillment
- Supply chain management
- Quality assurance
- Customer support operations
  
### Critical Requirements

- Inventory management systems
- Reliable suppliers
- Internal employee portal
- Auditing processes
- Call center operations
- Legal and compliance support
- Data center availability

### Critical Vulnerabilities

- Brand reputation
- Web application vulnerabilities
- System misconfigurations
- Economic conditions impacting supply chains

## Stage 2: Operational Due Diligence

Operational due diligence focused on selecting and justifying the systems that power the environment. To reflect real-world constraints, Windows 10 was intentionally designated as a legacy system.


### System Selection & Justification

  
After evaluating our requirements and constraints, we finalized the following system assignments:

  

- **Windows 10** — User endpoint workstation  
- **Windows Server 2025** — PostgreSQL database service  
- **Ubuntu Server 22.04 (headless)** — Tryton ERP  
- **Ubuntu Server 22.04 (headless)** — Wazuh SIEM  

Below is the rationale behind each decision.

---

### Windows 10 — User Endpoint

  

End users are consistently one of the most vulnerable components in any environment. While no Windows 10 deployment is ideal—especially end-of-life happening in October of 2025, we intentionally designated it as the employee workstation to reflect real-world enterprise conditions.


By using Windows 10 as the endpoint, we can:
- Restrict and monitor user permissions through least privilege
- Centralize logging and telemetry for detection and response
- Apply focused hardening to mitigate known and unpatched vulnerabilities

Extra precautions are required to reduce exposure to legacy issues such as SMB-related exploits (e.g., EternalBlue), which reinforces the need for compensating controls, monitoring, and layered defenses as official support sunsets in October 2025.


---

### Tryton ERP — Business Application

Tryton ERP was selected as the organization’s core business application due to its extensive documentation and strong alignment with the company’s mission. It supports critical business functions such as finance, billing, inventory, and shipping.

Its architecture allows us to:
- Expose a customer-facing portal for external users
- Restrict backend administrative access to trusted systems only
- Maintain granular control over permissions and workflows
  
Tryton’s native integration with PostgreSQL also simplifies backend design while maintaining flexibility for future scaling.

---

  

### PostgreSQL — Database Platform


PostgreSQL was chosen as the database solution to support Tryton ERP. Deploying it on **Windows Server 2025** aligns with enterprise compatibility, long-term support, and documentation availability.

Although further segmentation would be ideal, this placement represents the best balance of operational constraints and security considerations. The database will be sandboxed using Docker, and future integration with **Active Directory and Kerberos** is planned to strengthen authentication and access control.
  
Given the information and constraints available, this configuration provides the most secure and maintainable solution.


---

### Wazuh — SIEM Platform

  

Wazuh was selected as the SIEM platform due to its strong support for Ubuntu, comprehensive documentation, and open-source flexibility. Ubuntu 22.04 provides a stable and well-supported foundation for SIEM operations.

We deployed Wazuh using a **Docker Compose stack**, separating the manager, indexer, dashboard, and agents. This approach:

- Simplifies updates and maintenance
- Improves modularity and troubleshooting
- Allows for straightforward scaling if needed

The single-node deployment meets our current requirements, while Wazuh’s multi-node architecture provides a clear path for future expansion.


---


> **Note:** As part of due diligence, every selected solution was deployed and validated in a virtualized lab environment to confirm functionality and integration before advancing to the next stage.

With system selection complete, the project now transitions into **risk assessment and threat modeling**. While this marks the next formal phase, due diligence remains a continuous process throughout the lifecycle of the environment.