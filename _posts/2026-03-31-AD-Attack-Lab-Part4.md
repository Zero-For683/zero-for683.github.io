---
title: "AD Attack Lab (Part 4) - Windows Forensic Investigation"
categories:
  - detection-engineering
tags:
  - active-directory
  - detection-engineering
  - windows-forensics
  - wazuh
  - sysmon
  - eric-zimmerman
  - timeline-analysis
  - incident-response
  - soc
---

Parts 1 through 3 covered the attack side. This one is the investigation.

Five alerts fired in Wazuh. The ticket is assigned. The only resources are the logs and the tools. No notes from the attack phase, no memory of what ran. Just the event logs from two Windows machines and the question of what actually happened.

This post walks through the full forensic reconstruction using Eric Zimmerman's EvtxECmd and Timeline Explorer, working from raw Windows event logs exported from both machines. The goal is a complete, evidence-backed attack timeline with real timestamps.

## Step 1 — Exporting the Logs

The first step on the Domain Controller was exporting the Security, System, and Sysmon event logs to `.evtx` files, then pulling the same set from the Windows 10 workstation. The exports were copied to the analysis machine over an SMB share.

![Six evtx files downloaded from both machines](/assets/images/ad-attack-lab/forensic-evtx-files-downloaded.png)

Six files total, three from each machine. The DC Security log is the main source of evidence for this attack chain since all the attacker's activity touched the DC directly.

## Step 2 — Parsing with EvtxECmd

Raw `.evtx` files aren't easy to work with. Eric Zimmerman's EvtxECmd converts them to clean, structured CSV files that Timeline Explorer can ingest. The tool is part of the EZ Tools suite, downloaded using the `Get-ZimmermanTools.ps1` script.

![Get-ZimmermanTools downloading the EZ Tools suite](/assets/images/ad-attack-lab/forensic-eztools-download.png)

EvtxECmd was run against each file individually:

```powershell
.\EvtxECmd.exe -f DC_Security.evtx --csv C:\Analysis --csvf DC_Security.csv
.\EvtxECmd.exe -f DC_Sysmon.evtx --csv C:\Analysis --csvf DC_Sysmon.csv
.\EvtxECmd.exe -f W10_Security.evtx --csv C:\Analysis --csvf W10_Security.csv
.\EvtxECmd.exe -f W10_Sysmon.evtx --csv C:\Analysis --csvf W10_Sysmon.csv
```

![Four CSV files produced by EvtxECmd](/assets/images/ad-attack-lab/forensic-evtxecmd-csv-output.png)

Four CSVs. The DC Security log alone parses to over 13 MB of structured event data. Everything is now queryable.

## Step 3 — Loading Timeline Explorer

Both DC Security CSVs were loaded into Timeline Explorer simultaneously, giving a unified chronological view across all log sources. Every event from both machines, sorted by timestamp, in one place.

![Timeline Explorer loaded with both Security CSVs](/assets/images/ad-attack-lab/forensic-timeline-explorer-loaded.png)

From here, the investigation is a matter of applying Event ID filters one at a time and following the evidence forward.

## The Investigation

### Event ID 4771 — Kerberos Pre-Auth Failures (First Contact)

The first filter applied was 4771, Kerberos pre-authentication failures. This is what Kerbrute generates when it sprays domain accounts over Kerberos.

![Timeline Explorer — 4771 events showing first timestamp 21:32:45](/assets/images/ad-attack-lab/forensic-4771-first-timestamp.png)

The earliest cluster appears at **2026-03-30 21:32:45**. This is the first recorded hostile activity in the logs.

The payload columns confirm the scope: every domain account was hit, all from the same source.

![4771 payload — target accounts and source IP 192.168.93.156](/assets/images/ad-attack-lab/forensic-4771-target-accounts.png)

Thirteen accounts targeted in the initial Kerberos spray: lrivera, dprice, ebrooks, gcoleman, nbennett, jperry, mturner, ehughes, hross, chayes, lfoster, mcooper, sward, all from **192.168.93.156**.

### Event ID 4625 — Failed NTLM Logons (SMB Spray)

The next filter was 4625, failed logons. This is what netexec generates when it sprays over SMB.

![Timeline Explorer — 4625 events showing first timestamp 21:44:20](/assets/images/ad-attack-lab/forensic-4625-first-timestamp.png)

First cluster at **2026-03-30 21:44:20**, twelve minutes after the Kerberos spray. The attacker ran both tools, targeting the same accounts across two different protocols.

![4625 payload — 15 target accounts from 192.168.93.156](/assets/images/ad-attack-lab/forensic-4625-target-accounts.png)

