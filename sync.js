/* 学习系统 · 多设备进度同步（GitHub Contents API，进度存于私有仓库 study-progress） */
(function () {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
  const CFG_KEY = 'study_sync_cfg';
  function cfg() { try { return JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch (e) { return {}; } }
  function saveCfg(c) { localStorage.setItem(CFG_KEY, JSON.stringify(c)); }
  let timer = null;

  function collect() {
    const c = cfg();
    const out = { updated_at: new Date().toISOString(), device: c.device || 'unknown', courses: {} };
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.indexOf('study_sys_') === 0) {
        try { out.courses[k] = JSON.parse(localStorage.getItem(k)); } catch (e) {}
      }
    }
    return out;
  }
  function merge(remote) {
    const courses = remote.courses || {};
    for (const k in courses) {
      const imp = courses[k];
      let cur = {};
      try { cur = JSON.parse(localStorage.getItem(k) || '{}'); } catch (e) {}
      cur.learned = cur.learned || {};
      for (const no in (imp.learned || {})) {
        if (!cur.learned[no] || imp.learned[no] > cur.learned[no]) cur.learned[no] = imp.learned[no];
      }
      cur.reviews = cur.reviews || {};
      for (const no in (imp.reviews || {})) {
        const a = imp.reviews[no], b = cur.reviews[no];
        if (!b || (a.lastTs || 0) > (b.lastTs || 0)) cur.reviews[no] = a;
      }
      for (const map of ['qa', 'mc', 'cram']) {
        cur[map] = cur[map] || {};
        for (const no in (imp[map] || {})) {
          cur[map][no] = Object.assign({}, cur[map][no] || {}, imp[map][no]);
        }
      }
      localStorage.setItem(k, JSON.stringify(cur));
    }
  }
  const b64e = s => btoa(unescape(encodeURIComponent(s)));
  const b64d = s => decodeURIComponent(escape(atob(s.replace(/\n/g, ''))));

  async function pushNow() {
    const c = cfg();
    if (!c.token || !c.repo) return { ok: false, msg: '未配置同步' };
    try {
      const body = { message: 'sync ' + new Date().toISOString(), content: b64e(JSON.stringify(collect())) };
      if (c.sha) body.sha = c.sha;
      const resp = await fetch('https://api.github.com/repos/' + c.repo + '/contents/progress.json', {
        method: 'PUT',
        headers: { 'Authorization': 'token ' + c.token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (resp.ok) {
        const j = await resp.json();
        c.sha = j.content.sha; saveCfg(c);
        return { ok: true, msg: '已推送到云端' };
      }
      return { ok: false, msg: '推送失败 ' + resp.status + '（检查 token 权限）' };
    } catch (e) { return { ok: false, msg: '推送异常 ' + e.message }; }
  }
  async function pullMerge() {
    const c = cfg();
    if (!c.token || !c.repo) return { ok: false, msg: '未配置同步' };
    try {
      const resp = await fetch('https://api.github.com/repos/' + c.repo + '/contents/progress.json', {
        headers: { 'Authorization': 'token ' + c.token, 'Accept': 'application/vnd.github+json' }
      });
      if (resp.status === 404) return { ok: true, msg: '云端暂无进度（首次使用）' };
      if (!resp.ok) return { ok: false, msg: '拉取失败 ' + resp.status };
      const j = await resp.json();
      const remote = JSON.parse(b64d(j.content));
      merge(remote);
      c.sha = j.sha; saveCfg(c);
      return { ok: true, msg: '已拉取合并（云端更新于 ' + (remote.updated_at || '?').slice(0, 16).replace('T', ' ') + '，设备 ' + (remote.device || '?') + '）' };
    } catch (e) { return { ok: false, msg: '拉取异常 ' + e.message }; }
  }
  function pushSoon() {
    const c = cfg();
    if (!c.token || !c.repo || !c.auto) return;
    clearTimeout(timer);
    timer = setTimeout(async function () { const r = await pushNow(); if (window.console) console.log('[sync]', r.msg); }, 3000);
  }
  // 页面加载时自动拉取合并
  document.addEventListener('DOMContentLoaded', async function () {
    const c = cfg();
    if (c.token && c.repo) {
      const r = await pullMerge();
      if (window.console) console.log('[sync]', r.msg);
      if (window.render) try { render(); } catch (e) {}
    }
  });
  window.StudySync = { pushSoon: pushSoon, pushNow: pushNow, pullMerge: pullMerge, cfg: cfg, saveCfg: saveCfg, merge: merge };
})();
