import { Octokit } from "@octokit/rest"
import { TrackedIssueSchema, type TrackedIssue} from "@beav/core"
import { db } from "@beav/core";
import { tasks } from "@beav/core";
import { ulid } from 'ulid';


export async function fetchCandidateIssues(owner: string, repo: string, label: string, ghToken: string) {
    try {
      const octokit = new Octokit({
          auth: ghToken
      })
        
        const { data } = await octokit.rest.issues.listForRepo({
          owner,
          repo,
          labels: label,
          state: "open",
        })
        
        var errors = [];
        var added:number = 0;
        var skipped:number = 0;
      
        for (const issue of data) {
          const clean = TrackedIssueSchema.safeParse({
            githubIssueId: issue.id,
            githubIssueNumber: issue.number,
            issueTitle: issue.title,
            htmlUrl: issue.html_url,
            repoOwner: owner,
            repoName: repo,
            body: issue.body || "",
          });
            
          if (!clean.success) {
            console.error(`tracker/github.ts failed to parse Issue ID:${issue.id}`);
            errors.push({
              type: "VALIDATION_ERROR",
              issueNumber: issue.number,
              detail: clean.error.flatten()
            })
              skipped++;
              continue;
          }
          
            const error = await savetoDB(clean.data);
            if (error) {
                errors.push(error);
                skipped++;
                continue;
            }
            added++;   
        }
        
        return {
            added,
            skipped,
            errors:errors
        }
    } catch (error) {
        throw error;
    }
}

async function savetoDB(task: TrackedIssue) {
    try {
        await db.insert(tasks).values({
            id: ulid(),
            ...task,
            status: "pending",
            createdAt: Date.now(),
        }).onConflictDoNothing({target: [tasks.repoOwner, tasks.repoName, tasks.githubIssueNumber]});
        return null;
    } catch (error) {
        return error;
    }
}
