/**
 * Storybook manager entry — registers a version-switcher toolbar item.
 *
 * When deployed on GitHub Pages at paths like:
 *   https://owner.github.io/repo-name/v0.0.3/
 *   https://owner.github.io/repo-name/latest/
 *
 * …this reads  /repo-name/versions.json  and renders a dropdown that lets
 * users navigate between all deployed versions.  Silently does nothing when
 * running locally (versions.json won't exist at localhost).
 */
import React, { createElement, useEffect, useState } from "react";
import { addons, types } from "storybook/manager-api";

const ADDON_ID = "storybook/version-switcher";
const TOOL_ID = `${ADDON_ID}/tool`;

// ── URL helpers ───────────────────────────────────────────────────────────────

/**
 * Given a GitHub Pages URL like https://owner.github.io/repo-name/v0.0.3/
 * returns  https://owner.github.io/repo-name/versions.json.
 *
 * Returns null when running locally or outside the expected URL pattern
 * (fewer than 2 path segments after the origin).
 */
function getVersionsUrl(): string | null {
  const { origin, pathname } = window.location;
  const segments = pathname.split("/").filter(Boolean);
  // Need at least [repoName, versionDir]
  if (segments.length < 2) return null;
  return `${origin}/${segments[0]}/versions.json`;
}

/** Derives the site root (https://owner.github.io/repo-name/) from the current URL. */
function getSiteRoot(): string {
  const { origin, pathname } = window.location;
  const segments = pathname.split("/").filter(Boolean);
  return `${origin}/${segments[0]}/`;
}

/** Returns the currently active version segment (e.g. "v0.0.3" or "latest"). */
function getCurrentVersion(): string {
  const segments = window.location.pathname.split("/").filter(Boolean);
  return segments[1] ?? "latest";
}

// ── Component ─────────────────────────────────────────────────────────────────

function VersionSwitcher() {
  const [versions, setVersions] = useState<string[]>([]);

  useEffect(() => {
    const url = getVersionsUrl();
    if (!url) return;

    fetch(url)
      .then((res) => {
        if (!res.ok) return;
        return res.json() as Promise<string[]>;
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setVersions(data);
        }
      })
      .catch(() => {
        // Silently ignore — probably running locally where versions.json doesn't exist.
      });
  }, []);

  if (!versions.length) return null;

  const current = getCurrentVersion();
  const siteRoot = getSiteRoot();

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
        htmlFor: "sb-version-select",
        style: {
          fontSize: "12px",
          fontWeight: 600,
          color: "inherit",
          userSelect: "none",
          cursor: "default",
          whiteSpace: "nowrap",
        },
      },
      "Version",
    ),
    createElement(
      "select",
      {
        id: "sb-version-select",
        value: current,
        title: "Switch to a different deployed version",
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
          window.location.href = `${siteRoot}${e.target.value}/`;
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
        ...versions.map((v) =>
          createElement("option", { key: v, value: v }, v),
        ),
      ],
    ),
  );
}

// ── Register addon ────────────────────────────────────────────────────────────

addons.register(ADDON_ID, () => {
  addons.add(TOOL_ID, {
    title: "Switch version",
    type: types.TOOL,
    match: () => true, // show on every page (stories + docs)
    render: VersionSwitcher,
  });
});
