// 请用此代码完全替换您的 script.js 文件
document.addEventListener('DOMContentLoaded', function() {
    const statusMessage = document.getElementById('status-message');
    const lastRefreshSpan = document.getElementById('last-refresh');
    
    // 从 URL 获取当前语言
    const urlParams = new URLSearchParams(window.location.search);
    const lang = urlParams.get('lang') || 'zh';

    // 完整的翻译字典
    const translations = {
        'zh': {
            'container_id': '集装箱编号',
            'type': '类型',
            'status': '状态',
            'normal': '正常',
            'warning': '普通告警',
            'critical': '严重告警',
            'offline': '离线',
            'loading': '正在获取数据...',
            'error': '无法获取数据。请检查网络和服务器。',
            'plc_label': '设备',
            'area_label': '区',
            'status_key_normal': '正常运行',
            'status_key_warning': '普通告警',
            'status_key_critical': '严重告警',
            'status_key_offline': '设备离线',
            'last_refresh': '最后刷新'
        },
        'en': {
            'container_id': 'Container ID',
            'type': 'Type',
            'status': 'Status',
            'normal': 'Normal',
            'warning': 'Warning',
            'critical': 'Critical',
            'offline': 'Offline',
            'loading': 'Fetching data...',
            'error': 'Unable to fetch data. Check network and server.',
            'plc_label': 'PLCs',
            'area_label': 'Area',
            'status_key_normal': 'Normal',
            'status_key_warning': 'Warning',
            'status_key_critical': 'Critical',
            'status_key_offline': 'Offline',
            'last_refresh': 'Last Refresh'
        }
    };

    const areas = ['A', 'B', 'C', 'D'];
    let allPlcData = {};
    let pollingIndex = 0;
    const pollIntervals = [10000, 30000, 120000];

    // Helper function to show PLC IPs in a modal
    function showPlcIps(area, status) {
        const plcContainers = allPlcData[area]?.containers || {};
        const ips = Object.keys(plcContainers)
                      .filter(containerId => plcContainers[containerId].status === status)
                      .map(containerId => `${containerId}: ${plcContainers[containerId].ip}`);
        
        if (ips.length === 0) {
            return;
        }

        const modal = document.createElement('div');
        modal.classList.add('modal');
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h3>${area}${translations[lang].area_label} ${translations[lang][status]}${translations[lang].plc_label} (${ips.length})</h3>
                <ul>
                    ${ips.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.close-button').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // Helper function to render PLC brief cards
    function renderPlcBriefs(area, containers) {
        const plcList = document.querySelector(`.area-container[data-area="${area}"] .plc-list`);
        if (!plcList) return;
        
        plcList.innerHTML = '';
        const sortedContainerIds = Object.keys(containers).sort((a, b) => {
            const numA = parseInt(a.slice(1));
            const numB = parseInt(b.slice(1));
            return numA - numB;
        });

        sortedContainerIds.forEach(containerId => {
            const plcData = containers[containerId];
            const briefCard = document.createElement('a');
            briefCard.classList.add('plc-card', 'brief-card');
            
            // Determine the status class for the card
            let statusClass;
            if (plcData.status === 'critical') {
                statusClass = 'critical-card';
            } else if (plcData.status === 'warning') {
                statusClass = 'warning-card';
            } else if (plcData.status === 'offline') {
                statusClass = 'offline-card';
            } else {
                statusClass = 'normal-card';
            }
            briefCard.classList.add(statusClass);

            briefCard.innerHTML = `
                <div class="plc-status-indicator ${statusClass}"></div>
                <h3>${translations[lang].container_id}: ${containerId}</h3>
                <p><strong>IP:</strong> ${plcData.ip}</p>
                <p><strong>${translations[lang].status}:</strong> ${translations[lang][plcData.status]}</p>
            `;

            briefCard.href = `/details/${containerId}?lang=${lang}`;

            plcList.appendChild(briefCard);
        });
    }

    // Main function to update area summary and background color
    function updateAreaSummary(area, summary) {
        const areaContainer = document.querySelector(`.area-container[data-area="${area}"]`);
        const areaHeader = areaContainer.querySelector('.area-header');
        if (!areaHeader) return;

        // Reset class lists
        areaContainer.classList.remove('critical', 'offline', 'warning', 'normal');
        areaHeader.classList.remove('normal', 'warning', 'critical', 'offline');

        if (summary) {
            // Apply background color based on strict priority: critical > warning > offline > normal
            if (summary.critical > 0) {
                areaContainer.classList.add('critical');
            } else if (summary.warning > 0) {
                areaContainer.classList.add('warning');
            } else if (summary.offline > 0) {
                areaContainer.classList.add('offline');
            } else if (summary.normal === summary.total && summary.total > 0) {
                // This is the "all normal" case, applied only if all other high-priority issues are 0.
                areaContainer.classList.add('normal');
            }

            // Update summary counts
            areaHeader.querySelector('.total-count').textContent = summary.total;
            areaHeader.querySelector('[data-status="normal"]').textContent = summary.normal;
            areaHeader.querySelector('[data-status="critical"]').textContent = summary.critical;
            areaHeader.querySelector('[data-status="warning"]').textContent = summary.warning;
            areaHeader.querySelector('[data-status="offline"]').textContent = summary.offline;
        } else {
            // No data or error state
            areaContainer.classList.add('offline'); // Default to offline status when there is no data
            areaHeader.querySelector('.total-count').textContent = 0;
            areaHeader.querySelector('[data-status="normal"]').textContent = 0;
            areaHeader.querySelector('[data-status="critical"]').textContent = 0;
            areaHeader.querySelector('[data-status="warning"]').textContent = 0;
            areaHeader.querySelector('[data-status="offline"]').textContent = 0;
        }
        
        // Attach click handlers to status counts
        const statusCounts = areaHeader.querySelectorAll('.status-count');
        statusCounts.forEach(span => {
            span.onclick = (e) => {
                const clickedStatus = e.target.getAttribute('data-status');
                showPlcIps(area, clickedStatus);
            };
        });
        
        // Attach click handler for expanding/collapsing PLC list
        areaHeader.onclick = (e) => {
            if (!e.target.matches('.status-count')) {
                const plcList = areaContainer.querySelector('.plc-list');
                const isExpanded = plcList.classList.contains('expanded');
                
                if (isExpanded) {
                    plcList.classList.remove('expanded');
                } else {
                    renderPlcBriefs(area, allPlcData[area].containers);
                    plcList.classList.add('expanded');
                }
            }
        };
    }

    function fetchDataAndRender() {
        statusMessage.textContent = translations[lang].loading;
        
        fetch('/api/get_data')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                allPlcData = data;
                statusMessage.textContent = '';
                const now = new Date();
                lastRefreshSpan.textContent = `${now.toLocaleTimeString()}`;
                
                for (const area of areas) {
                    const areaData = allPlcData[area];
                    updateAreaSummary(area, areaData ? areaData.summary : null);
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                statusMessage.textContent = translations[lang].error;
                areas.forEach(area => {
                    updateAreaSummary(area, null);
                });
            })
            .finally(() => {
                const currentInterval = pollingIndex < pollIntervals.length ? pollIntervals[pollingIndex] : pollIntervals[pollIntervals.length - 1];
                pollingIndex++;
                setTimeout(fetchDataAndRender, currentInterval);
            });
    }

    fetchDataAndRender();
});
