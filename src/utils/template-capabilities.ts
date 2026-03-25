import type { Frontend, SolidityFramework, TemplateManifest } from "../types";
import { TemplateManifestSchema } from "../types";
import { TEMPLATE_CAPABILITIES_FALLBACK, TEMPLATE_REPO } from "./consts";

const BLANK_TEMPLATE_BRANCH = "blank-template";

export type TemplateCapabilities = {
  frontend: Frontend[];
  solidityFramework: Array<SolidityFramework | "none">;
  defaults: {
    frontend?: Frontend;
    solidityFramework?: SolidityFramework | "none";
  };
};

const DEFAULT_CAPABILITIES: TemplateCapabilities = {
  frontend: ["nextjs-app", "none"],
  solidityFramework: ["foundry", "hardhat", "none"],
  defaults: {},
};

function branchNameForTemplate(template: string): string {
  return template === "blank" ? BLANK_TEMPLATE_BRANCH : template;
}

function fromManifest(manifest: TemplateManifest): TemplateCapabilities | null {
  const capabilities = manifest["create-hbar"]?.capabilities;
  const defaults = manifest["create-hbar"]?.defaults;
  if (!capabilities && !defaults) return null;

  return {
    frontend: capabilities?.frontend ?? DEFAULT_CAPABILITIES.frontend,
    solidityFramework: capabilities?.solidityFramework ?? DEFAULT_CAPABILITIES.solidityFramework,
    defaults: {
      frontend: defaults?.frontend,
      solidityFramework: defaults?.solidityFramework,
    },
  };
}

function fromFallback(template: string): TemplateCapabilities {
  const fallback = TEMPLATE_CAPABILITIES_FALLBACK[template];
  if (!fallback) return DEFAULT_CAPABILITIES;
  return {
    frontend: fallback.frontend ?? DEFAULT_CAPABILITIES.frontend,
    solidityFramework: fallback.solidityFramework ?? DEFAULT_CAPABILITIES.solidityFramework,
    defaults: {
      frontend: fallback.defaults?.frontend,
      solidityFramework: fallback.defaults?.solidityFramework,
    },
  };
}

/**
 * Resolves prompt capabilities for a template from remote template.json metadata.
 * Falls back to local defaults to keep prompts resilient offline.
 */
export async function resolveTemplateCapabilities(template: string): Promise<TemplateCapabilities> {
  if (template.includes("/")) return DEFAULT_CAPABILITIES;

  const [owner, repo] = TEMPLATE_REPO.split("/");
  if (!owner || !repo) return fromFallback(template);

  const branch = `templates/${branchNameForTemplate(template)}`;
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/template.json?ref=${encodeURIComponent(branch)}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return fromFallback(template);

    const payload = (await res.json()) as { content?: string; encoding?: string };
    if (!payload.content || payload.encoding !== "base64") return fromFallback(template);

    const raw = Buffer.from(payload.content, "base64").toString("utf8");
    const parsed = TemplateManifestSchema.parse(JSON.parse(raw));
    return fromManifest(parsed) ?? fromFallback(template);
  } catch {
    return fromFallback(template);
  }
}
