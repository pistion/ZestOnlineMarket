(function () {
  const STATE = {
    stack: null,
  };

  function ensureStack() {
    if (STATE.stack) {
      return STATE.stack;
    }

    const existing = document.getElementById("toast-container");
    const stack = existing || document.createElement("div");
    stack.className = "zest-toast-stack";
    if (!existing) {
      document.body.appendChild(stack);
    }
    STATE.stack = stack;
    return stack;
  }

  function show(message, tone = "default") {
    if (!message) {
      return null;
    }

    const stack = ensureStack();
    const toast = document.createElement("div");
    toast.className = `zest-toast${tone !== "default" ? ` zest-toast--${tone}` : ""}`;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.textContent = String(message);
    stack.appendChild(toast);

    window.requestAnimationFrame(() => {
      toast.classList.add("is-visible");
    });

    window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 220);
    }, 2600);

    return toast;
  }

  window.ZestToast = {
    error(message) {
      return show(message, "error");
    },
    info(message) {
      return show(message, "default");
    },
    success(message) {
      return show(message, "success");
    },
  };
})();
