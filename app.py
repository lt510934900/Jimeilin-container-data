import base64
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import time
from datetime import datetime
import json
from flask import Flask, render_template, jsonify, request
import requests

app = Flask(__name__)

logging.basicConfig(level=logging.INFO,
                    format='[%(asctime)s] %(levelname)s - %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S')

MINERBASE_PASSWORD = "your_password"
SAI_PASSWORD = "123456"

if MINERBASE_PASSWORD == "your_password":
    logging.error("12315 上山打老虎")

MINERBASE_AUTH_HEADER = base64.b64encode(MINERBASE_PASSWORD.encode()).decode()
SAI_AUTH_HEADER = base64.b64encode(SAI_PASSWORD.encode()).decode()

REFRESH_INTERVAL_SECONDS = 30
PLC_REQUEST_TIMEOUT = 10

PLC_CACHE = {
    'data': None,
    'timestamp': None
}
cache_lock = threading.Lock()

TEXTS = {
    'zh': {
        'page_title': '吉梅林矿箱监控系统',
        'back_to_main': '返回主页',
        'area': '区域',
        'list_view': '矿箱列表',
        'export_data': '导出为Excel',
        'container_id': '集装箱编号',
        'container_type': '供应商',
        'run_mode': '运行模式',
        'total_power': '总功率',
        'total_kwh': '总电量',
        'container_status': '状态',
        'container_details': '详情',
        'electrical_metrics': '电气指标',
        'environmental_metrics': '环境指标',
        'water_cooling': '水冷系统',
        'status_normal': '正常运行',
        'status_warning': '普通告警',
        'status_critical': '严重告警',
        'status_offline': '设备离线',
        'power': '三相功率',
        'voltage': '三相电压',
        'current': '三相电流',
        'flow_rate': '水流量',
        'pl_pump': '循环泵是否在线',
        'pl_pump_run': '循环泵是否开机',
        'pl_pump_speed': '循环泵运行频率',
        'cold_water_temp': '进水温度',
        'hot_water_temp': '出水温度',
        'cold_water_pressure': '进水压力',
        'hot_water_pressure': '出水压力',
        'circulation_pump': '循环水泵',
        'sprayer_pump': '喷淋水泵',
        'wterLevela': '1号冷塔液位',
        'wterLevelb': '2号冷塔液位',
        'wterLevelc': '补液塔低液位',
        'wterLeveld': '补液塔高液位',
        'cooling_tower_fan': '冷塔风机',
        'fan': '风机',
        'frequency': '频率',
        'fanCurrent': '电流',
        'online_status_label': '在线状态',
        'running_status_label': '工作状态',
        'online_status_label_pum': '循环泵在线状态',
        'running_status_label_pum': '循环泵工作状态',
        'exhauster_online_status': '排风机在线状态',
        'exhauster_run_status': '排风机工作状态',
        'online': '在线',
        'offline': '离线',
        'running': '正常',
        'stopped': '停止',
        'indoor_metrics': '室内指标',
        'outdoor_metrics': '室外指标',
        'indoor_temp': '室内温度',
        'indoor_humidity': '室内湿度',
        'outdoor_temp': '室外温度',
        'outdoor_humidity': '室外湿度',
        'exhauster_status': '排风机状态',
        'no_data_available': '没有可用数据',
        'container_not_found': '找不到该集装箱',
        'error_message': '无法获取数据。请检查网络和服务器',
        'unit_celsius': '(℃)',
        'unit_meter_cubed_per_hour': '(m³/h)',
        'unit_bar': '(Bar)',
        'unit_ampere': '(A)',
        'unit_hertz': '(Hz)',
        'unit_kilowatt': '(kW)',
        'unit_percent': '(%)',
        'last_refresh': '最后刷新时间',
        'loading': '正在获取数据...',
        'error': '无法获取数据。请检查网络和服务器。',
        'plc_label': '矿箱',
        'area_label': '区',
        'status_key_normal': '正常',
        'status_key_warning': '告警',
        'status_key_critical': '严重',
        'status_key_abnormal': '异常',
        'previous_page': '上一页',
        'next_page': '下一页',
        'manual_mode': '手动模式',
        'auto_mode': '自动模式',
        'status_key_offline': '离线'
    },
    'en': {
        'page_title': 'Jigmeling Mine Box Monitoring System',
        'back_to_main': 'Back to Main',
        'list_view': 'Container List',
        'area': 'Area',
        'export_data': 'Export to Excel',
        'container_id': 'Container ID',
        'container_type': 'supplier',
        'run_mode': 'Running Mode',
        'container_status': 'Status',
        'container_details': 'Details',
        'electrical_metrics': 'Electrical Metrics',
        'environmental_metrics': 'Environmental Metrics',
        'water_cooling': 'Water Cooling System',
        'status_normal': 'Normal',
        'status_warning': 'Warning',
        'status_critical': 'Critical',
        'status_offline': 'Offline',
        'total_power': 'Total Power',
        'total_kwh': 'Total KWH',
        'power': '3-Phase Power',
        'voltage': '3-Phase Voltage',
        'current': '3-Phase Current',
        'flow_rate': 'Flow Rate',
        'pl_pump': 'Pump-Online',
        'pl_pump_run': 'Pump-Run',
        'pl_pump_speed': 'Pump-Speed',
        'CirculationPump': 'CirculationPump',
        'cold_water_temp': 'In Water Temp',
        'hot_water_temp': 'Out Water Temp',
        'cold_water_pressure': 'In Water Pressure',
        'hot_water_pressure': 'Out Water Pressure',
        'circulation_pump': 'Circulation Pump',
        'sprayer_pump': 'Sprayer Pump',
        'circulation_pump_speed': 'Circulation_pump_speed',
        'cooling_tower_fan': 'Cooling_tower_fan',
        'fan': 'Fan',
        'frequency': 'Frequency',
        'fanCurrent': 'Current',
        'online_status_label': 'online_status',
        'running_status_label': 'running_status',
        'online_status_label_pum': 'Cpum_online_status',
        'running_status_label_pum': 'Cpum_running_status',
        'exhauster_online_status': 'Exhaust fan online status',
        'exhauster_run_status': 'Exhaust fan working status',
        'running': 'Running',
        'stopped': 'Stopped',
        'online': 'Online',
        'offline': 'Offline',
        'wterLevela': 'No.1 Cooling Tower Level',
        'wterLevelb': 'No.2 Cooling Tower Level',
        'wterLevelc': 'Make-up Tower High Level',
        'wterLeveld': 'Make-up Tower Low Level',
        'indoor_metrics': 'Indoor Metrics',
        'outdoor_metrics': 'Outdoor Metrics',
        'indoor_temp': 'Indoor Temp',
        'indoor_humidity': 'Indoor Humidity',
        'outdoor_temp': 'Outdoor Temp',
        'outdoor_humidity': 'Outdoor Humidity',
        'exhauster_status': 'Exhauster Status',
        'no_data_available': 'No Data Available',
        'container_not_found': 'Container Not Found',
        'error_message': 'Could not fetch data. Please check the network and server',
        'unit_celsius': '(℃)',
        'unit_meter_cubed_per_hour': '(m³/h)',
        'unit_bar': '(Bar)',
        'unit_ampere': '(A)',
        'unit_hertz': '(Hz)',
        'unit_kilowatt': '(kW)',
        'unit_percent': '(%)',
        'last_refresh': 'Last Refresh',
        'loading': 'Fetching data...',
        'error': 'Unable to fetch data. Check network and server.',
        'plc_label': 'PLCs',
        'area_label': 'Area',
        'status_key_normal': 'Normal',
        'status_key_warning': 'Warning',
        'status_key_critical': 'Critical',
        'status_key_abnormal': 'Abnormal',
        'previous_page': 'P-page',
        'next_page': 'N-page',
        'manual_mode': 'manual_mode',
        'auto_mode': 'auto_mode',
        'status_key_offline': 'Offline'
    }
}

