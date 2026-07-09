import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FecTable } from "./FecTable";

describe("FecTable", () => {
  const columns = [
    { key: "name", header: "Name" },
    { key: "active", header: "Active" },
  ];

  it("renders headers and row values", () => {
    const html = renderToStaticMarkup(
      <FecTable
        columns={columns}
        rows={[{ id: "1", name: "Ada", active: true }]}
      />,
    );

    expect(html).toContain("Name");
    expect(html).toContain("Active");
    expect(html).toContain("Ada");
    expect(html).toContain("Yes");
  });

  it("renders empty state when there are no rows", () => {
    const html = renderToStaticMarkup(
      <FecTable columns={columns} rows={[]} emptyMessage="Nothing to show" />,
    );

    expect(html).toContain("Nothing to show");
  });

  it("renders loading state when loading is true", () => {
    const html = renderToStaticMarkup(
      <FecTable
        columns={columns}
        rows={[]}
        loading
        loadingMessage="Loading now"
      />,
    );

    expect(html).toContain("Loading now");
  });
});
