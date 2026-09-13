import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Compass,
  Bookmark,
  Mail,
  Search,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  BookOpen,
  GitFork as Github,
  SlidersHorizontal,
  X,
  Check,
  ChevronDown,
  Globe2,
  Layers3,
  Radio,
  GraduationCap,
  ExternalLink,
  Menu,
  RotateCcw,
} from "lucide-react";
import Artwork from "./Artwork";
import { topics, filterResources, rankResources } from "./catalog";
import "./style.css";
const api = import.meta.env.VITE_API_URL || "";
const repo = "https://github.com/giao-123-sun/frontier-courses";
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}
function App() {
  const [catalog, setCatalog] = useState(null),
    [error, setError] = useState(""),
    [page, setPage] = useState("发现"),
    [topic, setTopic] = useState("全部"),
    [query, setQuery] = useState(""),
    [kind, setKind] = useState("全部"),
    [region, setRegion] = useState("全部"),
    [sort, setSort] = useState("精选优先"),
    [modal, setModal] = useState(null),
    [saved, setSaved] = useState(() => read("frontier-saved", [])),
    [profile, setProfile] = useState(() =>
      read("frontier-profile", {
        topics: [],
        level: "入门",
        role: "",
        goal: "",
      }),
    ),
    [notice, setNotice] = useState(""),
    [status, setStatus] = useState({ email: false, ai: false }),
    [mobile, setMobile] = useState(false),
    [aiResults, setAiResults] = useState(null),
    [busy, setBusy] = useState(false);
  const searchRef = useRef();
  const fetchCatalog = () => {
    setError("");
    fetch(`${import.meta.env.BASE_URL}catalog.json`)
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setCatalog)
      .catch(() => setError("课程暂时加载失败，请重试。"));
  };
  useEffect(() => {
    fetchCatalog();
    fetch(`${api}/api/status`)
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("frontier-saved", JSON.stringify(saved));
    } catch {
      setNotice("浏览器无法保存收藏，请检查存储设置。");
    }
  }, [saved]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 4000);
      return () => clearTimeout(t);
    }
  }, [notice]);
  useEffect(() => {
    const sync = () => {
      const id = new URLSearchParams(location.hash.slice(1)).get("course");
      if (id && catalog) {
        const item = catalog.resources.find((r) => r.id === id);
        if (item) setModal({ type: "detail", item });
      } else setModal((m) => (m?.type === "detail" ? null : m));
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [catalog]);
  function close() {
    setModal(null);
    if (location.hash)
      history.replaceState(null, "", location.pathname + location.search);
  }
  function openDetail(item) {
    location.hash = `course=${item.id}`;
    setModal({ type: "detail", item });
  }
  function toggleSave(id) {
    setSaved((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  }
  function go(p) {
    setPage(p);
    setTopic("全部");
    setQuery("");
    setKind("全部");
    setRegion("全部");
    setMobile(false);
    setAiResults(null);
  }
  async function recommend() {
    if (!profile.topics.length) {
      setModal({ type: "profile" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${api}/api/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error);
      setAiResults(data);
      setNotice("已根据你的学习目标生成推荐");
    } catch {
      setNotice("智能推荐暂不可用，当前按兴趣匹配展示。");
    } finally {
      setBusy(false);
    }
  }
  let items = filterResources(catalog?.resources || [], {
    query,
    topic,
    kind,
    region,
    sort,
    savedOnly: page === "我的收藏",
    saved,
  });
  if (page === "为你推荐") {
    const ranks = rankResources(items, profile);
    items = aiResults
      ? aiResults.items
          .map((x) => ({
            ...items.find((r) => r.id === x.id),
            reason: x.reason,
          }))
          .filter((x) => x.id)
      : ranks;
  }
  const featured = catalog?.resources[0];
  return (
    <>
      <header className="topbar">
        <button
          className="mobile-menu icon-button"
          aria-label="打开导航"
          onClick={() => setMobile(!mobile)}
        >
          <Menu size={21} />
        </button>
        <button className="brand" onClick={() => go("发现")}>
          <span className="brand-icon">
            <Layers3 size={23} />
          </span>
          <strong>前沿课程</strong>
          <span className="brand-badge">开放学习</span>
        </button>
        <div className="searchbox">
          <Search size={18} />
          <input
            ref={searchRef}
            aria-label="搜索课程或项目"
            placeholder="搜索课程、大学或开源项目…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button aria-label="清空搜索" onClick={() => setQuery("")}>
              <X size={15} />
            </button>
          ) : (
            <span className="search-hint">发现新知</span>
          )}
        </div>
        <div className="header-actions">
          <a
            href={repo}
            target="_blank"
            rel="noreferrer"
            className="github-link"
            aria-label="查看开源仓库"
          >
            <Github size={20} />
            <span>开源共建</span>
          </a>
          <button
            className="primary small"
            onClick={() => setModal({ type: "subscribe" })}
          >
            <Mail size={16} />
            订阅更新
          </button>
          <button
            className="avatar"
            aria-label="设置学习兴趣"
            onClick={() => setModal({ type: "profile" })}
          >
            我
          </button>
        </div>
      </header>
      <aside className={`sidebar ${mobile ? "visible" : ""}`}>
        <div className="nav-label">探索学习</div>
        <nav>
          {[
            [Compass, "发现"],
            [Sparkles, "为你推荐"],
            [Bookmark, "我的收藏"],
          ].map(([Icon, label]) => (
            <button
              key={label}
              className={page === label ? "nav-item active" : "nav-item"}
              onClick={() => go(label)}
            >
              <Icon size={19} />
              {label}
              {label === "我的收藏" && saved.length > 0 && (
                <span className="count">{saved.length}</span>
              )}
              {label === "为你推荐" && <span className="dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="nav-label">关注的前沿</div>
        <nav className="topic-nav">
          {topics.map((t, i) => (
            <button
              key={t}
              className={`nav-item ${topic === t ? "selected" : ""}`}
              onClick={() => {
                setTopic(t);
                setPage("发现");
                setMobile(false);
              }}
            >
              <span className={`topic-dot t${i}`} />
              {t}
            </button>
          ))}
        </nav>
        <button
          className="manage-topics"
          onClick={() => setModal({ type: "profile" })}
        >
          ＋ 管理我的兴趣
        </button>
        <div className="sidebar-bottom">
          <div className="open-note">
            <Globe2 size={21} />
            <strong>好知识，没有围墙。</strong>
            <p>
              连接大学课堂与开源社区，
              <br />
              让前沿知识触手可及。
            </p>
            <a
              href={`${repo}/issues/new?template=resource.yml`}
              target="_blank"
              rel="noreferrer"
            >
              推荐一个资源 <ArrowUpRight size={14} />
            </a>
          </div>
          <button
            className="source-nav"
            onClick={() => setModal({ type: "sources" })}
          >
            <Radio size={16} />
            来源与更新状态
          </button>
          <div className="sidebar-footer">开放源代码 · 尊重原创</div>
        </div>
      </aside>
      <main>
        <div className="intro-line">
          <span>
            <span className="live-dot" />
            保持好奇，持续向前
          </span>
          <span className="date">
            {catalog
              ? `来源核验 ${catalog.resources[0]?.verifiedAt.replaceAll("-", ".")}`
              : "正在连接课程目录"}
          </span>
        </div>
        {page === "发现" &&
          !query &&
          topic === "全部" &&
          kind === "全部" &&
          region === "全部" && (
            <>
              <div className="page-heading">
                <div>
                  <h1>
                    下一步，学什么<span>？</span>
                  </h1>
                  <p>发现全球大学的前沿课程，和正在发生的开源实践。</p>
                </div>
                <button
                  className="text-action"
                  onClick={() => {
                    go("为你推荐");
                    if (!profile.topics.length) setModal({ type: "profile" });
                  }}
                >
                  找到我的学习方向 <ArrowUpRight size={17} />
                </button>
              </div>
              <div className="spotlight-row">
                {featured && (
                  <button
                    className="spotlight"
                    onClick={() => openDetail(featured)}
                  >
                    <div className="spotlight-copy">
                      <span className="eyebrow">
                        <span /> 前沿观察 · 世界模型
                      </span>
                      <h2>
                        不止生成答案，
                        <br />
                        开始理解世界。
                      </h2>
                      <p>从预测到决策，探索世界模型的下一步。</p>
                      <div className="spotlight-foot">
                        <span className="school-mark">P</span>
                        <span>
                          宾夕法尼亚大学 <small>世界模型 · 课程目录</small>
                        </span>
                        <span className="round-arrow">
                          <ArrowUpRight size={22} />
                        </span>
                      </div>
                    </div>
                    <Artwork type="world" code="世界模型" large />
                  </button>
                )}
                <div className="digest-card">
                  <span className="mini-icon">
                    <Mail size={20} />
                  </span>
                  <span className="eyebrow">你的每周前沿简报</span>
                  <h2>
                    少一点信息过载，
                    <br />
                    多一点学习方向。
                  </h2>
                  <p>
                    只关注你感兴趣的话题，
                    <br />
                    有新内容时，在邮箱里相见。
                  </p>
                  <button onClick={() => setModal({ type: "subscribe" })}>
                    定制我的简报 <ArrowRight size={17} />
                  </button>
                  <small>按周汇总 · 随时退订</small>
                </div>
              </div>
            </>
          )}
        {page !== "发现" && (
          <div className="page-heading">
            <div>
              <h1>
                {page}
                <span>。</span>
              </h1>
              <p>
                {page === "我的收藏"
                  ? "把值得学习的内容，留给下一次专注。"
                  : aiResults
                    ? "根据你的学习目标生成，并附上推荐理由。"
                    : "根据你选择的主题与学习基础匹配，兴趣只保存在本机。"}
              </p>
            </div>
            {page === "为你推荐" && (
              <button
                className="secondary"
                onClick={() => setModal({ type: "profile" })}
              >
                <SlidersHorizontal size={16} />
                调整兴趣
              </button>
            )}
          </div>
        )}
        <section className="catalog-section">
          <div className="section-heading">
            <h2>
              {query
                ? `搜索结果`
                : topic !== "全部"
                  ? topic
                  : page === "发现"
                    ? "值得打开的新世界"
                    : page === "我的收藏"
                      ? "已收藏的资源"
                      : "你的学习清单"}
              <span>{items.length}</span>
            </h2>
            <div className="view-controls">
              {page === "为你推荐" && status.ai && (
                <button
                  className="text-action"
                  onClick={recommend}
                  disabled={busy}
                >
                  <Sparkles size={16} />
                  {busy ? "正在生成…" : "按学习目标智能推荐"}
                </button>
              )}
              <label className="sort-label">
                <select
                  aria-label="排序方式"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option>精选优先</option>
                  <option>最近收录</option>
                </select>
                <ChevronDown size={14} />
              </label>
            </div>
          </div>
          <div className="filter-row">
            <div className="topic-pills">
              {["全部", ...topics].map((t) => (
                <button
                  key={t}
                  className={topic === t ? "pill selected" : "pill"}
                  onClick={() => setTopic(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="secondary-filters">
              <label>
                <select
                  aria-label="资源类型"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  <option value="全部">所有类型</option>
                  <option>大学课程</option>
                  <option>开源项目</option>
                </select>
              </label>
              <label>
                <select
                  aria-label="来源地区"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  <option value="全部">所有地区</option>
                  <option>中国</option>
                  <option>美国</option>
                  <option>国际</option>
                </select>
              </label>
            </div>
          </div>
          {error ? (
            <div className="empty">
              <h3>{error}</h3>
              <button className="secondary" onClick={fetchCatalog}>
                <RotateCcw size={16} />
                重新加载
              </button>
            </div>
          ) : !catalog ? (
            <div className="loading-grid">
              {[1, 2, 3].map((x) => (
                <div className="skeleton" key={x} />
              ))}
            </div>
          ) : items.length ? (
            <div className="resource-grid">
              {items.map((r) => (
                <article className="resource-card" key={r.id}>
                  <button
                    className="card-cover"
                    onClick={() => openDetail(r)}
                    aria-label={`查看${r.title}`}
                  >
                    <Artwork type={r.art} code={r.code} />
                    <span className="type-badge">
                      {r.kind === "大学课程" ? (
                        <GraduationCap size={12} />
                      ) : (
                        <Github size={12} />
                      )}{" "}
                      {r.kind}
                    </span>
                    <span className="cover-arrow">
                      <ArrowUpRight size={17} />
                    </span>
                  </button>
                  <div className="card-meta">
                    <span
                      className={`source-avatar ${r.region === "中国" ? "chinese" : ""}`}
                    >
                      {r.source[0]}
                    </span>
                    <span>{r.source}</span>
                    <span className="verified" title="来源已人工核验">
                      <Check size={11} />
                    </span>
                    <button
                      className={`save-button ${saved.includes(r.id) ? "saved" : ""}`}
                      aria-label={`${saved.includes(r.id) ? "取消收藏" : "收藏"}${r.title}`}
                      onClick={() => toggleSave(r.id)}
                    >
                      <Bookmark
                        size={17}
                        fill={saved.includes(r.id) ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                  <button className="card-title" onClick={() => openDetail(r)}>
                    <h3>{r.title}</h3>
                  </button>
                  <p className="card-description">{r.description}</p>
                  <div className="card-tags">
                    <span>{r.topics[0]}</span>
                    <small>
                      {r.language} <i /> {r.level}
                    </small>
                  </div>
                  {page === "为你推荐" && r.reason && (
                    <p className="recommend-reason">
                      <Sparkles size={12} />{" "}
                      {aiResults ? r.reason : `符合你的兴趣：${r.reason}`}
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">
              <BookOpen size={32} />
              <h3>
                {page === "我的收藏"
                  ? "还没有收藏课程"
                  : page === "为你推荐" && !profile.topics.length
                    ? "先告诉我们，你想学什么"
                    : "没有找到匹配的资源"}
              </h3>
              <p>
                {page === "我的收藏"
                  ? "点击课程旁的收藏图标，建立你的学习清单。"
                  : "尝试调整主题、搜索词或来源条件。"}
              </p>
              <button
                className="secondary"
                onClick={() =>
                  page === "为你推荐"
                    ? setModal({ type: "profile" })
                    : go("发现")
                }
              >
                {page === "为你推荐" ? "设置学习兴趣" : "浏览全部资源"}
              </button>
            </div>
          )}
        </section>
        <footer className="main-footer">
          <span>保持好奇，下一次突破就从这里开始。</span>
          <button onClick={() => setModal({ type: "sources" })}>
            查看收录原则 <ArrowUpRight size={13} />
          </button>
        </footer>
      </main>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      {modal && (
        <Dialog
          close={close}
          title={
            modal.type === "detail"
              ? modal.item.title
              : modal.type === "profile"
                ? "你的兴趣，决定下一站"
                : modal.type === "subscribe"
                  ? "把前沿，送到你的邮箱"
                  : "来源与收录原则"
          }
        >
          {modal.type === "detail" ? (
            <Detail
              item={modal.item}
              saved={saved.includes(modal.item.id)}
              toggle={() => toggleSave(modal.item.id)}
            />
          ) : modal.type === "profile" ? (
            <Profile
              profile={profile}
              ai={status.ai}
              save={(p) => {
                setProfile(p);
                setAiResults(null);
                try {
                  localStorage.setItem("frontier-profile", JSON.stringify(p));
                } catch {}
                close();
                go("为你推荐");
                setNotice("学习兴趣已保存在这台设备");
              }}
            />
          ) : modal.type === "subscribe" ? (
            <Subscribe profile={profile} status={status} />
          ) : (
            <Sources catalog={catalog} />
          )}
        </Dialog>
      )}
    </>
  );
}
function Dialog({ children, close, title }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => {
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="dialog-head">
        <span>前沿课程</span>
        <button className="icon-button" onClick={close} aria-label="关闭弹窗">
          <X size={21} />
        </button>
      </div>
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}
function Detail({ item: r, saved, toggle }) {
  return (
    <div className="detail">
      <Artwork type={r.art} code={r.code} />
      <div className="detail-byline">
        {r.source} · {r.author}
      </div>
      <p className="original-title">原始名称：{r.originalTitle}</p>
      <p>{r.description}</p>
      <div className="detail-facts">
        <div>
          <small>学习门槛</small>
          <strong>{r.level}</strong>
        </div>
        <div>
          <small>资料语言</small>
          <strong>{r.language}</strong>
        </div>
        <div>
          <small>开放程度</small>
          <strong>{r.access}</strong>
        </div>
      </div>
      <h3>你将探索</h3>
      <ul>
        {r.outcomes.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <h3>开始之前</h3>
      <p>{r.prerequisites}</p>
      <div className="detail-note">
        {r.note}
        <br />
        来源核验：{r.verifiedAt} · 收录：{r.addedAt}
      </div>
      <div className="detail-actions">
        <a className="primary" href={r.url} target="_blank" rel="noreferrer">
          前往原始资源 <ExternalLink size={16} />
        </a>
        <button className="secondary" onClick={toggle}>
          <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
          {saved ? "已收藏" : "收藏课程"}
        </button>
      </div>
      <small className="source-url">{r.url}</small>
      <p className="art-credit">封面为本站原创主题插图，并非课程官方封面。</p>
    </div>
  );
}
function TopicPicker({ value, onChange }) {
  return (
    <div className="topic-picker">
      {topics.map((t) => (
        <button
          type="button"
          key={t}
          aria-pressed={value.includes(t)}
          className={value.includes(t) ? "selected" : ""}
          onClick={() =>
            onChange(
              value.includes(t) ? value.filter((x) => x !== t) : [...value, t],
            )
          }
        >
          {value.includes(t) && <Check size={13} />} {t}
        </button>
      ))}
    </div>
  );
}
function Profile({ profile, save, ai }) {
  const [p, setP] = useState(profile);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(p);
      }}
      className="form"
    >
      <p>选择你想探索的方向，建立更适合自己的学习清单。</p>
      <label>感兴趣的话题</label>
      <TopicPicker
        value={p.topics}
        onChange={(topics) => setP({ ...p, topics })}
      />
      <label htmlFor="level">目前的学习基础</label>
      <select
        id="level"
        value={p.level}
        onChange={(e) => setP({ ...p, level: e.target.value })}
      >
        <option>入门</option>
        <option>进阶</option>
      </select>
      <label htmlFor="role">
        你的角色 <small>选填</small>
      </label>
      <input
        id="role"
        maxLength="80"
        value={p.role}
        onChange={(e) => setP({ ...p, role: e.target.value })}
        placeholder="例如：产品经理、开发者、研究生"
      />
      <label htmlFor="goal">
        想解决什么问题 <small>选填</small>
      </label>
      <textarea
        id="goal"
        maxLength="500"
        value={p.goal}
        onChange={(e) => setP({ ...p, goal: e.target.value })}
        placeholder="例如：做一个能够检索资料、完成研究报告的智能体"
      />
      <div className="privacy-note">
        信息保存在本机，可随时清除。
        {ai
          ? "只有主动点击智能推荐时，角色与目标才会发送给推荐服务。"
          : "当前根据兴趣与学习基础匹配；智能推荐尚未接通。"}
      </div>
      <button className="primary" disabled={!p.topics.length}>
        保存并查看推荐 <ArrowRight size={16} />
      </button>
      <button
        type="button"
        className="text-action"
        onClick={() => {
          const cleared = { topics: [], level: "入门", role: "", goal: "" };
          setP(cleared);
          save(cleared);
        }}
      >
        清除个人信息
      </button>
    </form>
  );
}
function Subscribe({ profile, status }) {
  const [selected, setSelected] = useState(profile.topics),
    [email, setEmail] = useState(""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [success, setSuccess] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`${api}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, topics: selected, consent }),
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || "提交失败，请稍后重试");
      setSuccess(true);
      setMessage(data.message);
    } catch (e) {
      setMessage(e.message || "连接失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <p>每周汇总关注话题的新收录与内容更新，没有更新就不打扰。</p>
      {!status.email && (
        <div className="service-notice">
          <Mail size={20} />
          <div>
            <strong>邮件订阅尚未开放</strong>
            <p>
              发件服务接通后即可使用。目前可以收藏课程、保存兴趣，或关注开源仓库更新。
            </p>
          </div>
        </div>
      )}
      <label htmlFor="email">邮箱地址</label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        required
        maxLength="254"
        placeholder="you@example.com"
        value={email}
        disabled={!status.email || success}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label>只接收这些话题</label>
      <TopicPicker value={selected} onChange={setSelected} />
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        我同意保存邮箱与订阅主题，用于发送确认邮件和每周更新。每封简报均提供退订与删除入口。
      </label>
      <button
        className="primary"
        disabled={
          !status.email || !consent || !selected.length || busy || success
        }
      >
        {success ? "请到邮箱确认订阅" : busy ? "正在发送…" : "发送订阅确认邮件"}
        <ArrowRight size={16} />
      </button>
      {message && (
        <p
          className={success ? "success-message" : "error-message"}
          role="status"
        >
          {message}
        </p>
      )}
      <div className="privacy-note">
        确认邮箱后订阅才会生效。邮箱不会进入公开仓库，也不会用于人工智能推荐。待确认邮箱
        48 小时后自动删除。
      </div>
    </form>
  );
}
function Sources({ catalog }) {
  return (
    <div className="sources">
      <p>
        只整理公开的大学课程页面与开源项目，为每个资源保留原始链接。课程介绍由本站概括，封面为本站原创插图，原始资料版权归原作者。
      </p>
      <h3>怎样保持更新</h3>
      <p>
        每天检查已配置的中美大学课程来源与开源项目，记录页面变化。自动发现的候选资源经人工核验后进入课程列表；页面发生变化不等于开设新课。
      </p>
      <p>
        最近采集：
        {catalog?.collectedAt
          ? new Date(catalog.collectedAt).toLocaleString("zh-CN")
          : "首次采集尚未完成"}
        <br />
        当前收录：{catalog?.resources.length || 0} 项 · 待核验候选：
        {catalog?.candidates?.length || 0} 项
      </p>
      {catalog?.checks?.map((c) => (
        <div className="source-check" key={c.id}>
          <span>{c.name}</span>
          <span className={c.ok ? "ok" : "muted"}>
            {c.ok ? "已检查" : c.message || "暂时无法访问"}
          </span>
        </div>
      ))}
      <h3>关于开放学习</h3>
      <p>
        公开网页不等于免费入学或提供完整录像。开放程度、授课学期和先修要求都在详情页注明，具体安排以原始来源为准。
      </p>
      <a
        className="secondary"
        href={`${repo}/issues/new?template=resource.yml`}
        target="_blank"
        rel="noreferrer"
      >
        提交资源或纠错 <ArrowUpRight size={16} />
      </a>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
