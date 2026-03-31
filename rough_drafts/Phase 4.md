Now in phase 4, as a final step, we pretend we are an analyst who received 5 alerts in wazuh and must reconstruct everything - working only from logs. 

We start by dumping all the logs on the VMs via: 

```powershell
New-Item -ItemType Directory -Path C:\Logs -Force
wevtutil epl Security C:\Logs\DC_Security.evtx
wevtutil epl System C:\Logs\DC_System.evtx
wevtutil epl "Microsoft-Windows-Sysmon/Operational" C:\Logs\DC_Sysmon.evtx
```

Then we download all `.evtx` files onto the analysis VM. I did this via an SMB share.
![[Pasted image 20260331131831.png]]

I downloaded Eric Zimmerman's tools for help: https://ericzimmerman.github.io/#!index.md
![[Pasted image 20260331132215.png]]

I then ran the following evtxecmd command against all 6 files.
```powershell
.\EvtxECmd.exe -f DC_Security.evtx --csv C:\Analysis --csvf DC_Security.csv
.\EvtxECmd.exe -f DC_Sysmon.evtx --csv C:\Analysis --csvf DC_Sysmon.csv
.\EvtxECmd.exe -f W10_Security.evtx --csv C:\Analysis --csvf W10_Security.csv
.\EvtxECmd.exe -f W10_Sysmon.evtx --csv C:\Analysis --csvf W10_Sysmon.csv
```
![[Pasted image 20260331132959.png]]

Now with everything exported properly, we can begin building a timeline using the timeline explorer using the csv's

![[Pasted image 20260331133142.png]]

We'll start by building key event id filters and apply one at a time. 

Starting with event id 4625 against the DC to look for first spray events - source ip, timestamps, and target accounts

![[Pasted image 20260331134033.png]]
![[Pasted image 20260331134013.png]]

We can see that the first spray events started on march 30th, at 9:44 PM. The source (attacker) ip was 192.168.93.156, and they targeted 15 different accounts multiple times. 


The next event we'll look at is 4771 against the DC for kerberos failures, and same source IPs
![[Pasted image 20260331134422.png]]
![[Pasted image 20260331134409.png]]

Here we can see these attacks started on the same day at 9:32pm against all users on the system, all originating from the same ip. 


Next up, event id 4769 where we are looking for kerberoasting attempts via rc4 ticket requests encoded with the `0x17`, and the affected account names. 


![[Pasted image 20260331134728.png]]![[Pasted image 20260331134740.png]]
![[Pasted image 20260331134823.png]]

We can see RC4 tickets requested for the svc_backup and svc_sql service accounts and their SIDs right there. The earliest requests happened at 9:51 pm


Next up, 4768, which is as-rep requests. We know asimmons was the target so that's what we'll be looking for as well as the earliest time stamp


![[Pasted image 20260331135031.png]]
![[Pasted image 20260331135047.png]]
![[Pasted image 20260331135210.png]]

We can see here that asimmons was targetting, and the preauth type was "Logon without pre-auth", or "0"


Next up, 4624. We're looking for indicators of passing the hash. The indicators are logon type 3 + ntlmssp
![[Pasted image 20260331135704.png]]
![[Pasted image 20260331135758.png]]

We can see the earliest occurances happening at 9:44 against a wide variety of accounts. 


Next, 4728, which fires when a user is added to a privileged group. This should happen against asimmons since we promoted them to Domain Admin to test DCSyncing. Though, this was done in a lab, this is still a possible attack vector for a threat actor to persue. 

![[Pasted image 20260331140120.png]]
![[Pasted image 20260331140134.png]]

We can see it occured at 11:52PM 

Lastly, we can look for DCSync activity ; 4662. It's a bit difficult to find this, but what we can do is sort by the event ID and then look for a tight burst of 4662 events. Then we can correlate that to what process creation occured. 
![[Pasted image 20260331141138.png]]

Here we can see a tight burst occuring at 11:54 pm which would be the hashes dumped from the system once executed. 

![[Pasted image 20260331141216.png]]