Fifteen accounts in the SMB spray, slightly wider than the Kerberos spray, same source IP. At this point in the investigation, 192.168.93.156 is confirmed as the attacker's machine.

### Event ID 4624 — Successful NTLM Logon (Pass-the-Hash)

Filtering on 4624 with LogonProcessName: NtLmSsp reveals the Pass-the-Hash activity. A Logon Type 3 (network logon) authenticating via NtLmSsp in a Kerberos-capable domain is the tell.

![Timeline Explorer — first 4624 NtLmSsp event at 21:44:07](/assets/images/ad-attack-lab/forensic-4624-first-timestamp.png)

First occurrence: **2026-03-30 21:44:07**, actually slightly before the 4625 SMB spray cluster, suggesting the tooling generated both failed and successful authentication attempts in the same sweep.

![4624 payload — multiple accounts, LogonType 3, NtLmSsp highlighted](/assets/images/ad-attack-lab/forensic-4624-ntlmssp-accounts.png)

The payload columns show multiple accounts targeted (asimmons, svc_sql, svc_backup, NT AUTHORITY\ANONYMOUS LOGON) with LogonType 3 and NtLmSsp as the logon process. The attacker had hashes and was authenticating with them directly.

### Event ID 4769 — Kerberos Service Ticket Request (Kerberoasting)

Filtering on 4769 with TicketEncryptionType RC4-HMAC isolates the Kerberoasting activity.

![4769 payload — svc_backup and svc_sql, TicketEncryptionType RC4-HMAC](/assets/images/ad-attack-lab/forensic-4769-kerberoast-accounts.png)

Two targets confirmed: `svc_backup` and `svc_sql`, both with `TicketEncryptionType: RC4-HMAC`. These are the service accounts with SPNs registered in Phase 1. Exactly what `GetUserSPNs.py` would request.

![Timeline Explorer — earliest 4769 events at 21:51:32](/assets/images/ad-attack-lab/forensic-4769-first-timestamp.png)

Earliest Kerberoasting request: **2026-03-30 21:51:32**, nineteen minutes after first contact. The attacker had already confirmed valid credentials from the spray before pivoting to ticket abuse.

### Event ID 4768 — Kerberos Auth Ticket Request (AS-REP Roasting)

Filtering on 4768 and looking for the "Logon without Pre-Authentication" preAuthType surfaces the AS-REP roasting event.

![4768 payload — target CORP.LOCAL\asimmons, ServiceName krbtgt](/assets/images/ad-attack-lab/forensic-4768-asimmons-target.png)

Target confirmed: `CORP.LOCAL\asimmons`, requesting a krbtgt service ticket, the AS-REP response.

![Timeline Explorer — 4768 event timestamp 2026-03-31 16:57:02](/assets/images/ad-attack-lab/forensic-4768-timestamp.png)

Timestamp: **2026-03-31 16:57:02**.

One thing worth noting here: this event is dated the following day, separate from the rest of the attack chain which ran on the evening of March 30. In a real investigation, that would raise a question immediately: did the attacker return, or is this a separate tool run? In this lab it reflects the Phase 3 detection rule testing re-run rather than the original attack session. It's a real forensic observation worth calling out.

![PreAuthType data — Logon without Pre-Authentication confirmed](/assets/images/ad-attack-lab/forensic-4768-preauthtype-context.png)

![Logon without Pre-Authentication entry isolated](/assets/images/ad-attack-lab/forensic-4768-no-preauth-confirmed.png)

The preAuthType field confirms it: `Logon without Pre-Authentication`, the misconfiguration on asimmons's account that made this attack possible.

### Event ID 4728 — Member Added to Privileged Group (Privilege Escalation)

Event 4728 fires when a user is added to a security-enabled global group. In this case, Domain Admins.

![4728 payload — asimmons added to Domain Admins group](/assets/images/ad-attack-lab/forensic-4728-asimmons-domain-admin.png)

The payload is unambiguous: `Target: CORP\Domain Admins`, `Member: CN=Ava Simmons, OU=Finance, DC=corp...`. asimmons was promoted to Domain Admin.

![Timeline Explorer — 4728 event at 23:52:18](/assets/images/ad-attack-lab/forensic-4728-timestamp.png)

Timestamp: **2026-03-30 23:52:18**, over two hours after first contact. The attacker spent that time working through the credential attacks before escalating.

### Event ID 4662 — Directory Replication (DCSync)

The final filter: 4662 events filtered to the DS-Replication GUIDs. The tell for DCSync isn't a single event. It's a tight burst of replication requests in a very short window.

