
With static analysis out of the way, we now have a pretty good idea of what this malware should do. Before running and analyzing, we'll start by running procmon and wireshark in order to document what child processes were created, what files it created/modified, where, what registry keys it wrote to, and what it tried to contact via the network. We can then cross verify with REMNux logs to see what it tried reaching out to. 

