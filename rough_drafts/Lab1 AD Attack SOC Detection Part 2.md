# AD Attack Lab (Part 2) - Running the Attacks

In Part 1, I built the lab — the domain, the user accounts, the vulnerable configurations, and the logging pipeline. Everything was verified before a single attack ran. This post is where things get interesting.

I'll walk through five attacks that follow a realistic attacker progression: starting with reconnaissance-style credential testing, escalating to stealthy ticket abuse, and finishing with full domain compromise. After each attack, I'll show what it looked like in Wazuh — because that's the whole point. The goal isn't just to run the attacks. It's to see exactly what a SOC analyst would see on the other side.

## Attack 1: Password Spraying

### What It Is

Password spraying is one of the first things an attacker does when they've identified valid usernames in a domain. Instead of hammering one account with many passwords (which triggers lockouts), they try one or two common passwords across every account in the organization. It's slow, quiet, and effective — especially against environments where users choose predictable passwords.

Think of it like a burglar trying the same master key on every door in a building rather than picking one lock repeatedly.

### Running the Attack

I had two wordlists ready: a list of domain usernames (`users.txt`) harvested from the domain, and a short password list (`pass.txt`) with a handful of common corporate-style passwords including `Winter2026!`.

![Password wordlists prepared for the spray](/assets/images/ad-attack-lab/password_spraying_lists.png)

I ran the spray twice — first with `kerbrute`, which tests passwords against Kerberos directly, and then with `netexec` over SMB. Both tools are commonly used in real engagements.

![Kerbrute password spray — valid credentials found](/assets/images/ad-attack-lab/kerbrute_password_spray.png)

Kerbrute confirmed a valid credential hit. The password `Winter2026!` belonged to a real domain account.

![Netexec SMB spray showing failed logon responses](/assets/images/ad-attack-lab/netexec_smb_password_spray.png)

The netexec output shows a wall of `STATUS_LOGON_FAILURE` responses — exactly what a spray looks like at the protocol level.

### What Wazuh Saw

Every failed logon attempt generates a Windows security event. Wazuh picked up the spike immediately.

![Wazuh showing Event ID 4625 failed logon spike](/assets/images/ad-attack-lab/wazuh_failed_login_attempts.png)

Event ID **4625** is a failed logon. A handful of these is normal. Dozens across multiple accounts in a short window is a spray. Wazuh logged 28 hits from the DC in a tight timeframe — a clear pattern.

The Kerberos-specific failures showed up separately.

![Wazuh showing Event ID 4771 Kerberos pre-auth failures](/assets/images/ad-attack-lab/wazuh_kerb_pre_auth_failed_logs.png)

Event ID **4771** is a Kerberos pre-authentication failure — the Kerberos equivalent of a wrong password. 27 hits. Same tight window. Same story.

A detection rule keying on rapid 4625/4771 spikes from a single source IP would catch this in a real environment.

## Attack 2: Kerberoasting

### What It Is

Kerberoasting takes advantage of how Kerberos — Windows' authentication protocol — handles service accounts. Any authenticated domain user can request a ticket to "talk to" a service. That ticket is encrypted using the service account's password hash. If the account uses an older, weaker encryption type (RC4, identified by `0x17`), an attacker can take that ticket offline and crack it with a password cracker like `hashcat` — no further access to the domain required.

The attack is popular because it requires no special privileges and generates activity that looks like normal service access at first glance.

### Running the Attack

Before running the attack, I mapped the DC's IP to `corp.local` in Kali's hosts file so the tooling could resolve the domain correctly.

![/etc/hosts updated with corp.local mapping](/assets/images/ad-attack-lab/etc_hosts_update.png)

Then I used `GetUserSPNs.py` from the Impacket toolkit, authenticated as a low-privileged domain user, to enumerate all accounts with Service Principal Names registered. These are the Kerberoasting targets.

![GetUserSPNs output showing svc_sql and svc_backup](/assets/images/ad-attack-lab/kerberoast_svc_sql_user.png)

Both `svc_sql` and `svc_backup` showed up — exactly the two accounts I set up in Part 1. The tool automatically requested their service tickets and wrote the hashes to a file.

![TGS hashes dumped to kerb_hashes.txt](/assets/images/ad-attack-lab/kerberoast_hashes.png)

Those long strings are Kerberos service ticket hashes. Taken offline to `hashcat`, they crack against a wordlist — and since `svc_sql` was using `Winter2026!`, it would crack in seconds using a rule file and `rockyou.txt`.

### What Wazuh Saw

The smoking gun for Kerberoasting is Event ID **4769** — a Kerberos service ticket request — combined with a ticket encryption type of `0x17` (RC4). Modern environments use AES encryption (`0x12` or `0x11`). RC4 requests stand out.

![Wazuh event detail: 4769, svc_sql, ticketEncryptionType 0x17](/assets/images/ad-attack-lab/kerberoast_svc_sql_proof.png)

There it is: `targetUserName: svc_sql@CORP.LOCAL`, `ticketEncryptionType: 0x17`, Event ID `4769`. This is the exact fingerprint of a Kerberoasting attempt.

![Wazuh filtered on 4769 with RC4 encryption type](/assets/images/ad-attack-lab/wazuh_kerberoasting_logs.png)

Wazuh pulled 7 matching events. A detection rule filtering for 4769 where the encryption type is `0x17` and the service name doesn't end in `$` (which filters out normal computer account traffic) would alert on this cleanly.

## Attack 3: AS-REP Roasting

### What It Is

AS-REP Roasting targets a specific misconfiguration: accounts with "Do not require Kerberos preauthentication" enabled. Pre-authentication is a security check that forces the client to prove they know the password before Kerberos will respond. When it's disabled, anyone can request an authentication response for that account without credentials — and the response contains a hash that can be cracked offline.

