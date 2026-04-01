---
title: Lab Roadmap
layout: single
permalink: /lab-roadmap/
toc: true
toc_sticky: true
---

This is a working roadmap for building portfolio artifacts targeted at SOC Analyst and Cybersecurity Analyst roles. Every lab follows the same pipeline: **generate realistic attack telemetry → detect and tune in Wazuh → perform forensic investigation → document like an analyst on the clock**.

Offensive techniques are the means, not the goal. The goal is the detection rule, the IR report, the investigation narrative.

Labs are ordered by interview frequency and hiring signal. Do them in sequence.

---

## Lab 1: Active Directory Attack → SOC Detection → Windows Forensics

**Why this is first:** AD attacks show up in virtually every SOC interview. Kerberoasting, Pass-the-Hash, and event log forensics are table stakes questions for Tier 1 and Tier 2 roles. This lab also directly leverages your existing Wazuh stack and gives you a GitHub repo with actual detection content — not just screenshots.

### Infrastructure

| Component | Spec | Purpose |
|---|---|---|
| Windows Server 2022 | 4 GB RAM, 60 GB disk | Domain Controller (`corp.local`) |
| Windows 10 (22H2) | 4 GB RAM, 60 GB disk | Victim workstation, domain-joined |
| Kali Linux | 4 GB RAM, 40 GB disk | Attacker |
| Wazuh (existing) | — | SIEM + detection |

Network: all VMs on an isolated internal network, Wazuh reachable from the domain-joined machines. Sysmon deployed on the DC and workstation before any attacks run.

### Phase 1: Lab Build

1. Spin up Windows Server 2022. Promote to DC, create domain `corp.local`.
2. Create a realistic OU structure: `IT`, `Finance`, `HR`. Populate with 10–15 dummy user accounts. Assign weak passwords to at least 3 users (e.g. `Summer2024!`). Give two accounts SPNs (for Kerberoasting targets). Leave one account with `Do not require Kerberos preauthentication` (for AS-REP Roasting).
3. Join the Windows 10 VM to the domain. Log in as a domain user, run normal browsing/file activity.
4. Install Sysmon on both Windows machines using SwiftOnSecurity's config. Enroll both as Wazuh agents.
5. Baseline: confirm logs are flowing. Verify you can see logon events, process creation, and network connections in Wazuh before touching the attack phase.

### Phase 2: Attack Execution

Run each attack from Kali. After each one, **stop and confirm the logs landed in Wazuh before moving on**. Document every command and every event ID you see.

1. **Password spray** (T1110.003): Use `crackmapexec` or `kerbrute` against the domain. Spray 3 passwords across all accounts. Target Event ID 4625 (failed logon) and 4771 (Kerberos pre-auth failure).
2. **Kerberoasting** (T1558.003): Use `GetUserSPNs.py` to request TGS tickets for SPN accounts. Crack offline with `hashcat`. Target Event ID 4769 (Kerberos service ticket request with RC4 encryption).
3. **AS-REP Roasting** (T1558.004): Use `GetNPUsers.py` to retrieve AS-REP hashes for the no-preauth account. Target Event ID 4768.
4. **Pass-the-Hash** (T1550.002): Use a cracked hash with `crackmapexec` or `impacket psexec` to authenticate as the compromised user. Target Event IDs 4624 (logon type 3), 4648.
5. **DCSync** (T1003.006): From a compromised privileged account, use `secretsdump.py` to dump NTLM hashes. Target Event ID 4662 (Directory Service access on specific GUIDs) and 4742.

### Phase 3: Detection Engineering

For each attack phase:

1. Identify the event IDs and log sources that fire. Pull the raw logs from Wazuh.
2. Write a Wazuh custom rule in XML that fires on the specific pattern. Start broad, then tune to reduce false positives. Document every tuning decision and why.
3. Map the rule to its MITRE ATT&CK technique. Build an ATT&CK Navigator heatmap of your coverage.
4. Test: re-run the attack and confirm the rule fires. Run benign activity and confirm it does not.

Rule-writing notes: Kerberoasting rule should key on Event 4769 where `TicketEncryptionType = 0x17` (RC4) and `ServiceName` does not end in `$`. DCSync rule should key on Event 4662 with `ObjectType` matching the DS-Replication GUIDs.

### Phase 4: Windows Forensic Investigation

Pretend you are an analyst who just received the alerts and needs to reconstruct what happened. Disconnect the attacker. Do not look at your own attack notes — work from the evidence.

