export const topics = [
  "世界模型",
  "智能体",
  "大语言模型",
  "智能编程",
  "生成式搜索优化",
  "具身智能",
];
export function filterResources(
  resources,
  {
    query = "",
    topic = "全部",
    kind = "全部",
    region = "全部",
    savedOnly = false,
    saved = [],
    sort = "精选优先",
  } = {},
) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return resources
    .filter(
      (r) =>
        terms.every((t) =>
          [r.title, r.originalTitle, r.source, r.description, ...r.topics]
            .join(" ")
            .toLowerCase()
            .includes(t),
        ) &&
        (topic === "全部" || r.topics.includes(topic)) &&
        (kind === "全部" || r.kind === kind) &&
        (region === "全部" || r.region === region) &&
        (!savedOnly || saved.includes(r.id)),
    )
    .sort((a, b) =>
      sort === "最近收录"
        ? b.addedAt.localeCompare(a.addedAt)
        : (b.featured || 0) - (a.featured || 0),
    );
}
export function rankResources(resources, profile) {
  return resources
    .map((r) => ({
      ...r,
      score:
        r.topics.filter((t) => profile.topics?.includes(t)).length * 3 +
        (r.level === profile.level ? 1 : 0),
      reason: r.topics.filter((t) => profile.topics?.includes(t)).join("、"),
    }))
    .sort((a, b) => b.score - a.score)
    .filter((r) => r.reason.length > 0);
}