It's a quieter variant of Kerberoasting that targets user accounts rather than service accounts.

### Running the Attack

I used `GetNPUsers.py` from Impacket, which automatically scans for accounts with pre-auth disabled and requests their AS-REP hashes.

![GetNPUsers output — asimmons hash captured](/assets/images/ad-attack-lab/as-rep_roasting_spray.png)

Most accounts returned errors ("doesn't have UF_DONT_REQUIRE_PREAUTH set"), but `asimmons` — the account I configured in Part 1 — handed over its hash without any credentials required.

### What Wazuh Saw

AS-REP Roasting generates Event ID **4768** — a Kerberos authentication ticket request. The tell is the same `0x17` encryption type combined with a user account (not a service account).

![Wazuh event detail: 4768, asimmons, ticketEncryptionType 0x17](/assets/images/ad-attack-lab/asimmons_asrep_roast.png)

`targetUserName: asimmons`, `ticketEncryptionType: 0x17`, Event ID `4768`. Same encryption fingerprint as Kerberoasting, different event ID, targeting a user account instead of a service account.

![Wazuh showing AS-REP roasting event pattern](/assets/images/ad-attack-lab/wazuh_as-rep_roasting_logs.png)

A detection rule on 4768 with `0x17` encryption would catch this — and in a well-tuned environment, any 4768 event with RC4 from an unexpected source is worth investigating.

## Attack 4: Pass-the-Hash

### What It Is

Once an attacker has an NTLM hash — which is how Windows stores and transmits passwords internally — they don't always need to crack it. They can use the hash directly to authenticate as that user across the network. This is called Pass-the-Hash, and it's one of the reasons credential dumping is so dangerous: you don't need the plaintext password to move laterally.

### Running the Attack

The cracked password from Kerberoasting was `Winter2026!`. I converted it to its NTLM hash directly in Python to simulate having obtained it through a dump rather than cracking.

![Python converting Winter2026! to NTLM hash](/assets/images/ad-attack-lab/generating_hash_for_pth.png)

The resulting hash `186f5176db2c519a7b29b47a5437a4ad` is all that's needed. I passed it to `netexec` targeting the domain controller over SMB.

![Netexec Pass-the-Hash authentication success against the DC](/assets/images/ad-attack-lab/pass_the_hash_proof.png)

Successful authentication to the DC as a compromised user — no password typed, no cracking required in this scenario.

### What Wazuh Saw

Pass-the-Hash over the network generates Event ID **4624** (successful logon), but with two specific characteristics: Logon Type 3 (network logon) and the authentication package `NTLM` rather than Kerberos. The NTLM logon from a network source with no linked logon ID is a consistent indicator.

![Windows Event Log: Logon Type 3, account ebrooks, CORP domain](/assets/images/ad-attack-lab/pth_user_logon.png)

The event shows Logon Type 3 for account `ebrooks` — a network logon. Legitimate network logons happen constantly in AD environments, but the NTLM authentication package in a Kerberos-capable domain is the flag.

![Wazuh showing Event 4624 with NtLmSsp highlighted](/assets/images/ad-attack-lab/pth_wazuh_results.png)

Wazuh captured 13 matching events. The `NtLmSsp` logon process highlighted in the results is the specific indicator. A detection rule combining Event 4624, Logon Type 3, and `LogonProcessName: NtLmSsp` from a workstation or server (not a DC-to-DC logon) is a solid Pass-the-Hash detection starting point.

## Attack 5: DCSync

### What It Is

DCSync is the endgame. Domain Controllers in an Active Directory environment regularly sync password data between each other using a legitimate Windows replication protocol. DCSync abuses this — an attacker with the right domain privileges can impersonate a DC and request that replication data, which includes the NTLM hashes of every user in the domain, including the `Administrator` account. It's full domain compromise.

To pull this off, the attacker needs an account with replication privileges. In a real breach, this is earned gradually. In the lab, I added `asimmons` (the AS-REP Roasted account) to Domain Admins to simulate a privilege escalation scenario.

![asimmons added to Domain Admins group](/assets/images/ad-attack-lab/asimmons_da_privilege.png)

### Running the Attack

With `asimmons` as a Domain Admin, I ran `secretsdump.py` from Impacket, authenticated as `asimmons` using the cracked password.

![secretsdump.py DCSync output dumping domain hashes](/assets/images/ad-attack-lab/dcsync_attack_kali.png)

The output is a full dump of every account's NTLM hash in the domain — `Administrator`, `svc_sql`, `svc_backup`, every user. With the `Administrator` hash, an attacker can authenticate to any machine in the domain. The environment is fully compromised.

### What Wazuh Saw

DCSync activity leaves a trace in the Windows Directory Services event log. Event ID **4662** fires when an object in Active Directory is accessed with specific replication permissions. The relevant GUIDs identify replication operations: `1131f6aa` and `1131f6ad` (DS-Replication-Get-Changes and DS-Replication-Get-Changes-All).

![Wazuh showing Event 4662 for asimmons with replication GUIDs](/assets/images/ad-attack-lab/wazuh_dcsync_attack_logs.png)

Wazuh returned 396 events tied to `asimmons` performing directory replication access. A detection rule on Event 4662 filtered to those specific GUIDs, where the subject account is not a known DC computer account, is the standard DCSync detection.

## What's Next

Five attacks, five detection signals, all confirmed in Wazuh. The next phase is turning those signals into proper detection rules — writing the Wazuh XML, testing each rule fires on the attack and doesn't fire on normal traffic, and mapping everything to the MITRE ATT&CK framework. That's where the SOC analyst work really begins.
