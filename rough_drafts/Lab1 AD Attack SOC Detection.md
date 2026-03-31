# Phase 2

DCIP: 192.168.93.50
W10 IP: 192.168.93.155
Kali IP: 192.168.93.156
Domain: corp.local
![[etc_hosts_update.png]]
# Password spraying

![[password_spraying_lists.png]]


![[kerbrute_password_spray.png]]
![[netexec_smb_password_spray.png]]

![[wazuh_kerb_pre_auth_failed_logs.png]]![[wazuh_failed_login_attempts.png]]

# Kerberoasting

In order for kerberoasting AND asreproasting to work, we had to enable `logall` and `logall_json` which tells wazuh to write every event to `archives.json` regardless of rules. 

Then, we had to add rules for kerberos attacks. 4768 and 4769 alerts were arriving, but wazuh had no builkt in rules matching them specifically for attack patterns. So they were never indexed and never discoverable. 

Here is the alert:
``` (clean this code up)
<group name="windows,kerberos,attack"> <rule id="100100" level="12"> <if_sid>60103</if_sid> <field name="win.system.eventID">^4769$</field> <field name="win.eventdata.ticketEncryptionType">^0x17$</field> <description>Kerberoasting detected: RC4 ticket requested for $(win.eventdata.serviceName) by $(win.eventdata.targetUserName)</description> <mitre> <id>T1558.003</id> </mitre> </rule> <rule id="100101" level="14"> <if_sid>60103</if_sid> <field name="win.system.eventID">^4768$</field> <field name="win.eventdata.preAuthType">^0$</field> <description>AS-REP Roasting detected: Pre-auth not required for $(win.eventdata.targetUserName)</description> <mitre> <id>T1558.004</id> </mitre> </rule> </group>
```

```EXPLENATION
Most SIEMs (Splunk, Elastic/ELK, Microsoft Sentinel) work exactly how you described — ingest everything, let the analyst search and hunt freely. The indexer stores all logs and the analyst decides what's interesting.

Wazuh is architecturally different and somewhat unusual. It was originally built as a **HIDS (Host Intrusion Detection System)** — not a SIEM. Its primary design is rule-based alerting first, log storage second. So by default:

- Events that match a rule → `wazuh-alerts-*` → visible in Discover
- Events that don't match a rule → discarded entirely unless `logall_json: yes`

Even with `logall_json` enabled, the raw archives go into `wazuh-archives-*` which **isn't set up as a searchable index pattern by default** in the dashboard. So analysts effectively can't freely hunt across all logs without extra configuration.

The proper fix for your use case is two things:

**1. Add `wazuh-archives-*` as an index pattern** in Dashboard Management → Index Patterns, so you can search ALL logs freely regardless of rules.

**2. Keep building custom rules** for detections you want alerted on.
```


![[kerberoast_svc_sql_user.png]]
![[kerberoast_hashes.png]]

![[wazuh_kerberoasting_logs.png]]
![[kerberoast_svc_sql_proof.png]]


# Asreproasting

![[as-rep_roasting_spray.png]]
![[wazuh_as-rep_roasting_logs.png]]
![[asimmons_asrep_roast.png]]
# Pass the hash

![[generating_hash_for_pth.png]]

![[pass_the_hash_proof.png]]
![[pth_wazuh_results.png]]

![[pth_user_logon.png]]


# DCSync attack

First we have to give a user Domain Admin privileges, for this we gave asimmons

Here is the rule file to retrieve the logs in the discover dashboard

```
<!-- Local rules -->
<!-- Modify it at your will. -->
<!-- Copyright (C) 2015, Wazuh Inc. -->

<group name="local,syslog,sshd,">
  <rule id="100001" level="5">
    <if_sid>5716</if_sid>
    <srcip>1.1.1.1</srcip>
    <description>sshd: authentication failed from IP 1.1.1.1.</description>
    <group>authentication_failed,pci_dss_10.2.4,pci_dss_10.2.5,</group>
  </rule>
</group>

<group name="windows,kerberos,attack">
  <rule id="100100" level="12">
    <if_sid>60103</if_sid>
    <field name="win.system.eventID">^4769$</field>
    <field name="win.eventdata.ticketEncryptionType">^0x17$</field>
    <description>Kerberoasting detected: RC4 ticket requested for $(win.eventdata.serviceName) by $(win.eventdata.targetUserName)</description>
    <mitre>
      <id>T1558.003</id>
    </mitre>
  </rule>

  <rule id="100101" level="14">
    <if_sid>60103</if_sid>
    <field name="win.system.eventID">^4768$</field>
    <field name="win.eventdata.preAuthType">^0$</field>
    <description>AS-REP Roasting detected: Pre-auth not required for $(win.eventdata.targetUserName)</description>
    <mitre>
      <id>T1558.004</id>
    </mitre>
  </rule>

  <rule id="100102" level="14">
    <if_sid>60103</if_sid>
    <field name="win.system.eventID">^4662$</field>
    <field name="win.eventdata.properties">1131f6aa-9c07-11d1-f79f-00c04fc2dcd2|1131f6ad-9c07-11d1-f79f-00c04fc2dcd2</field>
    <description>DCSync attack detected: Directory replication requested by $(win.eventdata.subjectUserName)</description>
    <mitre>
      <id>T1003.006</id>
    </mitre>
  </rule>
</group>
```

![[asimmons_da_privilege.png]]


![[dcsync_attack_kali.png]]

![[wazuh_dcsync_attack_logs.png]]