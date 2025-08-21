// 请用这段代码完全替换 static/details.js
document.addEventListener('DOMContentLoaded', () => {
    const loadingSpinner = document.getElementById('loading-spinner');
    const contentContainer = document.getElementById('content-container');
    const errorMessage = document.getElementById('error-message');
    const containerId = document.getElementById('container-id').textContent;
    const sections = {
        'electrical-metrics': document.getElementById('electrical-metrics-content'),
        'circulation-pump': document.getElementById('circulation-pump-content'),
        'environmental-metrics': document.getElementById('environmental-metrics-content'),
        'water-cooling': document.getElementById('water-cooling-content')
    };

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

    function populateDetails(data) {
        const result = data.Result || {};
        const summary = result.Summary || {};
        const metrics = summary.Metrics || {};
        const consumption = summary.Consumption || {};
        const fans = summary.Fans || [];
        const sprayerPumps = summary.SprayerPump || [];
        const exhauster = summary.Exhauster || {};

        document.getElementById('container-type').textContent = result.Type || 'N/A';
        document.getElementById('container-status').textContent = TEXTS[`status_${data.status}`] || 'N/A';
        document.getElementById('container-mode').textContent = summary.Mode || 'N/A';

        const powerHtml = `
            ${metrics.KWPhases && metrics.KWPhases.length > 0 ? `
                <div class="detail-item"><strong>${TEXTS.power_A}:</strong> ${metrics.KWPhases[0] !== undefined ? `${metrics.KWPhases[0].toFixed(2)} KW` : 'N/A'}</div>
                <div class="detail-item"><strong>${TEXTS.power_B}:</strong> ${metrics.KWPhases[1] !== undefined ? `${metrics.KWPhases[1].toFixed(2)} KW` : 'N/A'}</div>
                <div class="detail-item"><strong>${TEXTS.power_C}:</strong> ${metrics.KWPhases[2] !== undefined ? `${metrics.KWPhases[2].toFixed(2)} KW` : 'N/A'}</div>
            ` : `<div class="detail-item"><strong>${TEXTS.three_phase_power}:</strong> N/A</div>`}
        `;

        const voltageHtml = `
            ${metrics.VPhases && metrics.VPhases.length > 0 ? `
                <div class="detail-item"><strong>${TEXTS.voltage_A}:</strong> ${metrics.VPhases[0] !== undefined ? `${metrics.VPhases[0].toFixed(2)} V` : 'N/A'}</div>
                <div class="detail-item"><strong>${TEXTS.voltage_B}:</strong> ${metrics.VPhases[1] !== undefined ? `${metrics.VPhases[1].toFixed(2)} V` : 'N/A'}</div>
                <div class="detail-item"><strong>${TEXTS.voltage_C}:</strong> ${metrics.VPhases[2] !== undefined ? `${metrics.VPhases[2].toFixed(2)} V` : 'N/A'}</div>
            ` : `<div class="detail-item"><strong>${TEXTS.three_phase_voltage}:</strong> N/A</div>`}
        `;

        const currentHtml = `
            ${metrics.IPhases && metrics.IPhases.length > 0 ? `
                <div class="detail-item"><strong>${TEXTS.current_A}:</strong> ${metrics.IPhases[0] !== undefined ? `${metrics.IPhases[0].toFixed(2)} A` : 'N/A'}</div>
                <div class="detail-item"><strong>${TEXTS.current_B}:</strong> ${metrics.IPhases[1] !== undefined ? `${metrics.IPhases[1].toFixed(2)} A` : 'N/A'}</div>
                <div class="detail-item"><strong>${TEXTS.current_C}:</strong> ${metrics.IPhases[2] !== undefined ? `${metrics.IPhases[2].toFixed(2)} A` : 'N/A'}</div>
            ` : `<div class="detail-item"><strong>${TEXTS.three_phase_current}:</strong> N/A</div>`}
        `;

        const electricalHtml = `
            <div class="detail-item"><strong>${TEXTS.total_power}:</strong> ${consumption.TotalKW !== undefined ? `${consumption.TotalKW} KW` : 'N/A'}</div>
            ${powerHtml}
            ${voltageHtml}
            ${currentHtml}
        `;
        sections['electrical-metrics'].innerHTML = electricalHtml;

        const circulationPumpHtml = `
            <div class="detail-item"><strong>${TEXTS.flow_rate}:</strong> ${metrics.Flow !== undefined ? `${metrics.Flow} m³/h` : 'N/A'}</div>
            <div class="detail-item"><strong>${TEXTS.cold_water_temp}:</strong> ${metrics.ColdTempC !== undefined ? `${metrics.ColdTempC} ℃` : 'N/A'}</div>
            <div class="detail-item"><strong>${TEXTS.hot_water_temp}:</strong> ${metrics.HotTempC !== undefined ? `${metrics.HotTempC} ℃` : 'N/A'}</div>
            <div class="detail-item"><strong>${TEXTS.cold_water_pressure}:</strong> ${metrics.ColdPressure !== undefined ? `${metrics.ColdPressure} Bar` : 'N/A'}</div>
            <div class="detail-item"><strong>${TEXTS.hot_water_pressure}:</strong> ${metrics.HotPressure !== undefined ? `${metrics.HotPressure} Bar` : 'N/A'}</div>
        `;
        sections['circulation-pump'].innerHTML = circulationPumpHtml;
        
        const environmentalHtml = `
            <div class="detail-item"><strong>${TEXTS.exhauster_status}:</strong> ${getRunningStatusText(exhauster.Running)}</div>
            <div class="environmental-metrics-grid">
                <div>
                    <h4>${TEXTS.indoor_metrics}</h4>
                    <div class="detail-item"><strong>${TEXTS.indoor_temp}:</strong> ${exhauster.IndoorTempC !== undefined ? `${exhauster.IndoorTempC} ℃` : 'N/A'}</div>
                    <div class="detail-item"><strong>${TEXTS.indoor_humidity}:</strong> ${exhauster.IndoorHumidity !== undefined ? `${exhauster.IndoorHumidity} %` : 'N/A'}</div>
                </div>
                <div>
                    <h4>${TEXTS.outdoor_metrics}</h4>
                    <div class="detail-item"><strong>${TEXTS.outdoor_temp}:</strong> ${exhauster.OutdoorTempC !== undefined ? `${exhauster.OutdoorTempC} ℃` : 'N/A'}</div>
                    <div class="detail-item"><strong>${TEXTS.outdoor_humidity}:</strong> ${exhauster.OutdoorHumidity !== undefined ? `${exhauster.OutdoorHumidity} %` : 'N/A'}</div>
                </div>
            </div>
        `;
        sections['environmental-metrics'].innerHTML = environmentalHtml;

        const waterCoolingHtml = `
            <h4>${TEXTS.sprayer_pump}</h4>
            <div class="sprayer-pump-list">
                ${sprayerPumps.length > 0 ?
                    sprayerPumps.map(pump => `
                        <div class="sprayer-pump-item">
                            <h5>${TEXTS.sprayer_pump} ${pump.Number !== undefined ? pump.Number : 'N/A'}</h5>
                            <p><strong>${TEXTS.fan_status}:</strong> ${getRunningStatusText(pump.Running)}</p>
                        </div>
                    `).join('') :
                    `<p>${TEXTS.no_data_available}</p>`
                }
            </div>
            <h4>${TEXTS.cooling_tower_fan}</h4>
            <div class="fan-list">
                ${fans.length > 0 ?
                    fans.map(fan => `
                        <div class="fan-item">
                            <h5>${TEXTS.fan} ${fan.Number || 'N/A'}</h5>
                            <p><strong>${TEXTS.current}:</strong> ${fan.Current !== undefined ? `${fan.Current} A` : 'N/A'}</p>
                            <p><strong>${TEXTS.frequency}:</strong> ${fan.Speed !== undefined ? `${fan.Speed} Hz` : 'N/A'}</p>
                            <p><strong>${TEXTS.fan_status}:</strong> ${getRunningStatusText(fan.Running)}</p>
                        </div>
                    `).join('') :
                    `<p>${TEXTS.no_data_available}</p>`
                }
            </div>
        `;
        sections['water-cooling'].innerHTML = waterCoolingHtml;
    }

    function fetchDetails() {
        if (!containerId) {
            hideLoadingAndShowError(TEXTS.container_not_found);
            return;
        }
        showLoading();
        fetch(`/api/get_details/${containerId}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error) });
                }
                return response.json();
            })
            .then(data => {
                hideLoadingAndShowContent();
                populateDetails(data);
            })
            .catch(error => {
                hideLoadingAndShowError(`${TEXTS.error_message}: ${error.message}`);
                console.error('Fetch error:', error);
            });
    }

    fetchDetails();
    setInterval(fetchDetails, 20000);
});