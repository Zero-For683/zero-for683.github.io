
For the rest of the lab, I have 1 files to examine. Agent TEsla. Tesla is an EXE. 

Agent Tesla malware family is a long-running info-stealer/keylogger/credential theft RAT. These are commonly delivered through phishing and used to steal browser, mail, ftp, clipboard, etc data. 

# Hashing

We'll start by gathering the md5, sha1, sha256 hashes and lookup on virus total.

![[Pasted image 20260401112636.png]]

Agent Tesla:
```
• MD5: 0AEC094B3B1FF45C3C0C8D385AC4B8E0
• SHA1: BB9BA0814A17FA6FD0CD02DF32FA461409A511C8
• SHA256: 830E7555A21EF8EAF7C0476595D116806D5351E5E6D1E458F10CF9E7E93D7DD9
```

![[Pasted image 20260401112850.png]]
![[Pasted image 20260401112903.png]]
![[Pasted image 20260401112913.png]]

We can see the Agent Tesla is strongly signatured and indicates trojan behavior. 




Some important notes here. Detection matters less than who flagged it. If several family engines converges on the same idea, that matters much more. 

Here are the basics for AgentTesla:
```
filename: 47xs2hv5.exe
size: 1.19 MB
MD5: 0aec094b3b1ff45c3c0c8d385ac4b8e0
SHA-1: bb9ba0814a17fa6fd0cd02df32fa461409a511c8
SHA-256: 830e7555a21ef8eaf7c0476595d116806d5351e5e6d1e458f10cf9e7e93d7dd9
First Submission: 2026-03-31 23:58:52
```

So this agenttesla submission is VERY recent! In fact, as of making this, its only ~17.5 hours old. (at least from first submission according to virustotal)


# pestudio

Then we'll load the files into pestudio to document file types, compiler artifacts, compilation timestamps (to see if its forged), imported function (like virtualalloc and writeprocessmemory), and any strings. 

First lets start with the indicators tab

![[Pasted image 20260401115241.png]]
![[Pasted image 20260401121103.png]]

- **File name/path**
- **PE type**: `executable`
- **Architecture**: `32-bit`
- **Subsystem**: `GUI`
- **Signature / compiler clue**: `AutoIt compiled script`
- **Tooling artifact**: `Visual Studio 2013` shown in rich header
- **Extension vs actual type**: `.exe`, but likely a **compiled AutoIt PE**
- Compile time: Tue Mar 31 23:39:52 2026

Indicators tab is the front-page summary where we can gain situal awareness fast. Things to note here:
- Autolt compiled script suggests that the exe is likely a compiled autolt wrapper/loader, which is not standard for a native program. Malware often uses autolt to hide, drop, or launch payloads.
- Entropy is 7.128, which is fairly high. This suggests packed,compressed or encrypted conetnt. Which just means some of the real logic/config may be hidden.
- Network related libraries, such as wsock32.dll, wininet.dll and iphlpapi.dll are used. So we can assume there are some network communications capability, which is important because it could support C2/exfil capabilties since we're dealing with an agent-tesla malware family.
- Flagged imports, such as AdjustTokenPrivileges can suggest that privilege manipulation or sensitive system interaction is occuring. 



Now, we'll look at the imports to see what is being imported and used. There are 165, so I cant go over everything but here's some things that are important
![[Pasted image 20260401115901.png]]

Heavy networking is occuring. The exe clearly has real socket networking capability which supports c2, exfil, or remote communications. 

![[Pasted image 20260401120051.png]]

Here we can see some pretty important and dangerous imports from kernel32.dll. Noteable openprocess, virtualallocex, writeprocessmemory and readprocessmemory. These are commonly associated with process injection or manipulating another process's memory. 

![[Pasted image 20260401120314.png]]

Additionally, we can see Registry edit imports (regcreatekeyexw, regdeletevaluew, etc), and keylogging api, GetAsyncKeyState, GetForegroundWindow, and SetKeyboardstate

![[Pasted image 20260401122637.png]]

Then we can see quite a few strings that are indicative of malicious activity as well, 
# capa

Now we'll use capa to run the binary to map out any capabilities to ATT&CK automatically. 

Normally, capa does do that, but because this binary is autolt compiled, capa cannot fully analyze autolt and map to att&ck. This does confirm the autolt from pestudio, and we can map out some of the techniques manually now:

`Att&ck here`
# Floss

Then we'll use floss to extract obfuscated strings that pestudio mightve missed, but since running, no significant data was found that wasnt already found from pestudio. 

# Documentation

Now we'll recap and document everything (file metadata, suspicious imports, suspicious strings, capa findinds, etc)