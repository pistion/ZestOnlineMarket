// script.js
document.addEventListener('DOMContentLoaded', function() {
    const overviewEndpoint = document.body.dataset.sellerOverviewEndpoint || '/api/seller/me';
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebar = document.querySelector('.sidebar');
    const closeSidebar = document.querySelector('.close-sidebar');
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.dashboard-section');
    const pageTitle = document.getElementById('page-title');
    const switchAccountBtn = document.getElementById('sellerSwitchAccountBtn');
    const signOutBtn = document.getElementById('sellerSignOutBtn');
    const storeNameEl = document.getElementById('sellerDashboardStoreName');
    const storeStatusEl = document.getElementById('sellerDashboardStoreStatus');
    const storeMetricEl = document.getElementById('sellerDashboardStoreMetric');
    const visibilityMetricEl = document.getElementById('sellerDashboardVisibilityMetric');
    const templateChipEl = document.getElementById('sellerDashboardTemplateChip');
    const visibilityChipEl = document.getElementById('sellerDashboardVisibilityChip');
    const setupChipEl = document.getElementById('sellerDashboardSetupChip');
    const workspaceTitleEl = document.getElementById('sellerWorkspaceBannerTitle');
    const workspaceCopyEl = document.getElementById('sellerWorkspaceBannerCopy');
    const workspaceTemplatePillEl = document.getElementById('sellerWorkspaceTemplatePill');
    const workspaceVisibilityPillEl = document.getElementById('sellerWorkspaceVisibilityPill');
    const workspaceStepPillEl = document.getElementById('sellerWorkspaceStepPill');
    const workspacePrimaryActionEl = document.getElementById('sellerDashboardPrimaryAction');
    const workspaceTemplateActionEl = document.getElementById('sellerDashboardTemplateAction');
    const workspacePublicStoreLinkEl = document.getElementById('sellerDashboardPublicStoreLink');
    const healthCopyEl = document.getElementById('sellerHealthCopy');
    const actionQueueEl = document.getElementById('sellerActionQueue');
    const revenueMetricEl = document.getElementById('sellerRevenueMetric');
    const revenueTrendEl = document.getElementById('sellerRevenueTrend');
    const revenueCopyEl = document.getElementById('sellerRevenueCopy');
    const ordersMetricEl = document.getElementById('sellerOrdersMetric');
    const ordersTrendEl = document.getElementById('sellerOrdersTrend');
    const ordersCopyEl = document.getElementById('sellerOrdersCopy');
    const updatesMetricEl = document.getElementById('sellerUpdatesMetric');
    const updatesTrendEl = document.getElementById('sellerUpdatesTrend');
    const updatesCopyEl = document.getElementById('sellerUpdatesCopy');
    const productsMetricEl = document.getElementById('sellerProductsMetric');
    const productsTrendEl = document.getElementById('sellerProductsTrend');
    const productsCopyEl = document.getElementById('sellerProductsCopy');

    function formatVisibility(status) {
        const normalized = String(status || 'draft').trim().toLowerCase();
        if (normalized === 'published') {
            return 'Published storefront';
        }
        if (normalized === 'unpublished') {
            return 'Hidden storefront';
        }
        return 'Draft storefront';
    }

    function formatSetupStep(step, completed) {
        if (completed) {
            return 'Setup complete';
        }
        return `Step ${step || 1} of 4`;
    }

    function renderActionQueue(items) {
        if (!actionQueueEl) {
            return;
        }

        actionQueueEl.innerHTML = items
            .map((item) => `<li><i class="${item.icon}"></i> ${item.label}</li>`)
            .join('');
    }

    async function loadWorkspaceOverview() {
        try {
            const response = await fetch(overviewEndpoint, {
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                },
            });
            const data = await response.json().catch(() => null);
            if (!response.ok || !data || data.success === false) {
                return;
            }

            const store = data.store || {};
            const metrics = data.metrics || {};
            const completion = data.completion || {};
            const template = data.template || {};
            const lifecycle = data.lifecycle || {};
            const paths = data.paths || {};
            const visibilityLabel = lifecycle.visibilityLabel || formatVisibility(store.visibilityStatus);
            const setupLabel = formatSetupStep(completion.setupStep, completion.profileCompleted);
            const hasPublicStore = Boolean(paths.publicStore);
            const nextPrimaryHref = completion.profileCompleted
                ? (paths.settings || '/seller/store/settings')
                : (paths.setup || '/seller/store');
            const nextPrimaryLabel = completion.profileCompleted ? 'Open store settings' : 'Continue setup';
            const actionQueue = [];

            if (storeNameEl) {
                storeNameEl.textContent = store.storeName || 'Seller workspace';
            }
            if (storeStatusEl) {
                storeStatusEl.textContent = completion.profileCompleted
                    ? 'Store management and publishing workspace'
                    : `Setup in progress - step ${completion.setupStep || 1} of 4`;
            }
            if (templateChipEl) {
                templateChipEl.innerHTML = `<i class="fas fa-layer-group"></i> ${template.label || 'Products Store'}`;
            }
            if (visibilityChipEl) {
                visibilityChipEl.innerHTML = `<i class="fas fa-circle"></i> ${visibilityLabel}`;
            }
            if (setupChipEl) {
                setupChipEl.innerHTML = `<i class="fas fa-bolt"></i> ${setupLabel}`;
            }
            if (workspaceTitleEl) {
                workspaceTitleEl.textContent = completion.profileCompleted
                    ? `Manage ${store.storeName || 'your storefront'}`
                    : 'Finish your storefront setup';
            }
            if (workspaceCopyEl) {
                workspaceCopyEl.textContent = completion.profileCompleted
                    ? `Your ${template.label || 'storefront'} is ${visibilityLabel.toLowerCase()}. Review branding, listings, and publishing controls from one place.`
                    : `Your ${template.label || 'storefront'} is still being prepared. Finish the remaining steps, then publish when you are ready.`;
            }
            if (workspaceTemplatePillEl) {
                workspaceTemplatePillEl.textContent = template.family || 'Physical products';
            }
            if (workspaceVisibilityPillEl) {
                workspaceVisibilityPillEl.textContent = visibilityLabel;
            }
            if (workspaceStepPillEl) {
                workspaceStepPillEl.textContent = setupLabel;
            }
            if (workspacePrimaryActionEl) {
                workspacePrimaryActionEl.href = nextPrimaryHref;
                workspacePrimaryActionEl.textContent = nextPrimaryLabel;
            }
            if (workspaceTemplateActionEl) {
                workspaceTemplateActionEl.href = paths.templateManager || '/seller/store/template';
            }
            if (workspacePublicStoreLinkEl) {
                workspacePublicStoreLinkEl.hidden = !hasPublicStore;
                workspacePublicStoreLinkEl.href = paths.publicStore || '#';
            }
            if (healthCopyEl) {
                healthCopyEl.textContent = completion.profileCompleted
                    ? 'Use these signals to track whether your live store is visible, active, and ready for more listings or updates.'
                    : 'Use these signals to finish setup, confirm your template, and prepare the storefront for publishing.';
            }
            if (storeMetricEl) {
                storeMetricEl.innerHTML = `<i class="fas fa-store"></i> ${metrics.products || 0} listings`;
            }
            if (visibilityMetricEl) {
                visibilityMetricEl.innerHTML = `<i class="fas fa-location-dot"></i> ${visibilityLabel}`;
            }
            if (revenueMetricEl) {
                revenueMetricEl.innerHTML = `K${Number(metrics.revenue || 0).toFixed(2)} <span class="trend positive" id="sellerRevenueTrend">${metrics.revenue ? 'Live' : 'Waiting'}</span>`;
            }
            if (revenueCopyEl) {
                revenueCopyEl.textContent = completion.profileCompleted
                    ? (metrics.revenue
                        ? `Net revenue is now based on ${metrics.orders || 0} live orders flowing through this store.`
                        : 'Publish listings and complete your first checkout to start building real revenue data.')
                    : 'Complete store setup and publish the storefront before expecting live revenue reporting.';
            }
            if (ordersMetricEl) {
                ordersMetricEl.innerHTML = `${metrics.orders || 0} <span class="trend positive" id="sellerOrdersTrend">${metrics.orders ? 'Live' : 'Waiting'}</span>`;
            }
            if (ordersCopyEl) {
                ordersCopyEl.textContent = metrics.orders
                    ? 'Orders are now flowing into the seller workspace. Open Store Orders to manage fulfillment.'
                    : 'Once a buyer completes checkout, the order queue will appear here and in Store Orders.';
            }
            if (updatesMetricEl) {
                updatesMetricEl.innerHTML = `${metrics.updates || 0} <span class="trend positive" id="sellerUpdatesTrend">${metrics.updates ? 'Active' : 'Quiet'}</span>`;
            }
            if (updatesCopyEl) {
                updatesCopyEl.textContent = metrics.followers
                    ? `Followers: ${metrics.followers}. Store updates can now be used to keep that audience engaged.`
                    : 'Publish seller updates to start building a social storefront rhythm.';
            }
            if (productsMetricEl) {
                productsMetricEl.innerHTML = `${metrics.liveProducts || 0} <span class="trend negative" id="sellerProductsTrend">${metrics.draftProducts || 0} drafts</span>`;
            }
            if (productsCopyEl) {
                productsCopyEl.textContent = completion.profileCompleted
                    ? 'Use store settings and listing management to move drafts into the live storefront.'
                    : 'Finish onboarding to turn your draft storefront into a published seller space.';
            }

            if (!completion.profileCompleted) {
                actionQueue.push(
                    { icon: 'fas fa-store', label: 'Complete your store identity, branding, and socials.' },
                    { icon: 'fas fa-layer-group', label: `Keep the ${template.label || 'current'} template if it still matches how you sell.` },
                    { icon: 'fas fa-box-open', label: 'Finish your featured listing so the storefront is ready to publish.' }
                );
            } else {
                actionQueue.push(
                    { icon: 'fas fa-sliders', label: 'Review store settings and visibility controls before your next launch.' },
                    { icon: 'fas fa-layer-group', label: `Preview the ${template.label || 'current'} template and switch if your business has evolved.` },
                    { icon: 'fas fa-bullhorn', label: metrics.updates ? 'Keep followers engaged with fresh store updates.' : 'Publish your first store update to create a live storefront rhythm.' }
                );
            }

            if (!hasPublicStore) {
                actionQueue.push({
                    icon: 'fas fa-eye-slash',
                    label: 'Your public storefront is not visible yet. Publish it when you are ready.',
                });
            }

            renderActionQueue(actionQueue);
        } catch (_) {
            // ignore workspace overview failures and leave static fallback copy in place
        }
    }

    function clearSavedSession() {
        try {
            window.localStorage.removeItem('zestUser');
        } catch (_) {
            // ignore
        }
    }

    async function signOut() {
        try {
            await fetch('/auth/logout', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    redirectTo: '/auth/signin?signedOut=1&role=seller',
                }),
            });
        } catch (_) {
            // ignore
        } finally {
            clearSavedSession();
            window.location.href = '/auth/signin?signedOut=1&role=seller';
        }
    }

    // Sidebar toggle
    function toggleSidebar() {
        sidebar.classList.toggle('hidden');
    }

    toggleBtn.addEventListener('click', toggleSidebar);
    closeSidebar.addEventListener('click', toggleSidebar);

    // Navigation
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sectionId = e.target.dataset.section || e.currentTarget.dataset.section;
            const route = e.currentTarget.dataset.route;
            if (route) {
                window.location.href = route;
                return;
            }
            if (sectionId) {
                // Update active nav
                navBtns.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                // Show section
                sections.forEach(s => s.classList.remove('active'));
                const targetSection = document.getElementById(sectionId);
                if (targetSection) {
                    targetSection.classList.add('active');
                    pageTitle.textContent = e.currentTarget.textContent.trim() || 'Dashboard';
                }

                // Close sidebar on mobile
                if (window.innerWidth <= 768) {
                    sidebar.classList.add('hidden');
                }
            }
        });
    });

    // Initialize charts
    initCharts();
    loadWorkspaceOverview();

    if (switchAccountBtn) {
        switchAccountBtn.addEventListener('click', () => {
            clearSavedSession();
            window.location.href = '/auth/signin?role=seller';
        });
    }

    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            await signOut();
        });
    }

    function initCharts() {
        // Sales Overview Chart
        const salesCtx = document.getElementById('salesChart').getContext('2d');
        new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Sales ($)',
                    data: [12000, 19000, 15000, 22000, 18000, 24000],
                    borderColor: 'rgb(102, 126, 234)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

        // Sales Trends Chart
        const trendsCtx = document.getElementById('trendsChart')?.getContext('2d');
        if (trendsCtx) {
            new Chart(trendsCtx, {
                type: 'bar',
                data: {
                    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                    datasets: [{
                        label: 'Sales',
                        data: [50000, 60000, 70000, 80000],
                        backgroundColor: 'rgba(102, 126, 234, 0.6)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });
        }
    }

    console.log('Seller dashboard loaded');
});
