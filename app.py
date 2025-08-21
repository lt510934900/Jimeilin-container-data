from flask import Flask, render_template, jsonify, request
import requests
import base64
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import time

app = Flask(__name__)

# Configure logging to console
logging.basicConfig(level=logging.INFO,
                    format='[%(asctime)s] %(levelname)s - %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S')

# ---- Configuration: Please check and modify according to actual conditions ----
# Authentication password
PASSWORD = "your_password"
if PASSWORD == "your_password":
    logging.error("WARNING: You have not set the password! Please modify the 'PASSWORD' variable in app.py.")
    
AUTH_HEADER_VALUE = base64.b64encode(PASSWORD.encode()).decode()

# Data refresh interval (seconds)
REFRESH_INTERVAL_SECONDS = 20

# Timeout for PLC requests (seconds)
PLC_REQUEST_TIMEOUT = 5
# ---------------------------------------------

# Cache for data and timestamp
PLC_CACHE = {
    'data': None,
    'timestamp': None
}
cache_lock = threading.Lock()

# Multilingual text dictionary
TEXTS = {
    'zh': {
        'page_title': '吉美林矿箱状态',
        'back_to_main': '返回主页',
        'list_view': '矿箱列表',
        'export_excel': '导出为Excel',
        'container_id': '集装箱编号',
        'container_type': '类型',
        'run_mode': '运行模式',
        'total_power': '总功率',
        'container_status': '状态',
        'container_details': '详情',
        'electrical_metrics': '电气指标',
        'environmental_metrics': '环境指标',
        'water_cooling': '水冷系统',
        'status_normal': '正常运行',
        'status_warning': '普通告警',
        'status_critical': '严重告警',
        'status_offline': '设备离线',
        'voltage_A': 'A相电压',
        'voltage_B': 'B相电压',
        'voltage_C': 'C相电压',
        'current_A': 'A相电流',
        'current_B': 'B相电流',
        'current_C': 'C相电流',
        'three_phase_voltage': '三相电压',
        'three_phase_current': '三相电流',
        'three_phase_power': '三相功率',
        'power_A': 'A相功率',
        'power_B': 'B相功率',
        'power_C': 'C相功率',
        'flow_rate': '水流量',
        'cold_water_temp': '进水温度',
        'hot_water_temp': '出水温度',
        'cold_water_pressure': '进水压力',
        'hot_water_pressure': '出水压力',
        'circulation_pump': '循环水泵',
        'sprayer_pump': '喷淋水泵',
        'fan': '风机',
        'frequency': '频率',
        'fan_status': '运行状态',
        'running': '正常运行',
        'stopped': '已停止',
        'offline': '已离线',
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
        'status_key_offline': '离线'
    },
    'en': {
        'page_title': 'JML Miner Status',
        'back_to_main': 'Back to Main',
        'list_view': 'Container List',
        'export_excel': 'Export to Excel',
        'container_id': 'Container ID',
        'container_type': 'Type',
        'run_mode': 'Running Mode',
        'total_power': 'Total Power',
        'container_status': 'Status',
        'container_details': 'Details',
        'electrical_metrics': 'Electrical Metrics',
        'environmental_metrics': 'Environmental Metrics',
        'water_cooling': 'Water Cooling System',
        'status_normal': 'Normal',
        'status_warning': 'Warning',
        'status_critical': 'Critical',
        'status_offline': 'Offline',
        'voltage_A': 'Phase A Voltage',
        'voltage_B': 'Phase B Voltage',
        'voltage_C': 'Phase C Voltage',
        'current_A': 'Phase A Current',
        'current_B': 'Phase B Current',
        'current_C': 'Phase C Current',
        'three_phase_voltage': 'Three-Phase Voltage',
        'three_phase_current': 'Three-Phase Current',
        'three_phase_power': 'Three-Phase Power',
        'power_A': 'Phase A Power',
        'power_B': 'Phase B Power',
        'power_C': 'Phase C Power',
        'flow_rate': 'Flow Rate',
        'cold_water_temp': 'In Water Temp',
        'hot_water_temp': 'Out Water Temp',
        'cold_water_pressure': 'In Water Pressure',
        'hot_water_pressure': 'Out Water Pressure',
        'circulation_pump': 'Circulation Pump',
        'sprayer_pump': 'Sprayer Pump',
        'fan': 'Fan',
        'frequency': 'Frequency',
        'fan_status': 'Status',
        'running': 'Running',
        'stopped': 'Stopped',
        'offline': 'Offline',
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
        'status_key_offline': 'Offline'
    }
}

def generate_plc_ips():
    """Generates a dictionary of PLC IPs grouped by area."""
    plc_ips = {
        'A': {}, 'B': {}, 'C': {}, 'D': {}
    }
    for i in range(1, 41):
        ip_tail = i * 2 - 1
        if i <= 36:
            ip = f'10.240.192.{ip_tail}'
        else:
            ip = f'10.240.193.{ip_tail}'
        plc_ips['A'][f'A{i}'] = ip
    for i in range(1, 65):
        ip_tail = i * 2 - 1
        if i <= 36:
            ip = f'10.240.194.{ip_tail}'
        else:
            ip = f'10.240.195.{ip_tail}'
        plc_ips['B'][f'B{i}'] = ip
    for i in range(1, 33):
        ip_tail = i * 2 - 1
        ip = f'10.240.196.{ip_tail}'
        plc_ips['C'][f'C{i}'] = ip
    plc_ips['D']['D1'] = '10.240.198.1'
    plc_ips['D']['D2'] = '10.240.198.3'
    return plc_ips

