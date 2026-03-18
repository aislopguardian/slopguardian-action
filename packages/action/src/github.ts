import * as github from "@actions/github";
import { isOwnComment } from "./comment-builder.js";

type Octokit = ReturnType<typeof github.getOctokit>;

export interface GitHubClient {
  octokit: Octokit;
  owner: string;
  repo: string;
}

export function createGitHubClient(token: string): GitHubClient {
  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  return { octokit, owner, repo };
}

export async function findExistingComment(
  client: GitHubClient,
  issueNumber: number,
): Promise<number | null> {
  const { octokit, owner, repo } = client;
  const allComments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });

  const existing = allComments.find((c) => c.body && isOwnComment(c.body));
  return existing?.id ?? null;
}

export async function upsertComment(
  client: GitHubClient,
  issueNumber: number,
  body: string,
): Promise<void> {
  const existingId = await findExistingComment(client, issueNumber);
  const { octokit, owner, repo } = client;

  if (existingId) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingId,
      body,
    });
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });
  }
}

export async function addLabel(
  client: GitHubClient,
  issueNumber: number,
  label: string,
): Promise<void> {
  const { octokit, owner, repo } = client;
  await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: issueNumber,
    labels: [label],
  });
}

export async function closeIssue(client: GitHubClient, issueNumber: number): Promise<void> {
  const { octokit, owner, repo } = client;
  await octokit.rest.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    state: "closed",
    state_reason: "not_planned",
  });
}

export async function getFileContent(
  client: GitHubClient,
  path: string,
  ref?: string,
): Promise<string | null> {
  try {
    const { octokit, owner, repo } = client;
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if ("content" in response.data && response.data.content) {
      return Buffer.from(response.data.content, "base64").toString("utf-8");
    }
    return null;
  } catch {
    return null;
  }
}

export async function getPrDiff(client: GitHubClient, pullNumber: number): Promise<string> {
  const { octokit, owner, repo } = client;
  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: { format: "diff" },
  });

  return response.data as unknown as string;
}

export async function getMergedPrCount(client: GitHubClient, username: string): Promise<number> {
  const { octokit, owner, repo } = client;
  const searchResult = await octokit.rest.search.issuesAndPullRequests({
    q: `repo:${owner}/${repo} type:pr author:${username} is:merged`,
  });
  return searchResult.data.total_count;
}

export async function getPastSlopClosures(
  client: GitHubClient,
  username: string,
  label: string,
): Promise<number> {
  const { octokit, owner, repo } = client;
  const searchResult = await octokit.rest.search.issuesAndPullRequests({
    q: `repo:${owner}/${repo} author:${username} label:"${label}" is:closed`,
  });
  return searchResult.data.total_count;
}

export async function isCollaborator(client: GitHubClient, username: string): Promise<boolean> {
  try {
    const { octokit, owner, repo } = client;
    await octokit.rest.repos.checkCollaborator({ owner, repo, username });
    return true;
  } catch {
    return false;
  }
}

export async function hasExemptLabel(
  client: GitHubClient,
  issueNumber: number,
  exemptLabels: string[],
): Promise<boolean> {
  const { octokit, owner, repo } = client;
  const issue = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  const labels = issue.data.labels.map((l) => (typeof l === "string" ? l : (l.name ?? "")));

  return exemptLabels.some((exempt) => labels.includes(exempt));
}
