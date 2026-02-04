---
title: Building a SOC From Scratch (Part 2) - Organizational Risk Assessment & Threat Analysis
categories:
  - blue-teaming
tags:
  - soc
  - threat-modeling
  - risk-assessment
---
This stage evaluates risk and adversary behavior before implementation begins. By analyzing threats and vulnerabilities upfront, we can integrate security controls as part of the build process rather than retrofitting them later.

The focus areas for this stage include:

- Threat identification
- Vulnerability mapping
- Risk assessment
- Attack modeling
- Mitigation prioritization

## Initial Threat Modeling Overview

Below is a high-level threat model diagram used to visualize early attack paths and areas of concern. This diagram is intentionally simplified and does **not** represent the final network architecture.

The goal at this stage is not to enumerate every possible attack vector, but to highlight realistic and high-impact paths that warrant deeper analysis during design.

![threat-model-sketch](/assets/images/threat-model-sketch.png)


## Risk Assessment Using Risk Registers


Risk registers allow us to document threats in a structured way by capturing likelihood, impact, and alignment to the CIA triad. For scope and practicality, only representative risks are documented here.


### 1. Web Application Attack Surface (`Tryton` ERP)

  

**System:** `Tryton` (Ubuntu 22.04) 
**Source:** `Tryton` documentation cites brute-force login, SQL injection, and XSS as primary risks for browser-based ERP systems.

`Tryton` Documentation

| Item              | Details                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| **Threat**        | Web-based attacks (brute force, XSS, SQL injection)                                                           |
| **Vulnerability** | Public-facing login page, weak input validation, outdated web components                                      |
| **Likelihood**    | **High**                                                                                                      |
| **Impact**        | **High** — ERP manages inventory, production workflows, customer data                                         |
| **CIA Impact**    | **C: High*, *I: High*, *A: Medium**                                                                           |
| **Risk Level**    | **High**                                                                                                      |
| **Mitigation**    | MFA, rate limiting, WAF rules, hardened Docker configuration, encrypted communication, secure coding settings |

### 2. Database Service Exposure (PostgreSQL)

**System:** PostgreSQL Database (Windows Server 2025) 
**Source:** PostgreSQL documentation describes this as a major risk if port 5432 is exposed publicly.

| Item               | Details                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Threat**         | External attacker exploiting exposed database port (5432)                                                      |
| **Vulnerability**  | Open port exposure, brute-force attacks, SQL injection attempts                                                |
| **Likelihood**     | **Medium** (common attack vector)                                                                              |
| **Impact**         | **High** — Database holds financial, inventory, and customer data                                              |
| **CIA Impact** | **Confidentiality: High**, **Integrity: High**, **Availability: Medium**                                   |
| **Risk Level**     | **High**                                                                                                       |
| **Mitigation**     | Firewall rules, network segmentation, disable remote access, enable TLS, strong passwords, change default port |

### 3. Misconfiguration Risk (Docker, ERP, Database, SIEM)


**System:** Entire environment (`Tryton`, PostgreSQL, `Wazuh`)  
**Source:** Both `Tryton` & PostgreSQL docs warn that Docker misconfiguration can expose services.

| Item              | Details                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Threat**        | Accidental misconfiguration that exposes ports, credentials, or debug services                                                             |
| **Vulnerability** | Weak .env file permissions, exposed Docker ports, default creds                                                                            |
| **Likelihood**    | **Medium**                                                                                                                                 |
| **Impact**        | **High** — system-wide compromise possible                                                                                                 |
| **CIA Impact**    | **C: High**, **I: High**, **A: Medium**                                                                                                    |
| **Risk Level**    | **High**                                                                                                                                   |
| **Mitigation**    | Enforce .env file permissions, disable default Docker networks, validate compose files, use hardened images, perform CIS Docker benchmarks |

### 4. Certificate Misconfiguration (`Wazuh` SIEM)

  

**System:** `Wazuh` SIEM (Dashboard + Manager + Indexer, Ubuntu 22.04)  
**Source:** `Wazuh` installation guide stresses issues with missing/incorrect certificates causing insecure communication or service failures.

| Item              | Details                                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Threat**        | Attackers intercept SIEM traffic or cause service failures                                                                    |
| **Vulnerability** | Incorrect or missing TLS certificates, unencrypted dashboard                                                                  |
| **Likelihood**    | **Medium**                                                                                                                    |
| **Impact**        | **High** — SIEM integrity is critical for monitoring & detection                                                              |
| **CIA Impact**    | **C: High**, **I: High**, **A: High**                                                                                         |
| **Risk Level**    | **High**                                                                                                                      |
| **Mitigation**    | Generate correct certs, enforce HTTPS, validate pem files, restart faulty services, use automated certificate lifecycle tools |

### 5. User Endpoint Vulnerability (Windows 10)

**System:** Windows 10 endpoint  
**Source:** Due Diligence doc identifies user environment as “biggest weakness.”

|Item|Details|
|---|---|
|**Threat**|Phishing, malware, credential theft|
|**Vulnerability**|Human error, social engineering, outdated software|
|**Likelihood**|**High**|
|**Impact**|**High** — endpoint compromise can pivot to DB or ERP|
|**CIA Impact**|**C: High**, **I: Medium**, **A: Medium**|
|**Risk Level**|**High**|
|**Mitigation**|Wazuh agent monitoring, endpoint hardening, user training, email security controls, application allowlisting|

## Framework Mapping: STRIDE

To structure our threat analysis, we mapped identified risks to the **STRIDE** framework:
- Spoofing  
- Tampering  
- Repudiation  
- Information Disclosure  
- Denial of Service  
- Elevation of Privilege  

Effective threat modeling should answer four core questions:
1. What are we building?
2. What can go wrong?
3. How do we mitigate it?
4. Are the mitigations sufficient?

| **Scenario**                                             | **Spoofing** | **Tampering** | **Repudiation** | **Information Disclosure** | **Denial of Service** | **Elevation of Privilege** |
| -------------------------------------------------------- | ------------ | ------------- | --------------- | -------------------------- | --------------------- | -------------------------- |
| **Web Application Attack Surface (Tryton).**             | ✔            | ✔             | ✔               | ✔                          | ✔                     | ✔                          |
| **Database Service Exposure.**                           |              | ✔             |                 | ✔                          |                       | ✔                          |
| **Certificate Misconfiguration (Wazuh)a**.               | ✔            | ✔             | ✔               |                            |                       |                            |
| **User Endpoint Vulnerability (Windows 10 Workstation)** |              | ✔             |                 | ✔                          |                       | ✔                          |

This stage establishes the risk baseline that informs architectural decisions and security controls in the next phase. Threat modeling remains iterative and will be revisited as the environment evolves.