# Step 1 & 2 - creating and testing the rules

For the rule files, delve into the important settings (matched_sid, ipAddress, frequency) and how we might further tune in a real environment. 

![[password_spray-failed_logon.png]]
![[password_spray-failed_logon_alert.png]]


![[password_spray-kerberos_pre_auth.png]]
![[password_spray-kerberos_pre_auth_alert.png]]


![[Pasted image 20260331114209.png]]
![[pass_the_hash-ntlmssp_alert.png]]



3 xml rules:
```
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

Alerts for each one (look at the pictures and rename each screenshot accordingly):
![[Pasted image 20260331111830.png]]
![[Pasted image 20260331111844.png]]
![[Pasted image 20260331111854.png]]


# Step 3 - benign activity

The screenshots below represent benign activity that might throw an alert, but doesnt because it is safe. 

First, mistyping my password 3 times and verifying in wazuh:
![[Pasted image 20260331112337.png]]
![[Pasted image 20260331112424.png]]


Trying to authenticate via kerberos 3 times
![[Pasted image 20260331112803.png]]
![[Pasted image 20260331112810.png]]


Mapping a network drive on WIN10 to test PTH & Kerberoast 
![[Pasted image 20260331113234.png]]
![[Pasted image 20260331113814.png]]
![[Pasted image 20260331114123.png]]



# Mitre AT&CK:
json, svg, and xlsx is at https://github.com/Zero-For683/ad_attack_and_detection_lab/tree/main/mitre-coverage
![[Pasted image 20260331121534.png]]

All 5 rules in one picture: 
![[Pasted image 20260331121421.png]]
detection rules here: https://github.com/Zero-For683/ad_attack_and_detection_lab/tree/main/detection-rules