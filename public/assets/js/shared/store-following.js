(function () {
  const STORAGE_KEY = "zest-followed-stores";

  const state = {
    handles: [],
    loaded: false,
    source: "local",
    remoteEnabled: false,
  };

  function normalizeHandle(handle) {
    return String(handle || "")
      .trim()
      .replace(/^@+/, "")
      .toLowerCase();
  }

  function uniqueHandles(handles) {
    return [...new Set((handles || []).map(normalizeHandle).filter(Boolean))];
  }

  function readLocalHandles() {
    try {
      const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(raw) ? uniqueHandles(raw) : [];
    } catch (error) {
      return [];
    }
  }

  function writeLocalHandles(handles) {
    const normalized = uniqueHandles(handles);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      // Ignore storage failures so the UI can still render.
    }

    return normalized;
  }

  function dispatchChange() {
    window.dispatchEvent(
      new CustomEvent("zest:followed-stores-changed", {
        detail: {
          handles: state.handles.slice(),
          source: state.source,
        },
      })
    );
  }

  function applyHandles(handles, source) {
    state.handles = writeLocalHandles(handles);
    state.source = source || state.source;
    state.loaded = true;
    dispatchChange();
    return state.handles.slice();
  }

  async function fetchJson(path, options) {
    const response = await fetch(path, {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(options && options.headers ? options.headers : {}),
      },
      ...options,
    });

    const payload = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      payload,
    };
  }

  async function loadRemoteHandles() {
    const result = await fetchJson("/api/buyer/following");
    if (!result.ok || !result.payload || result.payload.success === false) {
      return {
        ok: false,
        status: result.status,
        payload: result.payload,
      };
    }

    const following = Array.isArray(result.payload.following) ? result.payload.following : [];
    return {
      ok: true,
      status: result.status,
      handles: following.map((store) => store && store.handle).filter(Boolean),
    };
  }

  async function init(force) {
    if (state.loaded && !force) {
      return state.handles.slice();
    }

    const localHandles = readLocalHandles();
    state.handles = localHandles.slice();

    const remoteResult = await loadRemoteHandles().catch(() => null);
    if (remoteResult && remoteResult.ok) {
      state.remoteEnabled = true;
      return applyHandles(remoteResult.handles, "remote");
    }

    if (remoteResult && ![401, 403].includes(Number(remoteResult.status || 0))) {
      state.remoteEnabled = true;
      return applyHandles([], "remote");
    }

    state.loaded = true;
    state.source = "local";
    state.remoteEnabled = false;
    dispatchChange();
    return state.handles.slice();
  }

  async function updateRemoteFollow(method, handle) {
    const normalized = normalizeHandle(handle);
    if (!normalized) {
      return null;
    }

    const result = await fetchJson(`/api/buyer/following/${encodeURIComponent(normalized)}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    }).catch(() => null);

    if (!result) {
      return {
        ok: false,
        fallbackAllowed: true,
        message: "",
      };
    }

    if (!result.ok || !result.payload || result.payload.success === false) {
      const remoteOnly = ![401, 403].includes(Number(result.status || 0));
      if (remoteOnly) {
        state.remoteEnabled = true;
      }

      return {
        ok: false,
        fallbackAllowed: !remoteOnly,
        message: (result.payload && result.payload.message) || "Unable to update followed store.",
      };
    }

    const handles = Array.isArray(result.payload.handles) ? result.payload.handles : [];
    state.remoteEnabled = true;
    applyHandles(handles, "remote");
    return {
      ok: true,
      following: Boolean(result.payload.following),
      handles: state.handles.slice(),
    };
  }

  function applyLocalToggle(handle, mode) {
    const normalized = normalizeHandle(handle);
    if (!normalized) {
      return {
        following: false,
        handles: state.handles.slice(),
      };
    }

    const current = state.handles.slice();
    const alreadyFollowing = current.includes(normalized);
    let following = alreadyFollowing;
    let nextHandles = current;

    if (mode === "follow") {
      following = true;
      nextHandles = alreadyFollowing ? current : current.concat([normalized]);
    } else if (mode === "unfollow") {
      following = false;
      nextHandles = current.filter((item) => item !== normalized);
    } else {
      following = !alreadyFollowing;
      nextHandles = following
        ? current.concat([normalized])
        : current.filter((item) => item !== normalized);
    }

    applyHandles(nextHandles, "local");
    return {
      following,
      handles: state.handles.slice(),
    };
  }

  async function follow(handle) {
    await init();
    const remoteResult = await updateRemoteFollow("POST", handle);
    if (remoteResult && remoteResult.ok) {
      return remoteResult;
    }

    if (remoteResult && !remoteResult.fallbackAllowed) {
      return {
        following: state.handles.includes(normalizeHandle(handle)),
        handles: state.handles.slice(),
        error: remoteResult.message || "Unable to follow this store.",
      };
    }

    return applyLocalToggle(handle, "follow");
  }

  async function unfollow(handle) {
    await init();
    const remoteResult = await updateRemoteFollow("DELETE", handle);
    if (remoteResult && remoteResult.ok) {
      return remoteResult;
    }

    if (remoteResult && !remoteResult.fallbackAllowed) {
      return {
        following: state.handles.includes(normalizeHandle(handle)),
        handles: state.handles.slice(),
        error: remoteResult.message || "Unable to unfollow this store.",
      };
    }

    return applyLocalToggle(handle, "unfollow");
  }

  async function toggle(handle) {
    await init();
    return state.handles.includes(normalizeHandle(handle))
      ? unfollow(handle)
      : follow(handle);
  }

  state.handles = readLocalHandles();

  window.ZestStoreFollowing = {
    init,
    refresh() {
      return init(true);
    },
    list() {
      return state.handles.slice();
    },
    count() {
      return state.handles.length;
    },
    isFollowing(handle) {
      const normalized = normalizeHandle(handle);
      return normalized ? state.handles.includes(normalized) : false;
    },
    follow,
    unfollow,
    toggle,
  };
})();
