(function () {
  const toast = window.ZestToast || {
    success(message) {
      if (message) {
        console.log(message);
      }
    },
    error(message) {
      if (message) {
        console.error(message);
      }
    },
  };

  async function patchJson(path, payload) {
    const response = await fetch(path, {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok || !body || body.success === false) {
      throw new Error((body && body.message) || "Request failed");
    }

    return body;
  }

  document.addEventListener("submit", async (event) => {
    const userForm = event.target.closest("[data-admin-user-form]");
    if (userForm) {
      event.preventDefault();
      const userId = userForm.getAttribute("data-user-id");
      const formData = new FormData(userForm);
      const payload = {
        status: formData.get("status"),
        note: formData.get("note"),
      };

      try {
        const result = await patchJson(`/admin/api/users/${encodeURIComponent(userId)}/status`, payload);
        const statusEl = document.querySelector(`[data-user-status="${userId}"]`);
        if (statusEl && result.user) {
          statusEl.textContent = result.user.status;
          statusEl.classList.toggle("admin-badge--danger", result.user.status === "suspended");
        }
        toast.success("User status updated.");
      } catch (error) {
        toast.error(error.message || "Could not update the user.");
      }
      return;
    }

    const reportForm = event.target.closest("[data-admin-report-form]");
    if (reportForm) {
      event.preventDefault();
      const reportId = reportForm.getAttribute("data-report-id");
      const formData = new FormData(reportForm);
      const payload = {
        status: formData.get("status"),
        note: formData.get("note"),
      };

      try {
        const result = await patchJson(`/admin/api/reports/${encodeURIComponent(reportId)}/status`, payload);
        const statusEl = document.querySelector(`[data-report-status="${reportId}"]`);
        if (statusEl && result.report) {
          statusEl.textContent = result.report.status;
          statusEl.classList.toggle("admin-badge--success", result.report.status === "resolved");
          statusEl.classList.toggle("admin-badge--danger", result.report.status === "rejected");
        }
        toast.success("Report updated.");
      } catch (error) {
        toast.error(error.message || "Could not update the report.");
      }
    }
  });
})();
