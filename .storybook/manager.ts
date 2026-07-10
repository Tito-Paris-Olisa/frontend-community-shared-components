/**
 * Storybook manager entry — registers a preview-build switcher toolbar item.
 *
 * When deployed on GitHub Pages at paths like:
 *   https://owner.github.io/repo-name/previews/preview-003/
 *   https://owner.github.io/repo-name/latest/
 *
 * …this reads /repo-name/preview-builds.json and renders a dropdown that lets
 * users navigate between all deployed preview builds. Silently does nothing
 * when running locally (preview-builds.json will not exist at localhost).
 */
import React, { createElement, useEffect, useState } from "react";
import { addons, types } from "storybook/manager-api";

type ChangedPackage = {
  name: string;
  version: string;
};

type PreviewBuild = {
  previewId: string;
  url: string;
  deployedAt: string;
  deployedCommitSha: string;
  changedPackages: ChangedPackage[];
  sourcePullRequest?: {
    number?: number;
    title: string;
    url: string;
  };
};

const ADDON_ID = "storybook/preview-build-switcher";
const TOOL_ID = `${ADDON_ID}/tool`;

// ── URL helpers ───────────────────────────────────────────────────────────────

/**
 * Given a GitHub Pages URL like https://owner.github.io/repo-name/previews/preview-003/
 * returns https://owner.github.io/repo-name/preview-builds.json.
 *
 * Returns null when running locally or outside the expected URL pattern
 * (fewer than 2 path segments after the origin: /repo-name/<segment>/...).
 */
function getPreviewBuildsUrl(): string | null {
  const { origin, pathname } = window.location;
  const segments = pathname.split("/").filter(Boolean);
  // Need at least [repoName, currentTopLevelDir]
  if (segments.length < 2) return null;
  return `${origin}/${segments[0]}/preview-builds.json`;
}

/** Derives the site root (https://owner.github.io/repo-name/) from the current URL. */
function getSiteRoot(): string {
  const { origin, pathname } = window.location;
  const segments = pathname.split("/").filter(Boolean);
  return `${origin}/${segments[0]}/`;
}

/** Returns current target as either latest or a preview id. */
function getCurrentTarget():
  | { mode: "latest" }
  | { mode: "preview"; previewId: string } {
  const segments = window.location.pathname.split("/").filter(Boolean);

  if (segments[1] === "previews" && segments[2]) {
    return { mode: "preview", previewId: segments[2] };
  }

  return { mode: "latest" };
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getCurrentStoryId(): string | null {
  const path = new URLSearchParams(window.location.search).get("path");
  if (!path) return null;

  const storyMatch = path.match(/^\/story\/([^/?]+)/);
  if (storyMatch?.[1]) return storyMatch[1];

  const docsMatch = path.match(/^\/docs\/([^/?]+)/);
  if (docsMatch?.[1]) return docsMatch[1];

  return null;
}

function getPackageStoryKey(packageName: string): string {
  const parts = packageName.split("/");
  const slug = parts[1] ?? packageName;
  return normalize(slug);
}

function isBuildRelevantToStory(
  build: PreviewBuild,
  storyId: string | null,
): boolean {
  if (!storyId) return false;
  const normalizedStoryId = normalize(storyId);

  return build.changedPackages.some((pkg) => {
    const key = getPackageStoryKey(pkg.name);
    return key.length > 0 && normalizedStoryId.includes(key);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

function PreviewBuildSwitcher() {
  const [previewBuilds, setPreviewBuilds] = useState<PreviewBuild[]>([]);
  const [selectedValue, setSelectedValue] = useState<string>("latest");

  useEffect(() => {
    const url = getPreviewBuildsUrl();
    if (!url) return;

    fetch(url)
      .then((res) => {
        if (!res.ok) return;
        return res.json() as Promise<PreviewBuild[]>;
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const validBuilds = data.filter(
            (entry) =>
              entry &&
              typeof entry.previewId === "string" &&
              typeof entry.url === "string" &&
              Array.isArray(entry.changedPackages),
          );

          if (validBuilds.length > 0) {
            setPreviewBuilds(validBuilds);
          }
        }
      })
      .catch(() => {
        // Silently ignore — probably running locally where preview-builds.json does not exist.
      });
  }, []);

  useEffect(() => {
    const current = getCurrentTarget();
    setSelectedValue(current.mode === "latest" ? "latest" : current.previewId);
  }, []);

  if (!previewBuilds.length) return null;

  const siteRoot = getSiteRoot();
  const storyId = getCurrentStoryId();
  const relevantPreviewIds = new Set(
    previewBuilds
      .filter((build) => isBuildRelevantToStory(build, storyId))
      .map((build) => build.previewId),
  );

  const selectedPreviewBuild =
    selectedValue === "latest"
      ? null
      : (previewBuilds.find((build) => build.previewId === selectedValue) ??
        null);

  const relevantCount = relevantPreviewIds.size;

  return createElement(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "0 10px",
        borderLeft: "1px solid rgba(0,0,0,0.1)",
        height: "100%",
      },
    },
    createElement(
      "label",
      {
        htmlFor: "sb-preview-build-select",
        style: {
          fontSize: "12px",
          fontWeight: 600,
          color: "inherit",
          userSelect: "none",
          cursor: "default",
          whiteSpace: "nowrap",
        },
      },
      "Preview builds",
    ),
    createElement(
      "select",
      {
        id: "sb-preview-build-select",
        value: selectedValue,
        title: "Switch to a different deployed preview build",
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
          const value = e.target.value;
          setSelectedValue(value);

          if (value === "latest") {
            window.location.href = `${siteRoot}latest/`;
            return;
          }

          window.location.href = `${siteRoot}previews/${value}/`;
        },
        style: {
          fontSize: "12px",
          padding: "2px 6px",
          borderRadius: "4px",
          border: "1px solid rgba(0,0,0,0.2)",
          background: "transparent",
          cursor: "pointer",
          minWidth: "80px",
        },
      },
      [
        createElement("option", { key: "latest", value: "latest" }, "latest"),
        ...previewBuilds.map((build) =>
          createElement(
            "option",
            { key: build.previewId, value: build.previewId },
            relevantPreviewIds.has(build.previewId)
              ? `${build.previewId} (relevant)`
              : build.previewId,
          ),
        ),
      ],
    ),
    createElement(
      "span",
      {
        style: {
          fontSize: "11px",
          color: "inherit",
          opacity: 0.75,
          whiteSpace: "nowrap",
        },
        title:
          "Preview builds relevant to this story based on changed packages",
      },
      storyId ? `${relevantCount} relevant` : "all previews",
    ),
    selectedPreviewBuild?.sourcePullRequest?.url
      ? createElement(
          "a",
          {
            href: selectedPreviewBuild.sourcePullRequest.url,
            target: "_blank",
            rel: "noreferrer",
            style: {
              fontSize: "11px",
              color: "inherit",
              textDecoration: "underline",
              whiteSpace: "nowrap",
            },
            title: selectedPreviewBuild.sourcePullRequest.title,
          },
          selectedPreviewBuild.sourcePullRequest.number
            ? `PR #${selectedPreviewBuild.sourcePullRequest.number}`
            : "source commit",
        )
      : null,
  );
}

// ── Register addon ────────────────────────────────────────────────────────────

addons.register(ADDON_ID, () => {
  addons.add(TOOL_ID, {
    title: "Switch preview build",
    type: types.TOOL,
    match: () => true, // show on every page (stories + docs)
    render: PreviewBuildSwitcher,
  });
});