def generate_plc_ips():
    plc_ips = {
        'A': {}, 'B': {}, 'C': {}, 'D': {}
    }
    plc_vendors = {}

    for i in range(1, 41):
        ip_tail = i * 2 - 1
        ip = f'10.240.192.{ip_tail}' if i <= 36 else f'10.240.193.{ip_tail}'
        container_id = f'A{i}'
        plc_ips['A'][container_id] = ip
        plc_vendors[container_id] = 'Minerbase'
    plc_ips['A']['A41'] = '10.240.193.81'
    plc_vendors['A41'] = 'Winchina'
    plc_ips['A']['A42'] = '10.240.193.83'
    plc_vendors['A42'] = 'Sai'
    for i in range(1, 65):
        ip_tail = i * 2 - 1
        ip = f'10.240.194.{ip_tail}' if i <= 36 else f'10.240.195.{ip_tail}'
        container_id = f'B{i}'
        plc_ips['B'][container_id] = ip
        plc_vendors[container_id] = 'Minerbase'
    for i in range(1, 33):
        ip_tail = i * 2 - 1
        ip = f'10.240.196.{ip_tail}'
        container_id = f'C{i}'
        plc_ips['C'][container_id] = ip
        plc_vendors[container_id] = 'Minerbase'
    for i in range(33, 37):
        ip_tail = i * 2 - 1
        ip = f'10.240.196.{ip_tail}'
        container_id = f'C{i}'
        plc_ips['C'][container_id] = ip
        plc_vendors[container_id] = 'Sai'
    for i in range(37, 53):
        ip_tail = i * 2 - 1
        ip = f'10.240.197.{ip_tail}'
        container_id = f'C{i}'
        plc_ips['C'][container_id] = ip
        plc_vendors[container_id] = 'Sai'
    for i in range(53, 57):
        ip_tail = i * 2 - 1
        ip = f'10.240.197.{ip_tail}'
        container_id = f'C{i}'
        plc_ips['C'][container_id] = ip
        plc_vendors[container_id] = 'Winchian'

    plc_ips['D']['D1'] = '10.240.198.1'
    plc_vendors['D1'] = 'Minerbase'
    plc_ips['D']['D2'] = '10.240.198.3'
    plc_vendors['D2'] = 'Minerbase'

    return plc_ips, plc_vendors

