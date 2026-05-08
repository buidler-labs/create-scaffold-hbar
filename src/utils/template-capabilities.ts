import type { Frontend, PackageManager, SolidityFramework, TemplateManifest } from "../types";
import { TemplateManifestSchema } from "../types";
import { TEMPLATE_CAPABILITIES_FALLBACK, TEMPLATE_REPO } from "./consts";
import { parseGithubCommunityTemplate } from "./parse-github-template-ref";

const BLANK_TEMPLATE_BRANCH = "blank-template";

export type TemplateCapabilities = {
  frontend: Frontend[];
  solidityFramework: Array<SolidityFramework | "none">;
  packageManager: PackageManager[];
  defaults: {
    frontend?: Frontend;
    solidityFramework?: SolidityFramework | "none";
    packageManager?: PackageManager;
  };
};

const DEFAULT_CAPABILITIES: TemplateCapabilities = {
  frontend: ["nextjs-app", "none"],
  solidityFramework: ["foundry", "hardhat", "none"],
  packageManager: ["yarn", "npm"],
  defaults: {},
};

function branchNameForTemplate(template: string): string {
  return template === "blank" ? BLANK_TEMPLATE_BRANCH : template;
}

function fromManifest(manifest: TemplateManifest): TemplateCapabilities | null {
  const capabilities = manifest["create-scaffold-hbar"]?.capabilities;
  const defaults = manifest["create-scaffold-hbar"]?.defaults;
  if (!capabilities && !defaults) return null;

  return {
    frontend: capabilities?.frontend ?? DEFAULT_CAPABILITIES.frontend,
    solidityFramework: capabilities?.solidityFramework ?? DEFAULT_CAPABILITIES.solidityFramework,
    packageManager: capabilities?.packageManager ?? DEFAULT_CAPABILITIES.packageManager,
    defaults: {
      frontend: defaults?.frontend,
      solidityFramework: defaults?.solidityFramework,
      packageManager: defaults?.packageManager,
    },
  };
}

function fromFallback(template: string): TemplateCapabilities {
  const fallback = TEMPLATE_CAPABILITIES_FALLBACK[template];
  if (!fallback) return DEFAULT_CAPABILITIES;
  return {
    frontend: fallback.frontend ?? DEFAULT_CAPABILITIES.frontend,
    solidityFramework: fallback.solidityFramework ?? DEFAULT_CAPABILITIES.solidityFramework,
    packageManager: fallback.packageManager ?? DEFAULT_CAPABILITIES.packageManager,
    defaults: {
      frontend: fallback.defaults?.frontend,
      solidityFramework: fallback.defaults?.solidityFramework,
      packageManager: fallback.defaults?.packageManager,
    },
  };
}

const GITHUB_MANIFEST_TIMEOUT_MS = 10_000;

async function fetchTemplateManifestFromGithub(
  owner: string,
  repo: string,
  ref: string,
): Promise<TemplateManifest | null> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/template.json?ref=${encodeURIComponent(ref)}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(GITHUB_MANIFEST_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const payload = (await res.json()) as { content?: string; encoding?: string };
    if (!payload.content || payload.encoding !== "base64") return null;

    const raw = Buffer.from(payload.content, "base64").toString("utf8");
    return TemplateManifestSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Resolves prompt capabilities for a template from remote template.json metadata.
 * Built-in keys (`blank`, …) read `template.json` on `templates/<name>` in {@link TEMPLATE_REPO}.
 * Community refs (`owner/repo#ref`) read `template.json` on that ref (same branch giget will fetch).
 * Falls back to local defaults when the manifest is missing or invalid.
 */
export async function resolveTemplateCapabilities(template: string): Promise<TemplateCapabilities> {
  const community = parseGithubCommunityTemplate(template);
  if (community) {
    const manifest = await fetchTemplateManifestFromGithub(community.owner, community.repo, community.ref);
    if (manifest) {
      const caps = fromManifest(manifest);
      if (caps) return caps;
    }
    return DEFAULT_CAPABILITIES;
  }

  const [owner, repo] = TEMPLATE_REPO.split("/");
  if (!owner || !repo) return fromFallback(template);

  const branch = `templates/${branchNameForTemplate(template)}`;
  const manifest = await fetchTemplateManifestFromGithub(owner, repo, branch);
  if (manifest) {
    return fromManifest(manifest) ?? fromFallback(template);
  }
  return fromFallback(template);
}
