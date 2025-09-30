document.addEventListener('DOMContentLoaded', () => {
    const table = document.querySelector('.data-table');
    const tableBody = document.getElementById('data-table-body');
    const loadingSpinner = document.getElementById('loading-spinner');
    const listContainer = document.getElementById('list-container');
    const errorMessage = document.getElementById('error-message');
    const exportButton = document.getElementById('export-button');
    const paginationContainer = document.getElementById('pagination-container');
    const lastRefreshElement = document.getElementById('last-refresh');

    const ITEMS_PER_PAGE = 10;
    let currentPage = 1;
    let allContainers = [];

    const columns = [
        { text: TEXTS.container_id, key: 'id' },
        { text: TEXTS.container_type, key: 'vendor' }, 
        { text: TEXTS.run_mode, key: 'mode' },
        { text: TEXTS.area, key: 'area' },
        { text: TEXTS.pl_pump_speed, key: 'circulationPumpSpeed' },
        { text: TEXTS.flow_rate + '(m³/h)', key: 'flowRate' },
        { text: TEXTS.cold_water_temp + '(℃)', key: 'coldWaterTemp' },
        { text: TEXTS.hot_water_temp + '(℃)', key: 'hotWaterTemp' },
        { text: TEXTS.cold_water_pressure + '(Bar)', key: 'coldWaterPressure' },
        { text: `${TEXTS.hot_water_pressure}(Bar)`, key: 'hotWaterPressure' },
        { text: `${TEXTS.sprayer_pump} 1 - ${TEXTS.container_status}`, key: 'sprayerPump1Status' },
        { text: `${TEXTS.sprayer_pump} 2 - ${TEXTS.container_status}`, key: 'sprayerPump2Status' },
        { text: `${TEXTS.fan} 1 - ${TEXTS.current}(A)`, key: 'fan1Current' },
        { text: `${TEXTS.fan} 1 - ${TEXTS.frequency}(Hz)`, key: 'fan1Frequency' },
        { text: `${TEXTS.fan} 1 - ${TEXTS.container_status}`, key: 'fan1Status' },
        { text: `${TEXTS.fan} 2 - ${TEXTS.current}(A)`, key: 'fan2Current' },
        { text: `${TEXTS.fan} 2 - ${TEXTS.frequency}(Hz)`, key: 'fan2Frequency' },
        { text: `${TEXTS.fan} 2 - ${TEXTS.container_status}`, key: 'fan2Status' },
        { text: `${TEXTS.fan} 3 - ${TEXTS.current}(A)`, key: 'fan3Current' },
        { text: `${TEXTS.fan} 3 - ${TEXTS.frequency}(Hz)`, key: 'fan3Frequency' },
        { text: `${TEXTS.fan} 3 - ${TEXTS.container_status}`, key: 'fan3Status' },
        { text: `${TEXTS.fan} 4 - ${TEXTS.current}(A)`, key: 'fan4Current' },
        { text: `${TEXTS.fan} 4 - ${TEXTS.frequency}(Hz)`, key: 'fan4Frequency' },
        { text: `${TEXTS.fan} 4 - ${TEXTS.container_status}`, key: 'fan4Status' }
    ];

    function safeGet(sourceObj, path) {
        return path.reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, sourceObj);
    }
    
    function getRunningStatusText(state) {
        if (state === true || state === 'running' || state === 'runing') {
            return TEXTS.running;
        }
        if (state === false) {
            return TEXTS.offline;
        }
        if (state === 'stopped' || state === 'stop') {
            return TEXTS.stopped;
        }
        return 'N/A';
    }

    function generateTableHeader() {
        const existingHeader = table.querySelector('thead');
        if (existingHeader) {
            existingHeader.remove();
        }

        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        
        columns.forEach((col, index) => {
            const th = document.createElement('th');
            th.textContent = col.text;
            if (index === 0) {
                th.classList.add('sticky-column');
            }
            tr.appendChild(th);
        });

        thead.appendChild(tr);
        table.prepend(thead);
    }

    function updateLastRefreshTime() {
        const now = new Date();
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        const formattedTime = new Intl.DateTimeFormat('zh-CN', options).format(now);
        if (lastRefreshElement) {
            lastRefreshElement.textContent = formattedTime;
        }
    }

    function fetchDataAndPopulateTable() {
        if (loadingSpinner) loadingSpinner.style.display = 'block';
        if (listContainer) listContainer.style.display = 'none';
        if (errorMessage) errorMessage.style.display = 'none';

        fetch('/api/get_data')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok.');
                }
                return response.json();
            })
            .then(data => {
                if (loadingSpinner) loadingSpinner.style.display = 'none';
                updateLastRefreshTime();
                
                if (data.error) {
                    if (errorMessage) {
                        errorMessage.style.display = 'block';
                        errorMessage.textContent = `${TEXTS.error_message}: ${data.error}`;
                    }
                    return;
                }
                
                if (listContainer) listContainer.style.display = 'block';
                
                let tempContainers = []; // 使用临时数组收集符合条件的容器
                for (const area in data) {
                    if (data[area].containers) {
                        for (const containerId in data[area].containers) {
                            const container = data[area].containers[containerId];
                            // 关键修改点 1: 过滤掉离线数据
                            if (container.status !== 'offline') {
                                tempContainers.push({ [containerId]: container });
                            }
                        }
                    }
                }

                allContainers = tempContainers.sort((a, b) => {
                    const idA = Object.keys(a)[0];
                    const idB = Object.keys(b)[0];
                    return idA.localeCompare(idB); // 按容器ID字母顺序排序
                });

                generateTableHeader();
                populateTable(allContainers, 1);
                
                // 解决刷新后滚动位置问题
                setTimeout(() => {
                    if (listContainer) {
                        listContainer.scrollLeft = 0;
                    }
                }, 0);
            })
            .catch(error => {
                if (loadingSpinner) loadingSpinner.style.display = 'none';
                if (listContainer) listContainer.style.display = 'none';
                if (errorMessage) {
                    errorMessage.style.display = 'block';
                    errorMessage.textContent = `${TEXTS.error_message}: ${error.message}`;
                }
                console.error('Fetch error:', error);
            });
    }

    function populateTable(containers, page) {
        if (tableBody) tableBody.innerHTML = '';
        currentPage = page;
        
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageContainers = containers.slice(startIndex, endIndex);

        pageContainers.forEach(containerData => {
            const containerId = Object.keys(containerData)[0];
            const data = containerData[containerId];
            const result = data.Result || {};
            const summary = result.Summary || {};
            const metrics = summary.Metrics || {};
            const vendor = data.vendor || 'N/A';
            
            const fans = summary.Fans || [];
            const fanData = {
                Fan1: fans.find(f => f.Number === 1) || {},
                Fan2: fans.find(f => f.Number === 2) || {},
                Fan3: fans.find(f => f.Number === 3) || {},
                Fan4: fans.find(f => f.Number === 4) || {}
            };
            
            const row = document.createElement('tr');
            row.className = data.status || 'offline';
            
            const rowData = [
                `<a href="/details?container_id=${containerId}&lang=${TEXTS.lang}">${containerId}</a>`,
                vendor,
                summary.Mode || 'N/A',
                containerId.charAt(0) || 'N/A',
                safeGet(summary, ['CirculationPump', 'Speed']) !== undefined ? safeGet(summary, ['CirculationPump', 'Speed']) : 'N/A',
                safeGet(metrics, ['Flow']) !== undefined ? safeGet(metrics, ['Flow']).toFixed(2) : 'N/A',
                safeGet(metrics, ['ColdTempC']) !== undefined ? safeGet(metrics, ['ColdTempC']).toFixed(2) : 'N/A',
                safeGet(metrics, ['HotTempC']) !== undefined ? safeGet(metrics, ['HotTempC']).toFixed(2) : 'N/A',
                safeGet(metrics, ['ColdPressure']) !== undefined ? safeGet(metrics, ['ColdPressure']).toFixed(2) : 'N/A',
                safeGet(metrics, ['HotPressure']) !== undefined ? safeGet(metrics, ['HotPressure']).toFixed(2) : 'N/A',
                getRunningStatusText(safeGet(summary, ['SprayerPump', 0, 'Running'])),
                getRunningStatusText(safeGet(summary, ['SprayerPump', 1, 'Running'])),
                safeGet(fanData.Fan1, ['Current']) !== undefined ? fanData.Fan1.Current.toFixed(2) : 'N/A',
                safeGet(fanData.Fan1, ['Frequency']) !== undefined ? fanData.Fan1.Frequency.toFixed(2) : 'N/A',
                getRunningStatusText(safeGet(fanData.Fan1, ['Running'])),
                safeGet(fanData.Fan2, ['Current']) !== undefined ? fanData.Fan2.Current.toFixed(2) : 'N/A',
                safeGet(fanData.Fan2, ['Frequency']) !== undefined ? fanData.Fan2.Frequency.toFixed(2) : 'N/A',
                getRunningStatusText(safeGet(fanData.Fan2, ['Running'])),
                safeGet(fanData.Fan3, ['Current']) !== undefined ? fanData.Fan3.Current.toFixed(2) : 'N/A',
                safeGet(fanData.Fan3, ['Frequency']) !== undefined ? fanData.Fan3.Frequency.toFixed(2) : 'N/A',
                getRunningStatusText(safeGet(fanData.Fan3, ['Running'])),
                safeGet(fanData.Fan4, ['Current']) !== undefined ? fanData.Fan4.Current.toFixed(2) : 'N/A',
                safeGet(fanData.Fan4, ['Frequency']) !== undefined ? fanData.Fan4.Frequency.toFixed(2) : 'N/A',
                getRunningStatusText(safeGet(fanData.Fan4, ['Running']))
            ];
            
            rowData.forEach((item, index) => {
                const td = document.createElement('td');
                if (data.status === 'offline') {
                    if (index === 0) {
                        td.innerHTML = `${containerId} - ${TEXTS.status_offline}`;
                    } else if (index === 1) {
                        td.textContent = vendor;
                    } else {
                        td.textContent = 'N/A';
                    }
                } else {
                    td.innerHTML = item;
                }
                
                if (index === 0) {
                    td.classList.add('sticky-column');
                }
                row.appendChild(td);
            });
            
            if(tableBody) tableBody.appendChild(row);
        });

        if (containers.length === 0) {
            if (errorMessage) {
                errorMessage.style.display = 'block';
                errorMessage.textContent = TEXTS.no_data_available;
            }
        }

        renderPagination(containers.length);
    }
    
    function renderPagination(totalItems) {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

        if (totalPages <= 1) {
            return;
        }

        const createButton = (text, page, isActive = false) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.className = 'pagination-button';
            if (isActive) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                populateTable(allContainers, page);
            });
            return button;
        };
        
        const prevButton = document.createElement('button');
        prevButton.textContent = '上一页';
        prevButton.className = 'pagination-button';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                populateTable(allContainers, currentPage - 1);
            }
        });
        paginationContainer.appendChild(prevButton);

        if (currentPage > 2) {
            paginationContainer.appendChild(createButton(1, 1));
            if (currentPage > 3) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                paginationContainer.appendChild(ellipsis);
            }
        }
        
        for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
            paginationContainer.appendChild(createButton(i, i, i === currentPage));
        }

        if (currentPage < totalPages - 1) {
            if (currentPage < totalPages - 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                paginationContainer.appendChild(ellipsis);
            }
            paginationContainer.appendChild(createButton(totalPages, totalPages));
        }

        const nextButton = document.createElement('button');
        nextButton.textContent = '下一页';
        nextButton.className = 'pagination-button';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                populateTable(allContainers, currentPage + 1);
            }
        });
        paginationContainer.appendChild(nextButton);
    }

    if (exportButton) {
        exportButton.addEventListener('click', () => {
            if (allContainers.length === 0) {
                alert(TEXTS.no_data_to_export || '无数据可导出');
                return;
            }

            // 导出数据逻辑，已新增“供应商”列
            const exportData = allContainers.map(containerData => {
                const containerId = Object.keys(containerData)[0];
                const data = containerData[containerId];
                const result = data.Result || {};
                const summary = result.Summary || {};
                const metrics = summary.Metrics || {};
                const vendor = data.vendor || 'N/A';
                
                const fans = summary.Fans || [];
                const fanData = {
                    Fan1: fans.find(f => f.Number === 1) || {},
                    Fan2: fans.find(f => f.Number === 2) || {},
                    Fan3: fans.find(f => f.Number === 3) || {},
                    Fan4: fans.find(f => f.Number === 4) || {}
                };
                
                if (data.status === 'offline') {
                    return [
                        `${containerId} - ${TEXTS.status_offline}`,vendor,
                        'N/A', 'Minerbase', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A',
                        'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A',
                        'N/A', 'N/A', 'N/A', 'N/A', 'N/A'
                    ];
                }

                return [
                    containerId,
                    vendor,
                    summary.Mode || 'N/A',
                    containerId.charAt(0) || 'N/A',
                    safeGet(summary, ['CirculationPump', 'Speed']) !== undefined ? safeGet(summary, ['CirculationPump', 'Speed']) : 'N/A',
                    safeGet(metrics, ['Flow']) !== undefined ? safeGet(metrics, ['Flow']).toFixed(2) : 'N/A',
                    safeGet(metrics, ['ColdTempC']) !== undefined ? safeGet(metrics, ['ColdTempC']).toFixed(2) : 'N/A',
                    safeGet(metrics, ['HotTempC']) !== undefined ? safeGet(metrics, ['HotTempC']).toFixed(2) : 'N/A',
                    safeGet(metrics, ['ColdPressure']) !== undefined ? safeGet(metrics, ['ColdPressure']).toFixed(2) : 'N/A',
                    safeGet(metrics, ['HotPressure']) !== undefined ? safeGet(metrics, ['HotPressure']).toFixed(2) : 'N/A',
                    getRunningStatusText(safeGet(summary, ['SprayerPump', 0, 'Running'])),
                    getRunningStatusText(safeGet(summary, ['SprayerPump', 1, 'Running'])),
                    safeGet(fanData.Fan1, ['Current']) !== undefined ? fanData.Fan1.Current.toFixed(2) : 'N/A',
                    safeGet(fanData.Fan1, ['Frequency']) !== undefined ? fanData.Fan1.Frequency.toFixed(2) : 'N/A',
                    getRunningStatusText(safeGet(fanData.Fan1, ['Running'])),
                    safeGet(fanData.Fan2, ['Current']) !== undefined ? fanData.Fan2.Current.toFixed(2) : 'N/A',
                    safeGet(fanData.Fan2, ['Frequency']) !== undefined ? fanData.Fan2.Frequency.toFixed(2) : 'N/A',
                    getRunningStatusText(safeGet(fanData.Fan2, ['Running'])),
                    safeGet(fanData.Fan3, ['Current']) !== undefined ? fanData.Fan3.Current.toFixed(2) : 'N/A',
                    safeGet(fanData.Fan3, ['Frequency']) !== undefined ? fanData.Fan3.Frequency.toFixed(2) : 'N/A',
                    getRunningStatusText(safeGet(fanData.Fan3, ['Running'])),
                    safeGet(fanData.Fan4, ['Current']) !== undefined ? fanData.Fan4.Current.toFixed(2) : 'N/A',
                    safeGet(fanData.Fan4, ['Frequency']) !== undefined ? fanData.Fan4.Frequency.toFixed(2) : 'N/A',
                    getRunningStatusText(safeGet(fanData.Fan4, ['Running']))
                ];
            });

            const headerRow = columns.map(col => col.text);
            exportData.unshift(headerRow);
            
            const ws = XLSX.utils.aoa_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "矿箱数据");
            XLSX.writeFile(wb, "矿箱数据.xlsx");
        });
    }

    fetchDataAndPopulateTable();

    setInterval(fetchDataAndPopulateTable, 180000);
});