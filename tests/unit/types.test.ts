import { describe, it, expect } from "vitest";
import { TemplateManifestSchema } from "../../src/types";

const minimalManifest = {
  name: "hts-nft",
};

const fullManifest = {
  name: "hts-nft",
  description: "NFT Collection template using Hedera Token Service",
  version: "1.0.0",
  "create-hbar": {
    rename: {
      HtsNftTemplate: {
        to: "{{projectName}}",
        paths: ["contracts", "frontend/src"],
      },
    },
    instructions: ["Get free testnet HBAR at: https://portal.hedera.com", "+cp .env.example .env", "+{pm} run dev"],
    requirements: {
      node: ">=18.0.0",
    },
    envVars: [
      { key: "HEDERA_ACCOUNT_ID", description: "Your Hedera account ID (0.0.XXXXX)" },
      { key: "HEDERA_PRIVATE_KEY", description: "Your ECDSA or ED25519 private key" },
      { key: "HEDERA_NETWORK", description: "testnet | mainnet" },
    ],
  },
};

describe("TemplateManifestSchema", () => {
  describe("valid manifests", () => {
    it("accepts a minimal manifest with only a name", () => {
      const result = TemplateManifestSchema.safeParse(minimalManifest);
      expect(result.success).toBe(true);
    });

    it("accepts a fully-populated manifest", () => {
      const result = TemplateManifestSchema.safeParse(fullManifest);
      expect(result.success).toBe(true);
    });

    it("accepts a manifest without a create-hbar block", () => {
      const result = TemplateManifestSchema.safeParse({ name: "blank" });
      expect(result.success).toBe(true);
    });

    it("accepts a create-hbar block with only envVars", () => {
      const result = TemplateManifestSchema.safeParse({
        name: "blank",
        "create-hbar": {
          envVars: [{ key: "HEDERA_ACCOUNT_ID", description: "Account ID" }],
        },
      });
      expect(result.success).toBe(true);
    });

    it("preserves rename entry structure on parse", () => {
      const result = TemplateManifestSchema.safeParse(fullManifest);
      expect(result.success).toBe(true);
      if (!result.success) return;
      const renameEntry = result.data["create-hbar"]?.rename?.["HtsNftTemplate"];
      expect(renameEntry?.to).toBe("{{projectName}}");
      expect(renameEntry?.paths).toEqual(["contracts", "frontend/src"]);
    });
  });

  describe("invalid manifests", () => {
    it("rejects a manifest with no name", () => {
      const result = TemplateManifestSchema.safeParse({ description: "no name" });
      expect(result.success).toBe(false);
    });

    it("rejects a manifest with an empty name string", () => {
      const result = TemplateManifestSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("rejects an envVar entry missing a key", () => {
      const result = TemplateManifestSchema.safeParse({
        name: "test",
        "create-hbar": {
          envVars: [{ description: "missing key field" }],
        },
      });
      expect(result.success).toBe(false);
    });

    it("rejects an envVar entry with an empty key", () => {
      const result = TemplateManifestSchema.safeParse({
        name: "test",
        "create-hbar": {
          envVars: [{ key: "", description: "empty key" }],
        },
      });
      expect(result.success).toBe(false);
    });

    it("rejects a rename entry with an empty paths array", () => {
      const result = TemplateManifestSchema.safeParse({
        name: "test",
        "create-hbar": {
          rename: {
            Placeholder: { to: "{{projectName}}", paths: [] },
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it("rejects a rename entry with an empty 'to' string", () => {
      const result = TemplateManifestSchema.safeParse({
        name: "test",
        "create-hbar": {
          rename: {
            Placeholder: { to: "", paths: ["contracts"] },
          },
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("inferred types", () => {
    it("returns typed envVars after a successful parse", () => {
      const result = TemplateManifestSchema.safeParse(fullManifest);
      expect(result.success).toBe(true);
      if (!result.success) return;
      const envVars = result.data["create-hbar"]?.envVars ?? [];
      expect(envVars[0].key).toBe("HEDERA_ACCOUNT_ID");
      expect(envVars[1].key).toBe("HEDERA_PRIVATE_KEY");
      expect(envVars[2].key).toBe("HEDERA_NETWORK");
    });

    it("returns typed instructions after a successful parse", () => {
      const result = TemplateManifestSchema.safeParse(fullManifest);
      expect(result.success).toBe(true);
      if (!result.success) return;
      const instructions = result.data["create-hbar"]?.instructions ?? [];
      expect(instructions).toHaveLength(3);
      expect(instructions[0]).toBe("Get free testnet HBAR at: https://portal.hedera.com");
    });
  });
});
