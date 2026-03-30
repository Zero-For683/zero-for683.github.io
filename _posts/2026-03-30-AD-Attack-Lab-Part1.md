---
title: "AD Attack Lab (Part 1) - Lab Build & Environment Setup"
categories:
  - detection-engineering
tags:
  - active-directory
  - detection-engineering
  - wazuh
  - sysmon
  - kerberoasting
  - homelab
  - soc
---

## Setting the Stage

If you're going into SOC work, Active Directory attacks aren't just something you'll read about — they'll show up in your first interview, your first alert queue, and eventually your first real incident. Kerberoasting, AS-REP Roasting, Pass-the-Hash, and DCSync are table-stakes topics. I built this lab to have real hands-on experience with all of them: generating actual attack telemetry, building detection rules from the raw logs, and investigating the aftermath the way an analyst would.

This first post covers the lab build — getting the environment up, configured, and verified before a single attack runs. Boring? Maybe. But a sloppy lab environment means garbage telemetry, and garbage telemetry means you can't trust your detections.

---

## Infrastructure

The setup is intentionally minimal. You don't need complexity here — you need clean telemetry.

| Machine | Role |
|---|---|
| Windows Server 2022 | Domain Controller (`corp.local`) |
| Windows 10 (22H2) | Victim workstation, domain-joined |
| Kali Linux | Attacker |
| Wazuh (existing) | SIEM + detection platform |

All VMs are on an isolated internal network. The Wazuh instance was already running from a previous project, so enrollment was straightforward.

## Building the Domain

After promoting Windows Server 2022 to a Domain Controller for `corp.local`, the first task was creating a realistic OU structure and user population. A flat domain with no structure doesn't reflect anything you'd find in a real environment, and it also makes it harder to simulate targeted attacks against specific user groups.

I created three OUs — `IT`, `Finance`, and `HR` — and populated them with a mix of dummy user accounts. The goal wasn't a perfect simulation; it was enough realistic structure to make attack targeting meaningful.

![OU tree in Active Directory Users and Computers](/assets/images/ad-attack-lab/ou_tree_creation.png)

## Planting the Attack Targets

### Kerberoastable Service Accounts

Kerberoasting works by requesting Kerberos service tickets (TGS) for accounts that have Service Principal Names (SPNs) registered. Any domain user can request these tickets, and if the account uses RC4 encryption, the ticket is crackable offline with hashcat. Real environments are full of old service accounts with SPNs and weak passwords — this is not an exotic attack.

I registered SPNs for two service accounts: `svc_sql` (simulating a SQL service) and `svc_backup` (simulating a backup service). Both were given weak passwords.

![Registering SPNs for Kerberoastable service accounts](/assets/images/ad-attack-lab/setting_kerberoastable_users.png)

The `setspn -A` command registers the SPN, and `setspn -L` confirms it took. Both accounts now show up as valid Kerberoasting targets when enumerated from the attacker machine.

### AS-REP Roastable Account

AS-REP Roasting targets accounts that have Kerberos pre-authentication disabled. When pre-auth is off, anyone can request an AS-REP for that account without needing to prove who they are first — and that response contains an encrypted blob crackable offline.

For user `asimmons`, I checked "Do not require Kerberos preauthentication" in the account properties.

![Setting Do not require Kerberos preauthentication on asimmons](/assets/images/ad-attack-lab/setting_asreproastable_user.png)

This is a misconfiguration that still exists in real environments, usually on legacy service accounts or accounts that were set up that way for a specific application and never cleaned up.

## Sysmon + Wazuh Agent Enrollment

With the domain built and attack targets in place, the next step was getting visibility before touching the attack phase. Running attacks before your logging is confirmed is how you end up with incomplete evidence and detection rules that don't fire the way you expect.

I deployed Sysmon on both the DC and the workstation using [SwiftOnSecurity's config](https://github.com/SwiftOnSecurity/sysmon-config). This config is well-maintained and covers the event types that matter most for this lab: process creation, network connections, file creation, and registry modifications.

Both machines were then enrolled as Wazuh agents.

![Wazuh dashboard showing both agents active](/assets/images/ad-attack-lab/showing_wazuh_agents_connected.png)

The Wazuh dashboard shows both agents active — the Windows Server 2022 DC and the Windows 10 workstation — both reporting in and healthy.

## Baseline Check: Confirming Logs Flow Before Attacking

Before running any attacks, I verified that security events were actually landing in Wazuh as expected. The specific check was Event ID 4769 — Kerberos service ticket requests — which is the primary detection target for Kerberoasting. If that event doesn't show up cleanly in Wazuh, the detection rules won't have anything to trigger on.

![Event ID 4769 appearing in Wazuh Discover](/assets/images/ad-attack-lab/testing_wazuh_security_event.png)

The Wazuh Discover view shows a 4769 event with the expected fields: account name, service name, ticket encryption type. The log pipeline is working. The lab is ready.

## What's Next

With the environment verified, the next phase is the attack execution — password spray, Kerberoasting, AS-REP Roasting, Pass-the-Hash, and DCSync — all run from Kali, each one confirmed in Wazuh before moving to the next. After that, detection engineering: writing Wazuh rules from the raw logs, mapping to MITRE ATT&CK, and testing them against re-run attacks.
