import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const GITHUB_SCOPE = "tito-paris-olisa";

const [, , scope, packageName, componentName] = process.argv;

if (!scope || !packageName || !componentName) {
  console.error(
    "Usage: pnpm create:package <scope> <package-name> <ComponentName>",
  );
  process.exit(1);
}

const folderName = `${scope}-${packageName}`;
const packageDir = join(process.cwd(), "packages", scope, packageName);
const srcDir = join(packageDir, "src");

if (existsSync(packageDir)) {
  console.error(`Package already exists: packages/${scope}/${packageName}`);
  process.exit(1);
}

mkdirSync(srcDir, { recursive: true });

writeFileSync(
  join(packageDir, "package.json"),
  JSON.stringify(
    {
      name: `@${GITHUB_SCOPE}/${scope}-${packageName}`,
      version: "0.0.1",
      publishConfig: {
        registry: "https://npm.pkg.github.com",
      },
      private: false,
      type: "module",
      main: "./dist/index.js",
      types: "./dist/index.d.ts",
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          import: "./dist/index.js",
        },
      },
      files: ["dist"],
      scripts: {
        build: "tsc -p tsconfig.json",
        lint: 'echo "No lint yet"',
        test: 'echo "No tests yet"',
        storybook: 'echo "Storybook not configured yet"',
      },
      peerDependencies: {
        react: ">=18",
      },
    },
    null,
    2,
  ),
);

writeFileSync(
  join(packageDir, "tsconfig.json"),
  `${JSON.stringify(
    {
      extends: "../../../tsconfig.base.json",
      compilerOptions: {
        outDir: "dist",
        rootDir: "src",
        noEmit: false,
      },
      include: ["src"],
      exclude: ["**/*.stories.tsx", "**/*.test.tsx"],
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(srcDir, `${componentName}.tsx`),
  `export type ${componentName}Props = {
  label?: string;
};

export function ${componentName}({ label = "${componentName}" }: ${componentName}Props) {
  return <div>{label}</div>;
}
`,
);

writeFileSync(
  join(srcDir, "index.ts"),
  `export { ${componentName} } from "./${componentName}";
export type { ${componentName}Props } from "./${componentName}";
`,
);

writeFileSync(
  join(srcDir, `${componentName}.stories.tsx`),
  `import type { Meta, StoryObj } from "@storybook/react";
import { ${componentName} } from "./${componentName}";

const meta = {
  title: "${scope}/${componentName}",
  component: ${componentName}
} satisfies Meta<typeof ${componentName}>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "${componentName}"
  }
};
`,
);

writeFileSync(
  join(srcDir, `${componentName}.test.tsx`),
  `import { describe, expect, it } from "vitest";

describe("${componentName}", () => {
  it("has a placeholder test", () => {
    expect(true).toBe(true);
  });
});
`,
);

console.log(
  `Created @${scope}/${packageName} in packages/${scope}/${packageName}`,
);
