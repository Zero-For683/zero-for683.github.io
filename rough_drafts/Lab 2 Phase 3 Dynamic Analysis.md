
With static analysis out of the way, we now have a pretty good idea of what this malware should do. Before running and analyzing, we'll start by running procmon and wireshark in order to document what child processes were created, what files it created/modified, where, what registry keys it wrote to, and what it tried to contact via the network. We can then cross verify with REMNux logs to see what it tried reaching out to. 

We'll start with procmon first. 

I'll start by filtering the noise, and searching for these operations: 
- RegSetValue
- WriteFile
- Process Create
- RegCreateKey
- CreateFile

![[Pasted image 20260401140330.png]]
![[Pasted image 20260401140438.png]]
![[Pasted image 20260401140551.png]]
![[Pasted image 20260401140947.png]]


The only operation not found was "RegCreateValue"

So we are seeing that from WriteFile, the malware is writing temp files
- `C:\Users\Admin\AppData\Local\Temp\autB4A0.tmp`
- `C:\Users\Admin\AppData\Local\Temp\reafection`

It could be writing chunks into the same file, or building a file in memory and dumping it to disk, etc. Impossible to know until we take a look. 

Then, we see it spawn a child service, REgSvc.exe from `C:\Windows\Microsoft.NET\Framework\v4.0.30319\RegSvcs.exe`

The `RegSvcs.exe` activity shows lots of RegOpenKey and RegCreateKey under 
- `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion`
- `HKLM\System\CurrentControlSet\Services\Tcpip\Parameters`
But under the detail column, we see that they're just opening the keys and reading them. So right now it seems like this is showing environment discovery, .NET/system initialization, and normal-ish setup noise from the launched utility. 

Taking a look at the written files:
![[Pasted image 20260401142042.png]]


![[Pasted image 20260401143444.png]]

Its hard to say exactly what the behavior or the malware is doing. Because earlier from last session we saw that the binary stays quiet if it notices it's on a VM/isolated network, it is very plausible that we won't be able to analyze the malware safely with the tools I've setup. Further evidence of this is the fact the malware doesnt write to the registry at all, only reads network-related stuff, and from earlier we saw that it imports functions and what not related to the operations of checking the bios and adapter settings. Taking a look at the reaffection file written to the Temp directory, we see based on the first few bytes that it is no an EXE/DLL, ZIP, or GZIP. (`4D 5A` is Exe/dll, `50 4b` is zip, and `1f 8b` is gzip). It's highly likely its an encrypted blob that could have any number of operations (encoded stage, packed data, shellcode/container, etc). 

It was at this point that I considered giving up and trying another piece of malware. But thats not how learning happens! Friction is needed! 

I deduced that I needed some way to cloak my vm status. Thankfully, this has already been though of, so I copied the .ps1 from this repo: https://github.com/d4rksystem/VMwareCloak and ran it with system privileges. 

The cloaking worked, but the malware is quite smart. It sends a GET request as another layer of VM testing it seems. We can see this clearly in our remnux logs

![[Pasted image 20260401165909.png]]

Remnux replies with a basic html page. `ip-api.com` is a geo-ip service that checks if the machine is running in a datacenter or hosting environment. This is the second layer of sandbox evasion on top of the VM checks the malware performs. Since inetsim responds with a fake html file, it passes, and later on, it tries to reach out to the c2 channel. Inetsim accepts the tcp connection but cant complete the tls handshake. The malware connects, fails to negotiate ssl, and drops. This is the primary reason we can't see anything from wireshark. There is no parload to see just tcp handshakes that go nowhere. 
![[Pasted image 20260401170328.png]]

However, the malware itself terminates, but spawns 1 process: RegSvcs.exe

It wasn't immediately obvious at first. But the malware is actually process hollowing. 

(briefly explain process hollowing here)

Even though regsvcs.exe is the hollowed process, it too eventually exits at the end. So, I had to get a dump of the memory before it exited. I did so wirth procdump.exe as so: 
![[Pasted image 20260401191022.png]]

Then, I transfered the `regsvcs_final.dmp` file over to my host machine itself. 

This was done because I do not want to reconnect flarevm to the internet to download new tools. This was done via transferring the dmp file recorded to flarevm, then transferring the dmp file to my windows machine via ssh scp. 

![[Pasted image 20260401192802.png]]

Using this an minidump, I've been able to deduce the following: 

Their C2 infrastructure is just an email to exfil data:
`officelogs@robotidegazon.ro`

The anti-sandbox was: `http://ip-api.com/line/?fields=hosting`

The malicious thread: 0x128c at 0x408346 (inside the regsvcs.exe module space)

and the original binary (I renamed it in my lab from the original one) Agent Tesla.exe

Here are the mitre att&ck techinques at play: (rewrite this to just be a table in text and remove the pasted image)
![[Pasted image 20260401193109.png]]



If we wanted to write detection rules for our SIEM (which is outside the scope of this part), we would write rules that are triggered by the behavioral IOCs the malware showed (registry keys it wrote, file paths it dropped to, child process names it spawned, etc...)