PLC_IPS, PLC_VENDORS = generate_plc_ips()

def process_minerbase_data(data):
    if 'Result' in data:
        result = data['Result']
        summary = result.get('Summary', {})
        
        metrics = summary.get('Metrics', {})

        water_level_data = summary.get('WaterLevel', {})
        summary['WaterLevel'] = {
            'Cooler1WaterLevel': water_level_data.get('Cooler1WaterLevel'),
            'Cooler2WaterLevel': water_level_data.get('Cooler2WaterLevel'),
            'LowTankWaterlevel': water_level_data.get('HightTankWaterLevel')
        }
        if 'Metrics' not in result:
            result['Metrics'] = {}

        flow = metrics.get('Flow')
        cold_temp = metrics.get('ColdTempC')
        hot_temp = metrics.get('HotTempC')
        cold_pressure = metrics.get('ColdPressure')
        hot_pressure = metrics.get('HotPressure')
        
        result['Metrics'].update({
            'Flow': flow,
            'ColdTempC': cold_temp,
            'HotTempC': hot_temp,
            'ColdPressure': cold_pressure,
            'HotPressure': hot_pressure
        })

        if 'Fans' in summary and isinstance(summary['Fans'], list):
            for fan in summary['Fans']:
                fan['Online'] = fan.get('Enabled', False)
                fan['Running'] = fan.get('Running', False)
                fan['Frequency'] = fan.get('Speed')
        
        if 'SprayerPump' in summary and isinstance(summary['SprayerPump'], list):
            for pump in summary['SprayerPump']:
                pump['Online'] = pump.get('Enabled', False)
                pump['Running'] = pump.get('Running', False)

        exhauster = summary.get('Exhauster', {})
        exhauster['Online'] = exhauster.get('Enabled', True)
        exhauster['Running'] = exhauster.get('Running', False)
        summary['Exhauster'] = exhauster
        
        circulation_pump = summary.get('CirculationPump', {})
        circulation_pump['Online'] = circulation_pump.get('Enabled', False)
        circulation_pump['Running'] = circulation_pump.get('Running', False)
        summary['CirculationPump'] = circulation_pump

    return data

