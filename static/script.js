document.addEventListener('DOMContentLoaded', function() {
    const statusMessage = document.getElementById('status-message');
    const lastRefreshSpan = document.getElementById('last-refresh');
    
    const urlParams = new URLSearchParams(window.location.search);
    const lang = urlParams.get('lang') || 'zh';
    const REFRESH_INTERVAL_MS = 20000;

    const translations = {
        'zh': {
            'container_id': '集装箱编号',
            'type': '类型',
            'status': '状态',
            'vendor': '供应商',
            'normal': '正常',
            'warning': '普通告警',
            'critical': '严重告警',
            'offline': '离线',
            'loading': '正在获取数据...',
            'error': '无法获取数据。请检查网络和服务器。',
            'plc_label': '设备',
            'area_label': '-区',
            'status_key_normal': '正常运行',
            'status_key_warning': '普通告警',
            'status_key_critical': '严重告警',
            'status_key_offline': '设备离线',
            'last_refresh': '最后刷新',
            'alarm_details_title': '告警详情',
            'alarm_type': '告警类型',
            'alarm_description': '告警描述',
            'no_alarms': '该设备目前没有告警信息'
        },
        'en': {
            'container_id': 'Container ID',
            'type': 'Type',
            'status': 'Status',
            'vendor': 'Vendor',
            'normal': 'Normal',
            'warning': 'Warning',
            'critical': 'Critical',
            'offline': 'Offline',
            'loading': 'Fetching data...',
            'error': 'Unable to fetch data. Check network and server.',
            'plc_label': 'PLCs',
            'area_label': '-Area',
            'status_key_normal': 'Normal',
            'status_key_warning': 'Warning',
            'status_key_critical': 'Critical',
            'status_key_offline': 'Offline',
            'last_refresh': 'Last Refresh',
            'alarm_details_title': 'Alarm Details',
            'alarm_type': 'Alarm Type',
            'alarm_description': 'Alarm Description',
            'no_alarms': 'There is currently no information available for this device'
        }
    };

    const areas = ['A', 'B', 'C', 'D'];
    let allPlcData = {};

    function showModal(title, content) {
        const modal = document.createElement('div');
        modal.classList.add('modal');
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h3>${title}</h3>
                <div class="modal-body">${content}</div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.close-button').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    function showPlcList(area, status) {
        const plcContainers = allPlcData[area]?.containers || {};
        const ips = Object.keys(plcContainers)
                      .filter(containerId => plcContainers[containerId].status === status)
                      .map(containerId => `${containerId}: ${plcContainers[containerId].ip}`);
        
        if (ips.length === 0) {
            showModal(`${area}${translations[lang].area_label} ${translations[lang][status]}${translations[lang].plc_label}`, 
                      `<p>没有找到相关设备。</p>`);
            return;
        }

        const content = `<ul>${ips.map(item => `<li>${item}</li>`).join('')}</ul>`;
        showModal(`${area}${translations[lang].area_label} ${translations[lang][status]}${translations[lang].plc_label} (${ips.length})`, content);
    }
    
    function showAlarmList(area, status) {
        const plcContainers = allPlcData[area]?.containers || {};
        const alarmingContainers = Object.keys(plcContainers)
                                      .filter(containerId => plcContainers[containerId].status === status);

        if (alarmingContainers.length === 0) {
            showModal(`${area}${translations[lang].area_label} - ${translations[lang][status]}`, 
                      `<p>${translations[lang].no_alarms}</p>`);
            return;
        }

        const content = alarmingContainers.map(containerId => {
            const plcData = plcContainers[containerId];
            const alarms = plcData.Result?.Summary?.AlarmRuntime || [];
            
            let alarmContent = `<p>${translations[lang].no_alarms}</p>`;
            if (alarms.length > 0) {
                alarmContent = `<ul>${alarms.map(alarm => {
                    const description = alarm.trim();
                    
                    return `
                    <li>
                        <strong>${translations[lang].alarm_description}:</strong> <span style="color: red;">${description}</span>
                    </li>
                    `;
                }).join('')}</ul>`;
            }
            
            return `<div class="alarm-group">
                        <h4>${translations[lang].container_id}: ${containerId}</h4>
                        ${alarmContent}
                    </div>`;
        }).join('');
        
        showModal(`${area}${translations[lang].area_label} - ${translations[lang][status]}`, content);
    }

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
            
            const vendor = plcData.vendor || 'N/A';
            const statusText = translations[lang][plcData.status];
            
            briefCard.innerHTML = `
                <div class="plc-status-indicator ${statusClass}"></div>
                <h3>${translations[lang].container_id}: ${containerId}</h3>
                <p><strong>${translations[lang].vendor}:</strong> ${vendor}</p>
                <p><strong>IP:</strong> ${plcData.ip}</p>
                <p><strong>${translations[lang].status}:</strong> ${statusText}</p>
            `;

            briefCard.href = `/details/${containerId}?lang=${lang}`;

            plcList.appendChild(briefCard);
        });
    }

    function updateAreaSummary(area, summary) {
        const areaContainer = document.querySelector(`.area-container[data-area="${area}"]`);
        const areaHeader = areaContainer.querySelector('.area-header');
        if (!areaHeader) return;
        
        areaContainer.classList.remove('critical', 'offline', 'warning', 'normal');
        areaHeader.classList.remove('normal', 'warning', 'critical', 'offline');

        if (summary) {
            if (summary.critical > 0) {
                areaContainer.classList.add('critical');
            } else if (summary.warning > 0) {
                areaContainer.classList.add('warning');
            } else if (summary.offline > 0) {
                areaContainer.classList.add('offline');
            } else if (summary.normal === summary.total && summary.total > 0) {
                areaContainer.classList.add('normal');
            }

            areaHeader.querySelector('.total-count').textContent = summary.total;
            areaHeader.querySelector('[data-status="normal"]').textContent = summary.normal;
            areaHeader.querySelector('[data-status="critical"]').textContent = summary.critical;
            areaHeader.querySelector('[data-status="warning"]').textContent = summary.warning;
            areaHeader.querySelector('[data-status="offline"]').textContent = summary.offline;
        } else {
            areaContainer.classList.add('offline'); 
            areaHeader.querySelector('.total-count').textContent = 0;
            areaHeader.querySelector('[data-status="normal"]').textContent = 0;
            areaHeader.querySelector('[data-status="critical"]').textContent = 0;
            areaHeader.querySelector('[data-status="warning"]').textContent = 0;
            areaHeader.querySelector('[data-status="offline"]').textContent = 0;
        }
        
        const statusCounts = areaHeader.querySelectorAll('.status-count');
        statusCounts.forEach(span => {
            span.onclick = (e) => {
                e.stopPropagation();
                const clickedStatus = e.target.getAttribute('data-status');
                
                if (clickedStatus === 'critical' || clickedStatus === 'warning') {
                    showAlarmList(area, clickedStatus);
                } else {
                    showPlcList(area, clickedStatus);
                }
            };
        });
        
        areaHeader.onclick = (e) => {
            const target = e.target;
            if (target.matches('.status-count') || target.closest('.status-count')) {
                return;
            }
            const plcList = areaContainer.querySelector('.plc-list');
            const isExpanded = plcList.classList.contains('expanded');
            
            if (isExpanded) {
                plcList.classList.remove('expanded');
            } else {
                renderPlcBriefs(area, allPlcData[area].containers);
                plcList.classList.add('expanded');
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
                    if (areaData) {
                        const totalCount = Object.keys(areaData.containers).length;
                        areaData.summary.total = totalCount;
                    }
                    updateAreaSummary(area, areaData ? areaData.summary : null);
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                statusMessage.textContent = translations[lang].error;
                areas.forEach(area => {
                    updateAreaSummary(area, null);
                });
            });
    }

    fetchDataAndRender();
    setInterval(fetchDataAndRender, REFRESH_INTERVAL_MS);

});