1. Pull Windows Event Logs from both machines (Security, System, PowerShell, Sysmon).
2. Use **Eric Zimmerman's tools**: `EvtxECmd` to parse logs into CSV, `Timeline Explorer` to build a unified timeline across all sources.
3. Reconstruct the attacker's timeline: first action, lateral movement, privilege escalation, exfiltration attempt.
4. Identify attacker artifacts: prefetch files (if any), registry run keys, scheduled tasks, dropped files.
5. Identify patient zero (which account was first compromised, from which IP).

### Deliverables

**GitHub repo** (`ad-detection-lab`):
```
/detection-rules/      ← Wazuh XML rules, one file per tactic
/attack-playbook/      ← commands used, mapped to Event IDs
/forensics/            ← EZ tools output, timeline CSV
/mitre-coverage/       ← ATT&CK Navigator JSON export
README.md              ← lab setup guide
```

**Blog post 1** — Detection Engineering: How you built the rules, what each event ID means, one alert firing with a screenshot. Frame it as: "here's how a SOC analyst would detect Kerberoasting before it's too late."

**Blog post 2** — Forensic Investigation: The timeline reconstruction. Walk through the evidence chain from first failed logon to DCSync. Use your Eric Zimmerman output as the narrative anchor.

**Incident Report** — A properly formatted IR document (Executive Summary, Timeline, Technical Findings, Containment & Remediation, Lessons Learned). This is the artifact you hand to an interviewer.

### Interview talking points
- "I built and attacked an AD environment, then wrote the detection rules myself — here's what fires and why."
- "Walk me through how Kerberoasting works and how you detect it." ← You have a direct answer with evidence.
- "Tell me about a time you investigated a security incident." ← Use the forensics phase.

---

## Lab 2: Malware Triage → Detection Engineering → Memory Forensics

**Why this is second:** Malware triage is among the most commonly assessed skills for SOC analysts. "What would you do if a user submitted a suspicious file?" is a near-universal interview question. This lab produces detection content (YARA + Wazuh rules), a memory forensics artifact, and a threat intel report — all things interviewers want to see.

### Infrastructure

| Component | Spec | Purpose |
|---|---|---|
| FlareVM (Windows 10) | 4 GB RAM, 60 GB disk, no internet | Static + dynamic analysis |
| REMnux (Ubuntu) | 2 GB RAM, 40 GB disk | Linux-side analysis, YARA, network simulation |
| Wazuh (existing) | — | Rule testing |

Network: FlareVM on a completely isolated network — no internet routing, no host bridging. REMnux can simulate C2 responses using `INetSim` so the malware has something to talk to.

### Phase 1: Sample Acquisition and Setup

1. From MalwareBazaar, download a **AsyncRAT** or **Agent Tesla** sample (both are commodity RATs that SOC analysts encounter constantly). Save the hash before touching anything else.
2. On FlareVM, disable Windows Defender and any AV. Take a VM snapshot labeled "clean baseline."
3. On REMnux, start `INetSim` to simulate DNS, HTTP, and SMTP. Configure FlareVM's DNS to point at REMnux.

### Phase 2: Static Analysis

