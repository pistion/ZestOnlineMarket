(function () {
  function initSandboxControls() {
    const endpointLabel = document.querySelector("#sandboxEndpointValue");
    const reloadButton = document.querySelector("#sandboxReloadButton");
    const endpoint =
      document.body?.dataset?.buyerProfileEndpoint || "/api/sandbox/buyer-profile";

    if (endpointLabel) {
      endpointLabel.textContent = endpoint;
    }

    reloadButton?.addEventListener("click", () => {
      window.location.reload();
    });
  }

  document.addEventListener("DOMContentLoaded", initSandboxControls);
})();