def process_sai_data(data):
    if 'Result' not in data or 'Summary' not in data['Result']:
        logging.warning("Sai data does not have expected 'Result' or 'Summary' key.")
        return data

    summary = data['Result']['Summary']
    
    sai_metrics = data['Result'].get('Metrics', {})
    
    summary['Metrics'] = {
        'Flow': sai_metrics.get('FIT01_Flow'),
        'ColdTempC': sai_metrics.get('TT01_Temperature'),
        'HotTempC': sai_metrics.get('TT02_Temperature'),
        'ColdPressure': sai_metrics.get('PT01_Pressure'),
        'HotPressure': sai_metrics.get('PT02_Pressure')
    }
    
    fans = []
    for key, fan_data in data['Result'].items():
        if key.startswith('G') and 'Number' in fan_data:
            fans.append({
                'Number': fan_data.get('Number'),
                'Online': True,
                'Running': fan_data.get('runing', False),
                'Frequency': fan_data.get('Freq'),
                'Speed': fan_data.get('Freq'),
                'Current': fan_data.get('Arms')
            })
    summary['Fans'] = fans

    sprayer_pumps = []
    sprayer_pumps.append({
        'Number': 1,
        'Online': True,
        'Running': data['Result'].get('P11_Pump', {}).get('runing', False)
    })
    sprayer_pumps.append({
        'Number': 2,
        'Online': True,
        'Running': data['Result'].get('P12_Pump', {}).get('runing', False)
    })
    summary['SprayerPump'] = sprayer_pumps
    
    summary['CirculationPump'] = {
        'Online': True,
        'Running': data['Result'].get('P01_Pump', {}).get('runing', False),
        'Speed': data['Result'].get('P01_Pump', {}).get('Freq')
    }
    
    sai_water_level_data = summary.get('WaterLevel', {})
    summary['WaterLevel'] = {
        'Cooler1WaterLevel': sai_water_level_data.get('Cooling tower 1 level'),
        'Cooler2WaterLevel': sai_water_level_data.get('Cooling tower 2 level'),
        'LowTankWaterlevel': sai_water_level_data.get('LowTankWaterlevel'),
        'HightTankWaterLevel': sai_water_level_data.get('HightTankWaterLevel')
    }

    alarms = data['Result'].get('AlarmRuntime', [])
    processed_alarms = []
    if alarms and isinstance(alarms, list):
        for alarm in alarms:
            if isinstance(alarm, dict) and alarm.get('EventInfo') and alarm.get('Timestamp'):
                try:
                    timestamp_in_seconds = alarm['Timestamp'] / 1000
                    formatted_time = datetime.fromtimestamp(timestamp_in_seconds).strftime('%Y-%m-%d %H:%M:%S')
                    event_info = alarm['EventInfo']
                    processed_alarms.append(f"[{formatted_time}] {event_info}")
                except Exception as e:
                    logging.error(f"Failed to process timestamp for alarm: {e}")
                    processed_alarms.append(alarm.get('EventInfo'))
    summary['AlarmRuntime'] = processed_alarms

    plc_consumption = summary.get('PLC_Consummption', {})
    i_consumption = summary.get('I_Consumption', {})
    ii_consumption = summary.get('II_Consumption', {})

    total_kw = (
        plc_consumption.get('kW', 0) +
        i_consumption.get('kW', 0) +
        ii_consumption.get('kW', 0)
    )

    total_kwh = (
        plc_consumption.get('TotalKWH', 0) +
        i_consumption.get('TotalKWH', 0) +
        ii_consumption.get('TotalKWH', 0)
    )

    summary['Consumption'] = {
        'TotalKW': total_kw,
        'TotalKWH': total_kwh,
        'VPhases': plc_consumption.get('VPhases', []),
        'IPhases': plc_consumption.get('IPhases', [])
    }

    summary.pop('PLC_Consummption', None)
    summary.pop('I_Consumption', None)
    summary.pop('II_Consumption', None)

    exhauster_data = data['Result'].get('Exhauster', {})
    summary['Exhauster'] = {
        'Online': True,
        'Running': exhauster_data.get('G01_Fan', {}).get('runing', False) or \
                   exhauster_data.get('G02_Fan', {}).get('runing', False) or \
                   exhauster_data.get('G03_Fan', {}).get('runing', False),
        'IndoorTempC': exhauster_data.get('containerTemperature'),
        'IndoorHumidity': exhauster_data.get('containerHumidity')
    }
    
    data['Result']['Environmental'] = {
        'IndoorTempC': summary.get('Exhauster', {}).get('containerTemperature'),
        'IndoorHumidity': summary.get('Exhauster', {}).get('containerHumidity'),
        'OutdoorTempC': summary.get('OutdoorTemperature'),
        'OutdoorHumidity': summary.get('OutdoorHumidity')
    }

    
    is_running = any(pump.get('Running', False) for pump in summary.get('SprayerPump', []))
    data['sprayerPumpsStatus'] = is_running

    return data