1. **Hashing**: Record MD5, SHA-1, SHA-256. Look up on VirusTotal (from your host machine — not the analysis VM).
2. **pestudio**: Load the binary. Document: file type, compiler artifact, compilation timestamp (check if it's forged), imported functions (look for `VirtualAlloc`, `CreateRemoteThread`, `WriteProcessMemory`, `WinExec` — all process injection indicators), strings (look for IPs, domains, registry keys, encoded blobs).
3. **capa**: Run against the binary (`capa.exe <sample> -v`). Normally it maps capabilities to ATT&CK automatically. **Note:** If the binary is AutoIt-compiled (common with Agent Tesla samples), capa will warn that it cannot analyze AutoIt scripts and will produce no ATT&CK technique mappings — this is expected behavior, not a tool failure. Document the AutoIt detection as a finding (T1027.002 — Software Packing/obfuscation), then manually map the behavioral indicators you found in pestudio to ATT&CK techniques. The manual mapping is more valuable in a report because it demonstrates you understand why each technique applies.
4. **FLOSS**: Extract obfuscated strings that pestudio might miss.
5. Document everything: file metadata, suspicious imports, suspicious strings, capa findings.

### Phase 3: Dynamic Analysis

1. Start `Procmon` and `Wireshark` on FlareVM. Set Procmon filters to the malware's process name.
2. Execute the malware. Let it run for 5 minutes.
3. Stop and document:
   - **Process tree**: Did it spawn child processes? Inject into other processes?
   - **File system**: What files did it create/modify? Where? (Common: `%AppData%`, `%Temp%`)
   - **Registry**: What keys did it write? (Common: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` for persistence)
   - **Network**: What did it contact? Use Wireshark to capture C2 traffic. Export the PCAP.
4. Look at REMnux INetSim logs to see what the malware tried to reach out to.

### Phase 4: Detection Content

1. **YARA rule**: Write a rule based on unique strings, byte patterns, or import combinations you found. Test it against the sample using `yara` on REMnux.
2. **Wazuh detection rules**: Write rules triggered by the behavioral IOCs — the specific registry key it wrote, the file path it dropped to, the child process name it spawned. Deploy to your Wazuh instance and confirm they fire when the sample runs again.
3. **IOC list**: Compile a CSV: file hashes, C2 IPs/domains, registry keys, file paths, mutexes (if any).

### Phase 5: Memory Forensics

1. While the malware is running (or shortly after), take a memory dump of the infected process using `procdump` or `RAMMap`.
2. On REMnux, use **Volatility 3** to analyze:
   - `windows.pstree` — process relationships
   - `windows.malfind` — memory regions with execute permission that were written at runtime (injection indicator)
   - `windows.cmdline` — command-line arguments
   - `windows.netscan` — active network connections at time of dump
3. If process injection is present (it will be for most RATs), document the injected region and attempt to extract the shellcode.

### Deliverables

**GitHub repo** (`malware-triage-asyncrat`):
```
/static-analysis/      ← pestudio screenshots, capa output, FLOSS strings
/dynamic-analysis/     ← procmon CSV export, Wireshark PCAP, INetSim logs
/detection/            ← YARA rule (.yar), Wazuh rules (.xml)
/memory-forensics/     ← Volatility outputs, extracted shellcode (if applicable)
/iocs/                 ← iocs.csv
README.md              ← analysis walkthrough
```

**Threat Intelligence Report** — A one-to-two page document covering: malware family, capabilities (mapped to ATT&CK), IOCs, detection recommendations. Format it like a real TI report (executive summary + technical detail). This is a direct portfolio artifact.

**Blog post** — Frame it as: "A suspicious executable was submitted to the SOC — here's how I triaged it." Walk through static → dynamic → memory forensics. Don't just describe what you did; explain *why* you look at each artifact and what it tells you.

### Interview talking points
- "Tell me about your malware analysis experience." ← Walk through this lab step by step.
- "What tools would you use to triage a suspicious file?" ← You have a real answer with real output.
- "What is process injection and how do you detect it?" ← You found it in Volatility, you wrote the rule.

---

## Lab 3: Network Intrusion → PCAP Forensics → IDS Rule Writing

**Why this is third:** Wireshark and PCAP analysis are tested constantly in SOC interviews, often as a live exercise. "Here's a PCAP, tell me what happened" is a real screening technique. This lab produces a PCAP, a Suricata ruleset, and an investigation report all sourced from traffic you generated yourself — which means you understand every byte of it.

### Infrastructure

| Component | Spec | Purpose |
|---|---|---|
| Kali Linux | 4 GB RAM | Attacker |
| Ubuntu 22.04 (victim) | 2 GB RAM, 30 GB disk | Victim server, running Metasploitable3 or DVWA |
| Wazuh (existing) | — | Suricata integration + alerting |

Network: isolated segment. Run `tcpdump` or Wireshark capture on the victim NIC for the full duration of the attack.

### Phase 1: Capture Setup

1. Build or use an existing vulnerable target. Metasploitable3 (Ubuntu build) works well — it has multiple real-looking services. Alternatively, spin up a VM with DVWA + OpenSSH + an FTP service.
2. On the victim, start a packet capture: `tcpdump -i eth0 -w intrusion-lab.pcap`
3. Confirm Suricata is installed and reporting into Wazuh. Test with a benign ping before starting.

### Phase 2: Staged Attack

Execute the attack in realistic phases. Take timestamps at the start of each phase.

1. **Reconnaissance** (T1046): Run `nmap -sV -sC -p-` against the victim. Also run `nikto` if there's a web service.
2. **Exploitation** (varies): Choose one: exploit an unpatched service on Metasploitable3 (e.g., vsftpd backdoor, Shellshock, SMB exploit), or exploit a web vuln in DVWA (SQLi to get credentials, then SSH in with those creds). The goal is a shell.
3. **Post-exploitation / C2 simulation** (T1059): From your shell, run a few commands: `whoami`, `id`, `hostname`, `cat /etc/passwd`. Then create a cron job for persistence (T1053.003). Then simulate data exfiltration by `curl`-ing a large file to your Kali machine.
4. Stop the capture.

### Phase 3: PCAP Forensic Analysis

Open `intrusion-lab.pcap` in Wireshark and answer these questions from the evidence only — no notes from Phase 2:

1. What was the first packet from the attacker? What did reconnaissance look like in the traffic?
2. Which port/service was exploited? What does the exploit traffic look like at the packet level?
3. What commands did the attacker run post-exploitation? (If unencrypted, you can see them in follow → TCP stream.)
4. What data was exfiltrated? To where?
5. Build a complete timeline with timestamps.

Document your methodology: which Wireshark filters you used, how you followed streams, how you identified the exploit traffic.

### Phase 4: IDS Rule Writing

Write Suricata rules for each attack phase:

1. **Port scan rule**: alert on a single source hitting >20 distinct ports in under 5 seconds.
2. **Exploit-specific rule**: write a content-match rule for the specific exploit payload you used. If it's vsftpd backdoor (contains `:)` in username), write a rule matching that string on port 21.
3. **Data exfiltration rule**: alert on large outbound transfers from an internal host to an external IP (threshold by bytes if possible).
4. **Post-exploitation rule**: alert on suspicious command strings in unencrypted sessions.

Integrate all rules into Wazuh. Re-replay the capture with `tcpreplay` (or re-run the attack) and confirm alerts fire.

### Deliverables

**GitHub repo** (`network-forensics-lab`):
```
/pcaps/                ← intrusion-lab.pcap (sanitize any real IPs if needed)
/suricata-rules/       ← custom.rules, one rule per attack phase
/analysis/             ← Wireshark filter notes, stream exports
README.md              ← lab setup + attack scenario description
```

**Investigation Report** — Written as if you were an analyst assigned the ticket: "Suspicious outbound traffic flagged from 192.168.x.x." Cover: initial triage (what alerted), PCAP investigation methodology, findings (attack timeline, TTPs, IOCs), containment recommendations.

**Blog post** — "I captured an entire intrusion in a PCAP — here's how to read it." Walk through the Wireshark analysis methodology. This is directly useful to other analysts and signals interview-readiness.

### Interview talking points
- "Can you analyze a PCAP?" ← You have done this, you know the workflow cold.
- "What Wireshark filters do you use for intrusion analysis?" ← You have real answers.
- "How do you write Suricata/Snort rules?" ← You have a ruleset with documented reasoning.

---

## Lab 4: Phishing Chain → Sysmon Endpoint Investigation → Full IR Report

**Why this is fourth:** Phishing is the initial access vector in the majority of real incidents. SOC analysts spend a large portion of their day triaging phishing-related alerts. This lab produces a complete IR report — executive summary, timeline, technical findings, containment steps — which is the single most credible portfolio artifact you can show a hiring manager.

### Infrastructure

| Component | Spec | Purpose |
|---|---|---|
| Windows 10 (22H2) | 4 GB RAM, 60 GB disk | Victim endpoint |
| Kali Linux | 2 GB RAM | Attacker / C2 simulation |
| Wazuh (existing) | — | SIEM, Sysmon log collection |

Sysmon must be deployed with a comprehensive config (SwiftOnSecurity or Olaf Hartong's modular config). This is non-negotiable — Sysmon event IDs are the primary evidence source for this lab.

### Phase 1: Build the Phishing Artifact

Create a realistic attack chain. The goal is not a novel technique — it's a believable artifact that generates rich Sysmon telemetry.

Choose one delivery method:
- **Option A (macro doc)**: Create a Word document with a malicious macro that on-open runs a PowerShell one-liner. The PowerShell downloads a staged payload from your Kali listener (can be a reverse shell, or just a batch script that simulates post-exploitation activity).
- **Option B (.lnk file)**: Create a .lnk shortcut with a target of `powershell.exe -w hidden -enc <base64-payload>`. Deliver via a zip archive.

The payload should: establish persistence (add a registry run key), make a few simulated "phone-home" HTTP requests to your Kali machine, and drop a file to `%AppData%`.

Keep it simple. The complexity is in the detection and investigation, not the payload.

### Phase 2: Detonation and Telemetry Collection

1. On the victim machine, confirm Wazuh agent is connected and Sysmon logs are flowing.
2. Simulate phishing: open the document / execute the .lnk. Watch it execute.
3. Let the payload run for 5 minutes (simulating dwell time).
4. Stop. Export Sysmon logs: `wevtutil epl Microsoft-Windows-Sysmon/Operational sysmon.evtx`

### Phase 3: Endpoint Investigation

Investigate using **only** the Sysmon/Wazuh logs — as if you received them as a ticket.

Key Sysmon event IDs to trace:
- **Event 1** (Process Create): which process created which. Trace: `winword.exe` → `powershell.exe` → any child processes.
- **Event 3** (Network Connection): outbound connections from PowerShell or the payload process. Destination IP, destination port, timestamp.
- **Event 11** (File Create): files dropped by the payload. Path, timestamp, creating process.
- **Event 13** (Registry Value Set): persistence mechanism. Which key, which value, which process.
- **Event 7** (Image Load): DLLs loaded into the payload process (check for suspicious unsigned DLLs).

Build a timeline: T+0 document opened → T+X PowerShell spawned → T+X payload executed → T+X persistence written → T+X C2 connection.

### Phase 4: Detection Rules

Write Wazuh rules for the behaviors you observed:

1. **Office spawning PowerShell**: alert when `winword.exe`, `excel.exe`, or `outlook.exe` creates a child process of `powershell.exe` or `cmd.exe`. (Sysmon Event 1, `ParentImage` contains Office app, `Image` contains powershell)
2. **Encoded PowerShell**: alert on `powershell.exe` process creation where `CommandLine` contains `-enc` or `-EncodedCommand`.
3. **Registry run key write**: alert on Sysmon Event 13 where `TargetObject` contains `\CurrentVersion\Run`.
4. **PowerShell outbound connection**: alert on Sysmon Event 3 where `Image` is `powershell.exe` and `Initiated = true`.

Test each rule. Document false-positive risk and any tuning applied.

### Phase 5: Incident Report

Write the formal IR report as if this were a real incident at a company. Use NIST SP 800-61 structure:

**1. Executive Summary** (1 paragraph, non-technical): what happened, what was affected, what was done.

**2. Incident Timeline**: timestamp table of every attacker action from initial access to detection.

**3. Technical Findings**:
- Initial Access: phishing email, artifact description
- Execution: how the payload ran, which processes were involved
- Persistence: what mechanism, where, how it would survive a reboot
- Command & Control: destination IP/domain, protocol, observed traffic
- Impact: what data/systems were affected (even if simulated)

**4. Containment & Remediation**:
- Immediate: isolate the host, reset affected account, block C2 IP at firewall
- Short-term: scan environment for similar artifacts using the IOCs
- Long-term: deploy email filtering for macro-enabled docs, enable Attack Surface Reduction rules in Windows Defender

**5. Lessons Learned**: what detection was missing, what would have caught this earlier.

### Deliverables

**GitHub repo** (`phishing-ir-lab`):
```
/artifacts/            ← phishing artifact (sanitized/defanged), payload (defanged)
/sysmon-logs/          ← exported .evtx or parsed CSV
/detection-rules/      ← Wazuh XML rules
/sysmon-config/        ← sysmonconfig.xml used
README.md              ← lab setup and scenario description
```

**Incident Report (PDF)** — This is your flagship artifact. Format it professionally. This is the document you send with your resume, link from your blog, and walk through in interviews.

**Blog post** — "Triaging a Phishing Incident From Alert to IR Report." Walk through the investigation methodology and explain which Sysmon event IDs matter and why.

### Interview talking points
- "Walk me through how you'd respond to a phishing alert." ← You have a five-phase answer with documented evidence.
- "What is Sysmon and how do you use it for detection?" ← You deployed it, configured it, and built rules from it.
- "Can you write an incident report?" ← Yes, here's one.

---

## Cross-Cutting Deliverables

After completing all four labs, do the following once:

**1. Portfolio landing page** — Update this site with a "Labs" or "Projects" section that links to each GitHub repo and corresponding blog post. An interviewer should be able to find your detection rules and IR reports in under 30 seconds.

**2. Detection rules repository** — Consolidate all Wazuh rules, Suricata rules, and YARA rules into a single GitHub repo (`detection-content`). Add a README that maps each rule to its ATT&CK technique. This is the kind of artifact that signals a genuine detection engineer, not just someone who "used a SIEM."

**3. Resume update** — For each lab, add one bullet under your home lab experience. Format: what you did, what tool/technique, what artifact it produced. Example: *"Developed Wazuh detection rules for Kerberoasting and Pass-the-Hash, mapped to MITRE ATT&CK T1558.003 and T1550.002, validated against intentionally attacked AD lab environment."*

---

## What Not to Do

- Do not skip straight to writing the blog post before finishing the investigation. The investigation is the work. The blog post describes the work.
- Do not use automated tools to write your detection rules. Write them by hand from raw logs. Interviewers will ask how they work.
- Do not gold-plate the infrastructure. A single DC and one workstation is enough for Lab 1. Complexity adds friction; it doesn't add signal.
- Do not start Lab 2 before Lab 1 is fully documented and published. Partial labs produce zero portfolio value.
