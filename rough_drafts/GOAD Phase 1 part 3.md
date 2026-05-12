In the previous sections of the blog, we ran reconnosaince and identified the corresponding logs in the IDS and SIEM. 

We have a good lay of the land now, but we need to continue gathering evidence before picking a lead to follow. 

One common way to enumerate an AD system is through username enumeration. In a real world scenario we might consider OSINT, as it's a somewhat easy means to enumerate a small companies username. For example, most companies implement the `first.last@company.com` format. If we look around (linkedin and other social media) for the typical format a company uses, all we need are first/last names to begin matching and testing usernames. Since this lab is based off game of thrones, all we have to really to is gather a list of character names (once we determine the username format), and put them together. 

Taking a look at the mindmap:
![[Pasted image 20260512114433.png]]

We can see some basic commands to query (NOT brute force) for usernames. 

![[Pasted image 20260512115746.png]]

We have some users and a password. Very low hanging fruit. Lets re run it with credentials since we have them


![[Pasted image 20260512121412.png]]


But this information is incomplete. For example, if we wanted to brute force, we have to see to what effect it's viable in this lab. We need to know who belongs to what domain and so on. It might be attractive to run Bloodhound.py since we found a user's credential in the domain. But we should restrain, take note, and keep enumerating incase there is an important piece of information that we missed. 

Referencing the mindmap, Here's what we have at this time, usernames and a single password. 

![[Pasted image 20260512120219.png]]![[Pasted image 20260512120351.png]]

We have even more options here than shown in the pictures, but we need to continue mapping out the system as a whole.

Lets start from getting the password policy:
![[Pasted image 20260512120705.png]]

So we trigger an account lockout for 5 minutes after 5 attempts. Which is important, because a lot of the stuff the mindmap suggests is password spraying. We dont want to lock ourselves out, or at the very least we should know how to script a brute force attack.

Since we aren't getting anything new with username enum using netexec, we should move onto OSINT. 

![[Pasted image 20260512122830.png]]

This endpoint has all the character names

And they are stored here on HTML:

![[Pasted image 20260512122849.png]]

I made this python script to scrape the names:

```python
import requests
from bs4 import BeautifulSoup

url = "https://www.hbomax.com/shows/game-of-thrones/4f6b4985-2dc9-4ab6-ac79-d60f0860b0ac/cast-and-crew"
soup = BeautifulSoup(requests.get(url).text, "html.parser")

names = []

for tag in soup.find_all("p", class_="character-short-title"):
    names.append(tag.text.strip())

for user in names:
    user = user.replace(" ", ".").lower()
    print(user)
```

Which gives us the usernames we need!

![[Pasted image 20260512123258.png]]


Before we test them, we can remove some oddoties (ie. ("the.hound") and a few others). Can't win them all, but this saves us a lot of time. 

If we go back to the mindmap as a reference for what tools we can use to brute force usernames, we find this:

![[Pasted image 20260512123644.png]]

Lets do that for sevenkingdoms.local and essos.local using kerbrute

![[Pasted image 20260512131935.png]]

This username enumeration work because kerbrute queries usernames against the kerberos service. When an invalid username is requested the server responds using the kerberos error code: `KRB5KDC_ERR_C_PRINCIPAL_UNKNOWN`, which allows us to determine the username being valid or not. Valid names respond with a TGT as an AS-REP response, or just an error. 

This is very important to understand. When we flip to detection, we need to understand how the enumeration takes place so we can identify it in our SIEM. Conversely, if we were trying to avoid detection, we would go another route knowing this can be used to detect us. 



Lets loop back and try to list guest-access via SMB (we skipped over this in our initial enumeration)

![[Pasted image 20260512132932.png]]

![[Pasted image 20260512133214.png]]

Take a look at the command ran. We passed `'a'` as the username. This is because, if we pass something in, windows degrades our session to a guest session. We can pass in `'t'` (for example) or any other arbitrary string and it'll degrade it to guest

![[Pasted image 20260512133339.png]]


Now our next step is to continue enumeration. Since we have a list of users and one password, I'd like to try as-rep roasting, as referenced to in this section of the mindmap

![[Pasted image 20260512133833.png]]

We run it against north.sevenkingdoms.local and get one hash for brandon.stark.

![[Pasted image 20260512134228.png]]

Now we can crack it with the following command:

```
hashcat -m 18200 -a 0 asrep.txt /usr/share/wordlists/rockyou.txt
```

![[Pasted image 20260512134434.png]]

And we grab the password and add it to our creds.txt file

Lets grab any remaining low hanging fruit left and do some basic password sprays. Keep in mind the password policy, if we go too hard on this we'll lock ourselves out.

Another thing to note. This generates a lot of noise. This type of attack is trivial to detect in a SIEM, but we'll go ahead with it anyway to generate some stuff for us to configure and look at on the back end side of this and some "attacker" lessons in mind. 

```
nxc smb 192.168.56.11 -u users.txt -p users.txt --no-bruteforce
```

![[Pasted image 20260512134918.png]]

We now have 3 sets of credentials to work with. 

Continuing, you'll notice this is cyclical. Now we'll do another round of user enumeration running

```
impacket-GetADUsers -all north.sevenkingdoms.local/brandon.stark:iseedeadpeople 
```

to gather more usernames we may have missed

![[Pasted image 20260512135439.png]]

There are a couple more users, so we add them into our users.txt file for this domain (north.sevenkingdoms.local)

With more users lets move back to Kerberoasting using GetUserSPNs:

```
impacket-GetUserSPNs -request -dc-ip 192.168.56.11 north.sevenkingdoms.local/brandon.stark:iseedeadpeople -outputfile kerberoasting.hashes
```

![[Pasted image 20260512135832.png]]

We grab 3 hashes, back to cracking with hashcat:

```
hashcat -m 13100 -a 0 kerberoasting.hashes /usr/share/wordlists/rockyou.txt 
```

The other two hashes fail, but we end up getting one cred (jon.snow:iknownothing)

Now, we can re-run the smb share enumeration with authenticated creds to the domain.

```
nxc smb 192.168.56.10-23 -u jon.snow -p iknownothing -d north.sevenkingdoms.local --shares
```

![[Pasted image 20260512140349.png]]
![[Pasted image 20260512140602.png]]

We have a lot of shares we have read access to now, which can be overwealming

We have quite a few ways we can go from here. But we'll stop for now because we have a lot to look at in the SIEM in our next blog. 

In the next one, we'll map everything we did to a mitre attack technique, create a custom ruleset for detecting some things we've ran (put list here), and showing what the logs look like on the blue team side.

For attacking, when we pick this side back up, we'll pick up bloodhound and begin enumerating some possible paths for us to take from here, and maybe touch some attacks we can perform. 