def fetch_plc_data(ip_info):
    container_id, ip = ip_info
    vendor = PLC_VENDORS.get(container_id, 'Unknown')

    url = ""
    headers = {}

    if vendor == 'Sai':
        url = f"http://{ip}:1880/minerbase/infomation"
        headers = {'M-AUTH': SAI_AUTH_HEADER}
    elif vendor == 'Minerbase':
        url = f"http://{ip}:8080/minerbase/infomation"
        headers = {'M-AUTH': MINERBASE_AUTH_HEADER}
    else:
        logging.warning(f"Unknown vendor for {container_id}, skipping.")
        return {container_id: {"error": "Unknown vendor"}}

    try:
        response = requests.get(url, headers=headers, timeout=PLC_REQUEST_TIMEOUT)
        response.raise_for_status()
        data = response.json()

        data['vendor'] = vendor

        if vendor == 'Sai':
            data = process_sai_data(data)
        elif vendor == 'Minerbase':
            data = process_minerbase_data(data)

        logging.info(f"Successfully fetched and normalized data for {container_id} ({ip}).")
        return {container_id: data}
    except requests.exceptions.Timeout:
        logging.error(f"Request Timeout: {container_id} at {ip}")
        return {container_id: {"error": "Request Timeout"}}
    except requests.exceptions.RequestException as e:
        logging.error(f"Request Failed: {container_id} at {ip}: {e}")
        return {container_id: {"error": str(e)}}

def fetch_minerbase_settings():

    settings = {
        "Flow_Threshold": 40,
        "Pressure_Threshold": 200,
        "FansCurrent": 6.0
    }

    try:
        minerbase_ip = PLC_IPS['A']['A1']
        url = f"http://{minerbase_ip}:8080/minerbase/settings"
        headers = {'M-AUTH': MINERBASE_AUTH_HEADER}

        response = requests.get(url, headers=headers, timeout=PLC_REQUEST_TIMEOUT)
        response.raise_for_status()

        settings_data = response.json().get('Result', {})

        settings["Flow_Threshold"] = settings_data.get('LowerFlowLimit', settings["Flow_Threshold"])
        settings["Pressure_Threshold"] = settings_data.get('UpperPressureLimit', settings["Pressure_Threshold"])
        settings["FansCurrent"] = settings_data.get("FansCurrent", settings["FansCurrent"])

        logging.info(f"Successfully fetched Minerbase settings from {minerbase_ip}.")

    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to get settings from Minerbase {minerbase_ip}: {e}. Using default values.")

    return settings

