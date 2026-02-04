---
title: Building a SOC From Scratch (Part 4) - Identifying Security Measures
categories:
  - blue-teaming
tags:
  - soc
  - detection-engineering
  - access-control
---
## Overview

This stage is the final checkpoint before implementation. The goal is to make sure the environment is not just functional, but secure by design from the ground up.

At this point, the focus shifts to hardening systems, defining access boundaries, protecting data, and ensuring visibility through logging and monitoring. Everything here is meant to reduce attack surface, limit blast radius, and give the SOC the ability to detect and respond quickly.

## Baseline Security Approach

Before touching applications, we start with the operating systems themselves.

- Harden Linux and Windows systems using established best practices  
- Reduce unnecessary services and exposed ports  
- Apply secure default configurations wherever possible  
- Ensure firewalling, logging, and endpoint protections are enabled  

Once systems are hardened, access control becomes the next priority.

## Access Control Design

Access is built around **least privilege** and **role separation**. Authentication is handled through Active Directory, but permissions are enforced at the application, database, and network layers.

Key rules:
- No users have direct database access unless they are DB administrators  
- Firewall access is restricted to Security Administrators only  
- Service accounts are non-interactive and tightly scoped  
- Users authenticate centrally, but do not inherit broad privileges  

### Access Control Matrix

| **Role** | **Windows 10 User** | **Tryton ERP** | **PostgreSQL DB** | **Wazuh SIEM** | **OPNsense Firewall** | **Active Directory** |
|--------|-------------------|--------------|------------------|--------------|----------------------|---------------------|
| **Standard User** | Login, local apps | Web access only | ❌ No access | ❌ No access | ❌ No access | Auth only |
| **Business Analyst** | Login, reporting tools | Read / limited write | ❌ No access | Read alerts | ❌ No access | Auth only |
| **SOC Analyst** | Login, admin tools | ❌ No access | ❌ No access | Full monitoring | ❌ No access | Read auth logs |
| **System Administrator** | Admin login | Admin | DB admin | Admin | ❌ No access | Admin |
| **Database Administrator** | Admin login | ❌ No access | Full admin | ❌ No access | ❌ No access | Service auth |
| **Security Administrator** | Admin login | ❌ No access | ❌ No access | Admin | Firewall admin | Admin |
| **Service Account** | ❌ No login | App auth only | Limited role | Log shipping | ❌ No access | Kerberos only |

This structure ensures that no single role has unnecessary control over multiple critical systems.

## Database Security Controls

Database protections are treated as a first-class concern.

- Encryption for data at rest and in transit  
- Role-based access controls scoped to application needs  
- Regular, verified backups with documented recovery procedures  
- No direct user access outside DBA responsibilities  

This limits exposure even if an application or endpoint is compromised.

## Patching & Maintenance Strategy

Most applications are deployed using Docker Compose, which simplifies updates and version control. Application patching is handled through container image updates and redeployments.

Operating systems still require direct attention:
- Linux systems receive regular package updates  
- Windows Defender Firewall and security features remain enabled  
- Windows 10 must be manually patched due to end-of-life status  

Routine vulnerability scans (e.g., Nessus, Metasploit) are used to identify known issues.  
- High CVSS vulnerabilities are addressed immediately  
- Lower-risk findings are prioritized and remediated case-by-case  

## Initial SIEM Use Cases

With systems secured, visibility becomes the priority. The SOC starts with a small set of high-value detections that apply to almost every environment. I'll only include 2 use cases we created for simplicity. 

### Excessive Authentication Failures

This use case focuses on early indicators of account abuse.

**Threats addressed**
- Brute-force attacks  
- Password spraying  
- Credential stuffing  
- Early-stage account compromise  

**Log sources**
- Windows Security Event Logs  
- Linux authentication logs  
- `Wazuh` agent telemetry  

**Detection logic**
- More than 5 failed authentication attempts within a defined time window  

**SOC response**
- Validate source IP reputation  
- Identify affected accounts  
- Correlate activity across endpoints and servers  
- Escalate if failures are followed by a successful login  

### Privilege Escalation or Admin Group Changes

This use case targets high-impact changes that could signal compromise or insider misuse.

**Threats addressed**
- Unauthorized privilege escalation  
- Insider threat activity  
- Post-exploitation persistence  

**Log sources**
- Windows Security Event Logs  
- Linux authentication and `sudo` logs  

**Detection logic**
- User added to privileged groups (Domain Admins, local admins, etc.)  
- Privilege changes outside approved change windows  
- Privileges granted by non-admin accounts  
- Administrative activity occurring during unusual hours  

These alerts give the SOC immediate visibility into actions that could fundamentally change system trust.

## Closing Thoughts

This stage ties everything together: hardened systems, clear access boundaries, protected data, and meaningful detection. By the time implementation begins, the environment already assumes compromise—and is designed to limit damage and surface problems early.