PLC_IPS = generate_plc_ips()

def fetch_plc_data(ip_info):
    """
    Fetches data for a single PLC.
    Returns a dictionary with container ID as key and data/error as value.
    """
    container_id, ip = ip_info
    url = f"http://{ip}:8080/minerbase/infomation"
    headers = {'M-AUTH': AUTH_HEADER_VALUE}
    try:
        response = requests.get(url, headers=headers, timeout=PLC_REQUEST_TIMEOUT)
        response.raise_for_status()
        data = response.json()
        
        # Map "Speed" field to "Frequency" for consistency
        if 'Result' in data and 'Summary' in data['Result'] and 'Fans' in data['Result']['Summary']:
            for fan in data['Result']['Summary']['Fans']:
                if 'Speed' in fan:
                    fan['Frequency'] = fan['Speed']
            
        logging.info(f"Successfully fetched data for {container_id} ({ip}).")
        return {container_id: data}
    except requests.exceptions.Timeout:
        logging.error(f"Request Timeout: {container_id} at {ip}")
        return {container_id: {"error": "Request Timeout"}}
    except requests.exceptions.RequestException as e:
        logging.error(f"Request Failed: {container_id} at {ip}: {e}")
        return {container_id: {"error": str(e)}}

def fetch_plc_settings():
    """Fetches system settings from a designated PLC."""
    settings_ip = PLC_IPS['A']['A1']
    url = f"http://{settings_ip}:8080/minerbase/setting"
    headers = {'M-AUTH': AUTH_HEADER_VALUE}
    try:
        response = requests.get(url, headers=headers, timeout=PLC_REQUEST_TIMEOUT)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to get settings from {settings_ip}: {e}")
        # Return default values in case of an error
        return {
            "Flow_Threshold": 50,
            "Pressure_Threshold": 10
        }

def get_plc_status(plc_data, settings):
    """
    Determines the status of a PLC based on its data and system settings.
    Possible statuses: 'normal', 'warning', 'critical', 'offline'.
    """
    if 'error' in plc_data or not plc_data.get('Result'):
        return 'offline'
    
    alarms = plc_data['Result']['Summary'].get('AlarmRuntime', [])
    metrics = plc_data['Result']['Summary'].get('Metrics', {})
    consumption = plc_data['Result']['Summary'].get('Consumption', {})
    
    is_critical_alarm = False
    
    flow_threshold = settings.get("Flow_Threshold", 50)
    pressure_threshold = settings.get("Pressure_Threshold", 10)

    # Critical conditions based on provided business logic
    if consumption.get('TotalKW', 0) >= 100 and metrics.get('Flow', 0) < flow_threshold:
        is_critical_alarm = True
    
    if metrics.get('ColdPressure', 0) > pressure_threshold:
        is_critical_alarm = True
        
    if is_critical_alarm:
        return 'critical'

    if alarms:
        return 'warning'
            
    return 'normal'

def fetch_and_update_cache():
    """Fetches all PLC data and updates the global cache."""
    logging.info("Starting to fetch all PLC data and update cache...")
    settings = fetch_plc_settings()
    logging.info(f"Fetched settings: {settings}")
    
    all_plc_items = []
    for area, containers in PLC_IPS.items():
        for container_id, ip in containers.items():
            all_plc_items.append((container_id, ip))

    all_data = {}
    with ThreadPoolExecutor(max_workers=100) as executor:
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

@app.route('/')
def index():
    lang = request.args.get('lang', 'zh')
    texts = TEXTS.get(lang, TEXTS['zh'])
    return render_template('index.html', texts=texts, lang=lang)

@app.route('/details', defaults={'container_id': None})
@app.route('/details/<container_id>')
def details_page(container_id):
    if container_id is None:
        container_id = request.args.get('container_id')
    
    lang = request.args.get('lang', 'zh')
    texts = TEXTS.get(lang, TEXTS['zh'])
    return render_template('details.html', texts=texts, lang=lang, container_id=container_id)

@app.route('/list')
def list_page():
    lang = request.args.get('lang', 'zh')
    texts = TEXTS.get(lang, TEXTS['zh'])
    return render_template('list.html', texts=texts, lang=lang)

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
            
        return jsonify(data)

@app.route('/api/get_details/<container_id>', methods=['GET'])
def get_plc_details(container_id):
    with cache_lock:
        if PLC_CACHE['data'] is None:
            return jsonify({"error": "Data not ready."}), 202
            
        area = container_id[0]
        plc_data = PLC_CACHE['data'].get(area, {}).get('containers', {}).get(container_id)
        
        if not plc_data:
            return jsonify({"error": TEXTS['zh']['container_not_found']}), 404
        
        if 'error' in plc_data:
            return jsonify({"error": f"Failed to fetch data for this container: {plc_data['error']}"}), 500
        
        return jsonify(plc_data)

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
    # Start the initial data fetch and the cache updater thread
    fetch_and_update_cache()
    
    updater = CacheUpdater(REFRESH_INTERVAL_SECONDS)
    updater.start()
    
    app.run(host='0.0.0.0',debug=True, port=8000)
