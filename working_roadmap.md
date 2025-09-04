# Working Roadmap 



I remember there were about 23 different ADRs created, but you didn't have the capacity to create all 23. do you recall what those were? I believe there is one file that contains a full aggregation, if so can you tell me which one is it? Can you continue the split into separate files?

please check that 23, 24 match because it is likely that they differ, treat different subjects

can you rework the adr/decision logs starting with the dates in the adr/ folder to be reformatted to the other adrs' format and conventions? 

let's stage and commit, 1 adr per commit

can you log the context of this conversation to .claude/collaboration-logs/<date>.log and export all the past conversation so this provides context for the next conversation? Also always append the log as the exchange continues/extends

Create an ADR for the new folder structure, if this collides with another adr, do emphasize on the fact that it's a folder structure aimed solely at the micro-services.


please replicate all the refactorings made to the shoot-service and apply a mirror structure to the following services:
- user service
- invite service
And please stage and commit per service restructuring


I'd also like to make a direct linkage between the shoot-service event definition and asyncapi, what are my options?  

<!-- TODO -->

Implement the file service taking 

Implement the notification service using Resend.dev. & payload cms (mongodb, self-hosted/community version)


for the frontend/ project and directory, can you write in a SVELTE_BEST_PRACTICES.md document what are key best practices to be used in the context of a svelte web application?

