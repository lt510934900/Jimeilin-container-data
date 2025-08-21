document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('data-table-body');
    const loadingSpinner = document.getElementById('loading-spinner');
    const listContainer = document.getElementById('list-container');
    const errorMessage = document.getElementById('error-message');
    const exportButton = document.getElementById('export-button');

    function getRunningStatusText(state) {
        if (state === true || state === 'running' || state === 'runing') {
            return TEXTS.running;
        }
        if (state === false) {
            // 使用您在 app.py 中添加的键，例如 TEXTS.offline 或 TEXTS.fault
            return TEXTS.offline;
        }
        if (state === 'stopped' || state === 'stop') {
            return TEXTS.stopped;
        }
        return 'N/A';
    }

    function fetchDataAndPopulateTable() {
        loadingSpinner.style.display = 'block';
        listContainer.style.display = 'none';
        errorMessage.style.display = 'none';

        fetch('/api/get_data')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok.');
                }
                return response.json();
            })
            .then(data => {
                loadingSpinner.style.display = 'none';
                
                if (data.error) {
                    errorMessage.style.display = 'block';
                    errorMessage.textContent = `${TEXTS.error_message}: ${data.error}`;
                    return;
                }
                
                listContainer.style.display = 'block';
                populateTable(data);
            })
            .catch(error => {
                loadingSpinner.style.display = 'none';
                listContainer.style.display = 'none';
                errorMessage.style.display = 'block';
                errorMessage.textContent = `${TEXTS.error_message}: ${error.message}`;
                console.error('Fetch error:', error);
            });
    }

    function populateTable(data) {
        tableBody.innerHTML = '';
        
        const allContainers = [];
        for (const area in data) {
            if (data[area].containers) {
                for (const containerId in data[area].containers) {
                    allContainers.push({ [containerId]: data[area].containers[containerId] });
                }
            }
        }
        
        allContainers.sort((a, b) => {
            const idA = Object.keys(a)[0];
            const idB = Object.keys(b)[0];
            
            const areaA = idA.charAt(0);
            const areaB = idB.charAt(0);
            
            if (areaA !== areaB) {
                return areaA.localeCompare(areaB);
            }
            
            const numA = parseInt(idA.slice(1));
            const numB = parseInt(idB.slice(1));
            
            return numA - numB;
        });

        allContainers.forEach(containerData => {
            const containerId = Object.keys(containerData)[0];
            const data = containerData[containerId];
            const result = data.Result;

            const row = document.createElement('tr');
            
            if (data.status === 'offline' || !result) {
                const cell = document.createElement('td');
                cell.textContent = `${containerId} - ${TEXTS.status_offline}`;
                cell.setAttribute('colspan', '22');
                cell.style.color = '#888';
                cell.style.textAlign = 'center';
                row.appendChild(cell);
            } else {
                const summary = result.Summary || {};
                const metrics = summary.Metrics || {};
                const consumption = summary.Consumption || {};
                const fans = summary.Fans || [];
                const circulationPump = summary.CirculationPump || {};
                const sprayerPumps = summary.SprayerPump || [];
                
                // 检查是否有任何一个喷淋泵正在运行
                const isAnySprayerRunning = sprayerPumps.some(pump => pump.Running === true);
                
                const fanData = {
                    Fan1: fans.find(f => f.Number === 1) || {},
                    Fan2: fans.find(f => f.Number === 2) || {},
                    Fan3: fans.find(f => f.Number === 3) || {},
                    Fan4: fans.find(f => f.Number === 4) || {}
                };
                
                row.innerHTML = `
                    <td><a href="/details?container_id=${containerId}&lang=${TEXTS.lang}">${containerId}</a></td>
                    <td>${result.Type || 'N/A'}</td>
                    <td>${summary.Mode || 'N/A'}</td>
                    <td>${TEXTS[`status_${data.status}`] || 'N/A'}</td>
                    <td>${consumption.TotalKW !== undefined ? consumption.TotalKW : 'N/A'}</td>
                    <td>${metrics.ColdTempC !== undefined ? metrics.ColdTempC : 'N/A'}</td>
                    <td>${metrics.HotTempC !== undefined ? metrics.HotTempC : 'N/A'}</td>
                    <td>${metrics.Flow !== undefined ? metrics.Flow : 'N/A'}</td>
                    <td>${metrics.ColdPressure !== undefined ? metrics.ColdPressure : 'N/A'}</td>
                    <td>${metrics.HotPressure !== undefined ? metrics.HotPressure : 'N/A'}</td>
                    <td>${getRunningStatusText(circulationPump.Running)}</td>
                    <td>${getRunningStatusText(isAnySprayerRunning)}</td>
                    <td>${fanData.Fan1.Speed !== undefined ? fanData.Fan1.Speed : 'N/A'}</td>
                    <td>${getRunningStatusText(fanData.Fan1.Running)}</td>
                    <td>${fanData.Fan2.Speed !== undefined ? fanData.Fan2.Speed : 'N/A'}</td>
                    <td>${getRunningStatusText(fanData.Fan2.Running)}</td>
                    <td>${fanData.Fan3.Speed !== undefined ? fanData.Fan3.Speed : 'N/A'}</td>
                    <td>${getRunningStatusText(fanData.Fan3.Running)}</td>
                    <td>${fanData.Fan4.Speed !== undefined ? fanData.Fan4.Speed : 'N/A'}</td>
                    <td>${getRunningStatusText(fanData.Fan4.Running)}</td>
                `;
            }
            
            tableBody.appendChild(row);
        });

        if (allContainers.length === 0) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = TEXTS.no_data_available;
        }
    }

    exportButton.addEventListener('click', () => {
        const table = document.querySelector('.data-table');
        const ws = XLSX.utils.table_to_sheet(table);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PLC Data");
        XLSX.writeFile(wb, "PLC_data.xlsx");
    });
    
    fetchDataAndPopulateTable();

    setInterval(fetchDataAndPopulateTable, 20000);
});