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



Implement the file service taking into account our adr 026 and 027? Also match the overall structure of the shoot service. Is there a need to make some choices on technology? Also I've added these comments to the file-service.tsp file. Please add those consideration in your implementation.

So those were the comments, it doesn't seem that they're taken into account in the implementation? Is that a choice you made?
```
/**
Major Camera RAW File Formats
Canon: .CR2, .CR3
Nikon: .NEF, .NRW
Sony: .ARW
Olympus: .ORF
Leica: .DNG, .RWL
Hasselblad: .3FR, .FFF
Phase One: .IIQ
*/

/*
  Sidecar/Config File Formats for Top Image Editors
  Only Photographers have access to editing data
  Adobe Lightroom: .XMP (sidecar for RAW edits/metadata)
  Adobe Photoshop: .PSD (internal), .XMP (for RAW), .PSB (large docs)
  Capture One: .COS, .COL, .XMP (sidecar for RAW edits/metadata)
  Affinity Photo: .AFPHOTO (internal project file)
  GIMP: .XCF (internal project file)
*/
```
Implement the notification service using Resend.dev. & payload cms (mongodb, self-hosted/community version)


did you manage to do the payloadcms implementation?

Can you create a new file that is called run_locally.md ? The idea is for the whole project to be run locally whether that's on linux (ubuntu), mac or windows 10+. This wouldn't be just for test but rather to do an on-prem run of the solution. If there are tools to make it an optimal build that's also fine. Then in the readme.md, please add a section linking to it.


can you discard the changes to all files containing `!== undefined` I'd like to clean up the git staging queue 

please have an in-depth look at all the "linting fixes" you made and revert to optimize the code a little and remove stuff like `=== undefined` 

please have an in-depth look at all the "linting fixes" you made and revert to optimize the code a little and remove stuff like `if (portfolio === null) {` 

Surely there's a cleaner way to write this, no? ```
  async findMany(query: GalleryQuery): Promise<{ galleries: IGalleryDocument[], total: number }> {
    const filter: Record<string, unknown> = {};
    if (query.portfolioId) {
      filter.portfolioId = query.portfolioId;
    }
    if (query.shootId) {
      filter.shootId = query.shootId;
    }
    if (query.type) {
      filter.type = query.type;
    }
    if (query.isPublished !== undefined) {filter.isPublished = query.isPublished;}
```
Couldn't this be a 1 liner? from invitation.repository.ts ```
  async findById(id: string): Promise<Invitation | null> {
    const invitation = await this.model.findOne({ id });
    if (invitation === null) {
      return null;
    }
    return invitation.toObject();
  }```

<!-- TODO -->

What are modern tools (definitely not jenkins, _maybe_ sonarqube) but I'm looking for newer stuff that could be part of the pre-commit push that assess the code quality? Ideally the tool would run locally for faster feedback

Let's implement an API Guideline strategy in order to enforce a proper way of working. What would you suggest?

Let's implement a kong gateway / api manager.
Now that the kong gateway / api manager is installed Let's make sure that all api traffic goes through it

What tools would you suggest for JSON schema enforcement in the case of using Kong?

one thing I really enjoy in gh pipelines is to see in one page all the builds, and not having to navigate on multiple build scripts. can you ensure that this would be the case?

for the email functionality to work, what additional setting up would I need to do?

Let's not forget the logging, and testing; we now have all the elements to start digging into our business flows, and implement a complete iteration of the e2e test according to `01-shoot-creation-and-invitation.mmd`. Let's complete the happy flow, and start thinking of a couple of alternate flows that would bring value to the testing completeness.

pros/cons to enable pre-commit checks right now? are we in a mature enough state or should we wait for first ever release (ie first major bump). I think the pre-commit checks can be disabled as long as the major version is 0 throughout the different repos in this monorepo.


Can you update the cicd in general gh pipelines so it correctly matches the renewed scripts and tests? 

Let's start creating a pulumi infrastructure for hosting this application on my local server/machine using k3s.

for the frontend/ project and directory, can you write in a SVELTE_BEST_PRACTICES.md document what are key best practices to be used in the context of a svelte web application?

