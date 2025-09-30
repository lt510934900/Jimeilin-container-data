document.addEventListener('DOMContentLoaded', () => {
    const loadingSpinner = document.getElementById('loading-spinner');
    const contentContainer = document.getElementById('content-container');
    const errorMessage = document.getElementById('error-message');
    const sections = {
        'electrical-metrics': document.getElementById('electrical-metrics-content'),
        'circulation-pump': document.getElementById('circulation-pump-content'),
        'environmental-metrics': document.getElementById('environmental-metrics-content'),
        'water-cooling': document.getElementById('water-cooling-content')
    };
    
    const alarmModal = document.getElementById('alarm-modal');
    const closeButton = document.querySelector('.close-button');
    const alarmList = document.getElementById('alarm-list');

    const prevButton = document.getElementById('prev-container-btn');
    const nextButton = document.getElementById('next-container-btn');
    const containerIds = JSON.parse(document.getElementById('container-ids').textContent);
    const containerId = document.getElementById('container-id').textContent.trim();
    

    function getOnlineStatusText(isOnline) {
        if (isOnline === true || String(isOnline).toLowerCase() === 'true') {
            return TEXTS.online;
        }
        return TEXTS.offline;
    }

    function getRunningStatusText(isRunning) {
        if (isRunning === true || String(isRunning).toLowerCase() === 'true' || isRunning === 'running' || isRunning === 'runing') {
            return TEXTS.running;
        }
        return TEXTS.stopped;
    }

    function showLoading() {
        loadingSpinner.style.display = 'block';
        contentContainer.style.display = 'none';
        errorMessage.style.display = 'none';
    }

    function hideLoadingAndShowContent() {
        loadingSpinner.style.display = 'none';
        contentContainer.style.display = 'block';
    }

    function hideLoadingAndShowError(message) {
        loadingSpinner.style.display = 'none';
        contentContainer.style.display = 'none';
        errorMessage.style.display = 'block';
        errorMessage.textContent = message;
    }

    function formatMetrics(dataArray, unit) {
        if (!dataArray || dataArray.length === 0) {
            return 'N/A';
        }
        return dataArray.map(val => val !== undefined ? `${val.toFixed(2)} ${unit}` : 'N/A').join(', ');
    }

    function populateDetails(data) {
        const vendor = data.vendor || 'N/A';
        const result = data.Result || {};
        const summary = result.Summary || {};
        const consumption = summary.Consumption || {};
        const fans = summary.Fans || [];
        const sprayerPumps = summary.SprayerPump || [];
        const exhauster = summary.Exhauster || {};
        const circulationPump = summary.CirculationPump || {};
        const waterLevel = summary.WaterLevel || {};
        
        const metrics = result.Metrics || {};

        document.getElementById('container-type').textContent = data.vendor || 'N/A';
        document.getElementById('container-status').textContent = TEXTS[`status_${data.status}`] || 'N/A';
        const runMode = summary.Mode || 'N/A';
        let displayMode = 'N/A';
        if (runMode.toLowerCase() === 'manual') {
            displayMode = TEXTS.manual_mode;
        } else if (runMode.toLowerCase() === 'auto') {
            displayMode = TEXTS.auto_mode;
        } else {
            displayMode = runMode;
        }
        document.getElementById('container-mode').textContent = displayMode;

        // 电气指标
        const electricalHtml = `
            ${consumption.TotalKW !== undefined ? `<div class="detail-item"><strong>${TEXTS.total_power}:</strong> <span>${consumption.TotalKW.toFixed(2)} kW</span></div>` : ''}
            ${consumption.TotalKWH !== undefined ? `<div class="detail-item"><strong>${TEXTS.total_kwh}:</strong> <span>${consumption.TotalKWH.toFixed(2)} KWH</span></div>` : ''}
            ${consumption.KWPhases && consumption.KWPhases.length > 0 ? `<div class="detail-item"><strong>${TEXTS.power}:</strong> <span>${formatMetrics(consumption.KWPhases, 'kW')}</span></div>` : ''}
            ${consumption.VPhases && consumption.VPhases.length > 0 ? `<div class="detail-item"><strong>${TEXTS.voltage}:</strong> <span>${formatMetrics(consumption.VPhases, 'V')}</span></div>` : ''}
            ${consumption.IPhases && consumption.IPhases.length > 0 ? `<div class="detail-item"><strong>${TEXTS.current}:</strong> <span>${formatMetrics(consumption.IPhases, 'A')}</span></div>` : ''}
        `;
        sections['electrical-metrics'].innerHTML = electricalHtml;

        // 循环泵
        const circulationPumpOnlineStatus = circulationPump.Online !== undefined ? getOnlineStatusText(circulationPump.Online) : 'N/A';
        const circulationPumpRunningStatus = circulationPump.Online ? (circulationPump.Running !== undefined ? getRunningStatusText(circulationPump.Running) : 'N/A') : 'N/A';
        const circulationPumpHtml = `
            <div class="detail-item"><strong>${TEXTS.online_status_label_pum}:</strong> <span>${circulationPumpOnlineStatus}</span></div>
            <div class="detail-item"><strong>${TEXTS.running_status_label_pum}:</strong> <span>${circulationPumpRunningStatus}</span></div>
            <div class="detail-item"><strong>${TEXTS.pl_pump_speed}:</strong> <span>${circulationPump.Speed !== undefined ? `${circulationPump.Speed.toFixed(2)} Hz` : 'N/A'}</span></div>
            <div class="detail-item"><strong>${TEXTS.flow_rate}:</strong> <span>${metrics.Flow !== undefined ? `${metrics.Flow.toFixed(2)} m³/h` : 'N/A'}</span></div>
            <div class="detail-item"><strong>${TEXTS.cold_water_temp}:</strong> <span>${metrics.ColdTempC !== undefined ? `${metrics.ColdTempC.toFixed(2)} ℃` : 'N/A'}</span></div>
            <div class="detail-item"><strong>${TEXTS.hot_water_temp}:</strong> <span>${metrics.HotTempC !== undefined ? `${metrics.HotTempC.toFixed(2)} ℃` : 'N/A'}</span></div>
            <div class="detail-item"><strong>${TEXTS.cold_water_pressure}:</strong> <span>${metrics.ColdPressure !== undefined ? `${metrics.ColdPressure.toFixed(2)} Bar` : 'N/A'}</span></div>
            ${vendor == 'Sai' ? `<div class="detail-item"><strong>${TEXTS.hot_water_pressure}:</strong> <span>${metrics.HotPressure !== undefined ? `${metrics.HotPressure.toFixed(2)} Bar` : 'N/A'}</span></div>` : ''}
        `;
        sections['circulation-pump'].innerHTML = circulationPumpHtml;
        
        // 环境指标
        const exhausterOnlineStatus = exhauster.Online !== undefined ? getOnlineStatusText(exhauster.Online) : 'N/A';
        const exhausterRunningStatus = exhauster.Online ? (exhauster.Running !== undefined ? getRunningStatusText(exhauster.Running) : 'N/A') : 'N/A';
        const environmentalHtml = `
            <div class="environmental-metrics-grid">
                <div>
                    <div class="detail-item"><strong>${TEXTS.exhauster_online_status}:</strong> <span>${exhausterOnlineStatus}</span></div>
                    <div class="detail-item"><strong>${TEXTS.exhauster_run_status}:</strong> <span>${exhausterRunningStatus}</span></div>
                </div>
                <div>
                    <div class="detail-item"><strong>${TEXTS.indoor_temp}:</strong> <span>${exhauster.IndoorTempC !== undefined ? `${exhauster.IndoorTempC.toFixed(2)} ℃` : 'N/A'}</span></div>
                    <div class="detail-item"><strong>${TEXTS.indoor_humidity}:</strong> <span>${exhauster.IndoorHumidity !== undefined ? `${exhauster.IndoorHumidity.toFixed(2)} %` : 'N/A'}</span></div>
                </div>
                
            </div>
        `;
        sections['environmental-metrics'].innerHTML = environmentalHtml;

        // 水冷部分
        const fansHtml = fans.length > 0 ?
            fans.map(fan => {
                const fanOnlineStatus = fan.Online !== undefined ? getOnlineStatusText(fan.Online) : 'N/A';
                const fanRunningStatus = fan.Online ? (fan.Running !== undefined ? getRunningStatusText(fan.Running) : 'N/A') : 'N/A';
                return `
                    <div class="fan-item">
                        <h5>${TEXTS.fan} ${fan.Number || 'N/A'}</h5>
                        <p><strong>${TEXTS.online_status_label}:</strong> <span>${fanOnlineStatus}</span></p>
                        <p><strong>${TEXTS.running_status_label}:</strong> <span>${fanRunningStatus}</span></p>
                        <p><strong>${TEXTS.current}:</strong> <span>${fan.Current !== undefined ? `${fan.Current.toFixed(2)} A` : 'N/A'}</span></p>
                        <p><strong>${TEXTS.frequency}:</strong> <span>${fan.Speed !== undefined ? `${fan.Speed.toFixed(2)} Hz` : 'N/A'}</span></p>
                    </div>
                `;
            }).join('') :
            `<p>${TEXTS.no_data_available}</p>`;
        const sprayerPumpsHtml = sprayerPumps.length > 0 ?
            sprayerPumps.map(pump => {
                const pumpOnlineStatus = pump.Online !== undefined ? getOnlineStatusText(pump.Online) : 'N/A';
                const pumpRunningStatus = pump.Online ? (pump.Running !== undefined ? getRunningStatusText(pump.Running) : 'N/A') : 'N/A';
                return `
                    <div class="sprayer-pump-item">
                        <h5>${TEXTS.sprayer_pump} ${pump.Number !== undefined ? pump.Number : 'N/A'}</h5>
                        <p><strong>${TEXTS.online_status_label}:</strong> <span>${pumpOnlineStatus}</span></p>
                        <p><strong>${TEXTS.running_status_label}:</strong> <span>${pumpRunningStatus}</span></p>
                    </div>
                `;
            }).join('') :
            `<p>${TEXTS.no_data_available}</p>`;


        function getWaterLevelStatus(value, vendor) {
            if (value === undefined || value === null) {
                return 'N/A';
            }
            
            let isAbnormal;
            
            if (vendor === 'Minerbase') {
                isAbnormal = value === false;
            } else if (vendor === 'Sai') {
                isAbnormal = value === false;
            } else {
                return String(value); 
            }

            if (isAbnormal) {
                return `<span style="color: red;">${TEXTS.status_key_abnormal}</span>`;
            } else {
                return `<span>${TEXTS.status_key_normal}</span>`;
            }
        }

        const cooler1Status = getWaterLevelStatus(waterLevel.Cooler1WaterLevel, vendor);
        const cooler2Status = getWaterLevelStatus(waterLevel.Cooler2WaterLevel, vendor);        
        const lowTankStatus = getWaterLevelStatus(waterLevel.LowTankWaterlevel, vendor);

        let waterLevelItemsHtml = `
            <p><strong>${TEXTS.wterLevela}:</strong> <span>${cooler1Status}</span></p>
            <p><strong>${TEXTS.wterLevelb}:</strong> <span>${cooler2Status}</span></p>
            <p><strong>${TEXTS.wterLevelc}:</strong> <span>${lowTankStatus}</span></p>
        `;

        if (vendor == 'Sai') {
            const highTankStatus = getWaterLevelStatus(waterLevel.HightTankWaterLevel, vendor);
            waterLevelItemsHtml += `<p><strong>${TEXTS.wterLeveld}:</strong> <span>${highTankStatus}</span></p>`;

        }
        
        const waterCoolingHtml = `
            <div class="fan-list">${fansHtml}</div>
            <div class="sprayer-pump-list">${sprayerPumpsHtml}</div>           
            <div class="detail-item water-level-item">
                ${waterLevelItemsHtml}
            </div>
        `;
        sections['water-cooling'].innerHTML = waterCoolingHtml;
        
        const alarms = summary.AlarmRuntime || [];
        if (alarms.length > 0) {
            alarmList.innerHTML = ''; 

            alarms.forEach(alarm => {
                const li = document.createElement('li');
                li.textContent = alarm;
                alarmList.appendChild(li);
            });

            alarmModal.style.display = 'block';
        } else {

            alarmModal.style.display = 'none';
        }
    }

    function setupNavigation(containerIds) {

        const urlParams = new URLSearchParams(window.location.search);
        const lang = urlParams.get('lang') || 'zh';

        const currentIndex = containerIds.indexOf(containerId);
        const prevId = containerIds[currentIndex - 1];
        const nextId = containerIds[currentIndex + 1];

        if (prevId) {
            prevButton.href = `/details/${prevId}?lang=${lang}`;
            prevButton.classList.remove('disabled');
        } else {
            prevButton.href = `/?lang=${lang}`;
            prevButton.classList.remove('disabled');
        }

        if (nextId) {
            nextButton.href = `/details/${nextId}?lang=${lang}`;
            nextButton.classList.remove('disabled');
        } else {
            nextButton.href = `/?lang=${lang}`;
            prevButton.classList.remove('disabled');
        }
    }

    async function fetchDetails() {
        if (!containerId) {
            hideLoadingAndShowError(TEXTS.container_not_found);
            return;
        }

        showLoading();
        try {
            setupNavigation(containerIds);

            const detailsResponse = await fetch(`/api/get_details/${containerId}`);
            if (!detailsResponse.ok) {
                const err = await detailsResponse.json();
                throw new Error(err.error || TEXTS.error_fetching_details);
            }
            const detailsData = await detailsResponse.json();
            
            populateDetails(detailsData);
            hideLoadingAndShowContent();

        } catch (error) {
            hideLoadingAndShowError(`${TEXTS.error_message}: ${error.message}`);
            console.error('Fetch error:', error);
        }
    }

    closeButton.addEventListener('click', () => {
        alarmModal.style.display = 'none';
    });
    window.addEventListener('click', (event) => {
        if (event.target === alarmModal) {
            alarmModal.style.display = 'none';
        }
    });

    fetchDetails();
    setInterval(fetchDetails, 180000);
});