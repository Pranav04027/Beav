import { Octokit } from "@octokit/rest"
import { TrackedIssueSchema, type TrackedIssue } from "@beav/core"
import dotenv from "dotenv"

export async function fetchCandidateIssues(owner: string, repo: string, label: string, ghToken: string): Promise<TrackedIssue[]> {
  const octokit = new Octokit({
      auth: ghToken
  })
    
    const { data } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      labels: label,
      state: "open",
    })
    
    
    const results: TrackedIssue[] = [];
    
    data.forEach((issue) => {
      const clean = TrackedIssueSchema.parse({
        githubIssueId: issue.node_id,
        githubIssueNumber: issue.number,
        issueTitle: issue.title,
        htmlUrl: issue.html_url,
        repoOwner: owner,
        repoName: repo,
        body: issue.body || "",
      });
      
      results.push(clean);
    });
    
    return results;
}