![Timeline Explorer — burst of 4662 events beginning at 23:54:14](/assets/images/ad-attack-lab/forensic-4662-dcsync-burst.png)

The burst begins at **2026-03-30 23:54:14**, approximately two minutes after asimmons was elevated to Domain Admin. The attacker didn't wait.

![4662 payload — Operation performed on an object, repeated](/assets/images/ad-attack-lab/forensic-4662-operation-payload.png)

"Operation performed on an object" repeated across dozens of events. Each one is secretsdump.py pulling a portion of the domain's hash database. By the time the burst ends, every account hash in corp.local has been exfiltrated.

## Forensic Q&A

**1. What was the exact timestamp of the first hostile event?**
2026-03-30 21:32:45. Kerberos pre-authentication failures (Event 4771) from 192.168.93.156. The Kerberos spray preceded the SMB spray by twelve minutes.

**2. How many unique accounts were targeted in the spray?**
15 accounts across both spray methods: lrivera, dprice, ebrooks, gcoleman, nbennett, jperry, mturner, ehughes, hross, chayes, lfoster, mcooper, sward, asimmons, and sward. Every domain user was targeted.

**3. Which accounts were Kerberoasted? What encryption type?**
`svc_sql` and `svc_backup`. Both requested with `TicketEncryptionType: RC4-HMAC` (0x17), the weaker encryption type that makes offline cracking viable.

**4. Which account was AS-REP roasted?**
`asimmons` (CORP.LOCAL\asimmons). The preAuthType field shows "Logon without Pre-Authentication", confirming the misconfiguration that exposed her account.

**5. What IP address conducted all the attacks?**
192.168.93.156, present across every attack event: 4771, 4625, 4769, 4768, 4624, and 4662.

**6. What account was used for Pass-the-Hash? What was the logon process?**
Multiple accounts were targeted in the PtH sweep, including asimmons, svc_sql, and svc_backup. The logon process in every case was `NtLmSsp`, the indicator that distinguishes hash-based authentication from normal Kerberos logons on a domain network.

**7. When was asimmons elevated to Domain Admin? What event captures that?**
2026-03-30 23:52:18. Event ID **4728**, "A member was added to a security-enabled global group," with Target: CORP\Domain Admins and Member: CN=Ava Simmons.

**8. When did DCSync occur? How many 4662 events fired?**
The burst begins at 2026-03-30 23:54:14. The tight cluster of 4662 events visible in Timeline Explorer spans dozens of records, each one representing a portion of the directory replication pull from secretsdump.py.

**9. What is the total dwell time from first event to DCSync?**
From 2026-03-30 21:32:45 (first 4771) to 2026-03-30 23:54:14 (DCSync begins): **2 hours, 21 minutes, 29 seconds**.

**10. Was the Windows 10 workstation directly touched at any point?**
No. All hostile activity was directed from 192.168.93.156 straight to the DC. The W10 workstation logs show no indicators of compromise. Once valid credentials were obtained from the spray, the path to the DC was direct.

## Attack Timeline

| Timestamp | Source IP | Machine | Event ID | Description |
|---|---|---|---|---|
| 2026-03-30 21:32:45 | 192.168.93.156 | DC01 | 4771 | Password spray: Kerberos pre-auth failures across 13+ accounts |
| 2026-03-30 21:44:07 | 192.168.93.156 | DC01 | 4624 (Type 3, NtLmSsp) | Pass-the-Hash: NTLM network logons begin |
| 2026-03-30 21:44:20 | 192.168.93.156 | DC01 | 4625 | Password spray: failed NTLM logons across 15 accounts |
| 2026-03-30 21:51:32 | 192.168.93.156 | DC01 | 4769 | Kerberoasting: RC4-HMAC tickets requested for svc_sql, svc_backup |
| 2026-03-31 16:57:02 | 192.168.93.156 | DC01 | 4768 | AS-REP Roasting: asimmons, Logon without Pre-Authentication |
| 2026-03-30 23:52:18 | DC01 (local) | DC01 | 4728 | Privilege escalation: asimmons added to Domain Admins |
| 2026-03-30 23:54:14 | 192.168.93.156 | DC01 | 4662 | DCSync: full domain hash dump via directory replication |

**Total dwell time: 2 hours, 21 minutes, 29 seconds.**

## What This Lab Produced

Four parts. One complete attack chain, from reconnaissance spray to full domain compromise, with detection rules that fire on attacks and stay silent on normal traffic, and a forensic timeline built entirely from evidence.

The GitHub repo has everything: detection rules, attack playbook, MITRE ATT&CK coverage, and this investigation writeup. All of it built by hand from raw logs.