def fetch_sai_settings():

    settings = {
        "Flow_Threshold": 40,
        "Pressure_Threshold": 200,
        "FansCurrent": 6.0
    }

    try:
        sai_ip = PLC_IPS['C']['C33']
        url = f"http://{sai_ip}:1880/minerbase/meter"
        headers = {'M-AUTH': SAI_AUTH_HEADER}

        response = requests.get(url, headers=headers, timeout=PLC_REQUEST_TIMEOUT)
        response.raise_for_status()

        sai_settings_data = response.json()

        if 'Result' in sai_settings_data and 'Summary' in sai_settings_data['Result']:
            summary = sai_settings_data['Result']['Summary']
            settings["Flow_Threshold"] = summary.get('Flow_min', settings.get("Flow_Threshold"))
            settings["Pressure_Threshold"] = summary.get('Pressure_max', settings.get("Pressure_Threshold"))

        logging.info(f"Successfully fetched Sai settings from {sai_ip}.")

    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to get settings from Sai {sai_ip}: {e}. Using default values.")

    return settings


def get_plc_status(plc_data, settings):
    vendor = plc_data.get('vendor')

    if 'error' in plc_data or not plc_data.get('Result'):
        return 'offline'

    summary = plc_data['Result']['Summary']
    alarms = summary.get('AlarmRuntime', [])

    is_critical_alarm = False
    is_warning_alarm = False

    if alarms:
        for alarm in alarms:
            alarm_info = alarm.get('EventInfo') if isinstance(alarm, dict) else alarm

            if "严重" in str(alarm_info) or "Critical" in str(alarm_info):
                is_critical_alarm = True
                break
            else:
                is_warning_alarm = True

    if is_critical_alarm:
        return 'critical'
    if is_warning_alarm:
        return 'warning'
    return 'normal'

def fetch_and_update_cache():
    logging.info("Starting to fetch all PLC data and update cache...")

    # 从 Minerbase 获取设置
    minerbase_settings = fetch_minerbase_settings()
    # 从 Sai 获取设置
    sai_settings = fetch_sai_settings()

    settings = minerbase_settings.copy()
    if sai_settings.get("Flow_Threshold") != settings.get("Flow_Threshold"):
        settings.update(sai_settings)

    logging.info(f"Final settings: {settings}")

    all_plc_items = []
    for area, containers in PLC_IPS.items():
        for container_id, ip in containers.items():
            all_plc_items.append((container_id, ip))

    all_data = {}
    with ThreadPoolExecutor(max_workers=83) as executor:
        future_to_ip = {executor.submit(fetch_plc_data, item): item for item in all_plc_items}
        for future in as_completed(future_to_ip):
            try:
                result = future.result()
                all_data.update(result)
            except Exception as exc:
                logging.error(f"An unexpected error occurred during thread execution: {exc}")

    grouped_data = {
        area: {'summary': {'normal': 0, 'warning': 0, 'critical': 0, 'offline': 0}, 'containers': {}}
        for area in PLC_IPS.keys()
    }

    for container_id, data in all_data.items():
        area = container_id[0]

        status = get_plc_status(data, settings)

        data['status'] = status
        data['ip'] = PLC_IPS[area][container_id]

        grouped_data[area]['containers'][container_id] = data
        grouped_data[area]['summary'][status] += 1

    with cache_lock:
        PLC_CACHE['data'] = grouped_data
        PLC_CACHE['timestamp'] = time.time()
    logging.info("PLC cache update completed.")

def process_data_for_details_page(raw_data):

    vendor = raw_data.get('vendor')
    data = raw_data.copy()
    result = data.get('Result', {})
    summary = result.get('Summary', {})

    if vendor == 'Sai':
        
        # 统一处理 Electrical Metrics
        sai_metrics = summary.get('Metrics', {})
        result['Metrics'] = {
            'Flow': sai_metrics.get('Flow'),
            'ColdTempC': sai_metrics.get('ColdTempC'),
            'HotTempC': sai_metrics.get('HotTempC'),
            'ColdPressure': sai_metrics.get('ColdPressure'),
            'HotPressure': sai_metrics.get('HotPressure')
        }
        
        summary['Fans'] = summary.get('Fans', [])
        
        summary['CirculationPump'] = summary.get('CirculationPump', {})

        summary['Exhauster'] = summary.get('Exhauster', {})

        return data

    elif vendor == 'Minerbase':
        return data
        
    else:
        logging.warning(f"Unknown vendor: {vendor} for container {raw_data.get('id')}")
        return raw_data


@app.route('/api/get_details/<container_id>', methods=['GET'])
def get_plc_details(container_id):
    with cache_lock:
        if PLC_CACHE['data'] is None:
            return jsonify({"error": "Data not ready."}), 202

        area = container_id[0]
        # 从缓存中获取原始数据
        plc_data = PLC_CACHE['data'].get(area, {}).get('containers', {}).get(container_id)

        if not plc_data:
            return jsonify({"error": TEXTS['zh']['container_not_found']}), 404

        if 'error' in plc_data:
            return jsonify({"error": f"Failed to fetch data for this container: {plc_data['error']}"}), 500

        # 在返回前调用专门为 details 页面设计的处理函数
        processed_data = process_data_for_details_page(plc_data)
        return jsonify(processed_data)

@app.route('/api/list', methods=['GET'])
def get_plc_list():
    with cache_lock:
        data = PLC_CACHE['data']
        if data is None:
            return jsonify({"error": "Data not ready."}), 202

        all_offline = True
        for area_data in data.values():
            if area_data['summary']['offline'] < len(area_data['containers']):
                all_offline = False
                break

        if all_offline:
            return jsonify({"error": "Failed to fetch data for all containers. Please check your network and PLC status."}), 500

        return jsonify(data)

@app.route('/api/get_data', methods=['GET'])
def get_data():
    with cache_lock:
        data = PLC_CACHE['data']
        if data is None:
            return jsonify({"error": "Data not ready."}), 202

        all_offline = True
        for area_data in data.values():
            if area_data['summary']['offline'] < len(area_data['containers']):
                all_offline = False
                break

        if all_offline:
            return jsonify({"error": "Failed to fetch data for all containers. Please check your network and PLC status."}), 500

        # 直接返回完整的缓存数据，不再进行额外的平铺处理
        return jsonify(data)


@app.route('/')
def index():
    lang = request.args.get('lang', 'zh')
    texts = TEXTS.get(lang, TEXTS['zh'])
    return render_template('index.html', texts=texts, lang=lang, refresh_interval=REFRESH_INTERVAL_SECONDS)

@app.route('/details', defaults={'container_id': None})
@app.route('/details/<container_id>')
def details_page(container_id):
    if container_id is None:
        container_id = request.args.get('container_id')

    all_container_ids = []
    for area in ['A', 'B', 'C', 'D']:
        if area in PLC_IPS:
            all_container_ids.extend(list(PLC_IPS[area].keys()))

    lang = request.args.get('lang', 'zh')
    texts = TEXTS.get(lang, TEXTS['zh'])
    return render_template('details.html', texts=texts, lang=lang, container_id=container_id, container_ids=all_container_ids)

@app.route('/list')
def list_page():
    lang = request.args.get('lang', 'zh')
    texts = TEXTS.get(lang, TEXTS['zh'])
    return render_template('list.html', texts=texts, lang=lang)


class CacheUpdater(threading.Thread):
    def __init__(self, interval):
        super().__init__()
        self.interval = interval
        self.daemon = True

    def run(self):
        while True:
            fetch_and_update_cache()
            time.sleep(self.interval)

if __name__ == '__main__':
    fetch_and_update_cache()

    updater = CacheUpdater(REFRESH_INTERVAL_SECONDS)
    updater.start()

    app.run(host='0.0.0.0',debug=True, port=8000)