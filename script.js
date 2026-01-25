// State management
let podCounter = 0;
let containerCounter = 0;
let autoScaleInterval = null;
let trafficInterval = null;
let chaosInterval = null;
let totalRequests = 0;
let activeRequests = 0;
let totalResponseTime = 0;
let errorCount = 0;
let currentTrafficLevel = 0;
let currentRequestRate = 0;
let requestsLastSecond = 0;
let lastRequestTime = Date.now();
let deploymentGeneration = 1;

// Pod resource configuration
let podResourceConfig = {
    memory: 512, // MB
    cpu: 500 // millicores (500 = 0.5 cores)
};

// Auto-scale settings
let autoScaleConfig = {
    cpuThreshold: 70,
    memoryThreshold: 75,
    requestThreshold: 200,
    scaleDownThreshold: 30,
    minPods: 2,
    maxPods: 10
};

// Feature flags
let features = {
    healthChecks: true,
    loadBalancer: true,
    selfHealing: true,
    verticalScaling: false,
    failureRate: 0
};

// Pod states
const POD_STATES = {
    PENDING: 'pending',
    RUNNING: 'running',
    SUCCEEDED: 'succeeded',
    FAILED: 'failed'
};

// Container names for variety
const CONTAINER_NAMES = [
    'nginx', 'api-server', 'frontend', 'backend', 
    'database', 'cache', 'worker', 'scheduler',
    'monitoring', 'logging', 'proxy', 'auth-service'
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupEventLogToggle();
    updateLoadBalancerIndicator();
    addLog('System', 'Kubernetes cluster initialized and ready');
    addLog('Tip', 'Configure auto-scale thresholds and start creating pods!');
    
    // Create initial demo pods
    setTimeout(() => createPod(1, 1), 500);
    setTimeout(() => createPod(2, 2), 1000);
});

function setupEventLogToggle() {
    const eventLog = document.querySelector('.event-log');
    const toggleBtn = document.getElementById('toggleLogBtn');
    const header = document.querySelector('.event-log-header');
    
    // Click header to toggle
    header.addEventListener('click', () => {
        eventLog.classList.toggle('expanded');
    });
    
    // Prevent button click from bubbling
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        eventLog.classList.toggle('expanded');
    });
    
    // Auto-expand on first log entry after a delay
    setTimeout(() => {
        if (document.querySelectorAll('.log-entry').length > 0) {
            eventLog.classList.add('expanded');
            setTimeout(() => {
                eventLog.classList.remove('expanded');
            }, 3000);
        }
    }, 2000);
}

function setupEventListeners() {
    document.getElementById('addPodBtn').addEventListener('click', () => {
        const node = Math.random() < 0.5 ? 1 : 2;
        const numContainers = parseInt(document.getElementById('containerCount').value) || 1;
        createPod(node, numContainers);
    });
    
    document.getElementById('clearBtn').addEventListener('click', clearAllPods);
    document.getElementById('autoScaleBtn').addEventListener('click', toggleAutoScale);
    document.getElementById('chaosBtn').addEventListener('click', triggerChaos);
    document.getElementById('restartAllBtn').addEventListener('click', restartAllPods);
    document.getElementById('rollingUpdateBtn').addEventListener('click', performRollingUpdate);
    document.getElementById('resetBtn').addEventListener('click', resetAllSettings);
    document.getElementById('exportBtn').addEventListener('click', exportConfig);
    document.getElementById('importBtn').addEventListener('click', importConfig);
    
    // Traffic controls
    const trafficLevel = document.getElementById('trafficLevel');
    const trafficValue = document.getElementById('trafficValue');
    trafficLevel.addEventListener('input', (e) => {
        currentTrafficLevel = parseInt(e.target.value);
        trafficValue.textContent = currentTrafficLevel + '%';
        updateTraffic();
    });
    
    const requestRate = document.getElementById('requestRate');
    const requestRateValue = document.getElementById('requestRateValue');
    requestRate.addEventListener('input', (e) => {
        currentRequestRate = parseInt(e.target.value);
        requestRateValue.textContent = currentRequestRate + ' req/s';
        updateTraffic();
    });
    
    // Quick traffic buttons
    document.getElementById('lowTrafficBtn').addEventListener('click', () => setTrafficPreset(20, 100));
    document.getElementById('mediumTrafficBtn').addEventListener('click', () => setTrafficPreset(50, 400));
    document.getElementById('highTrafficBtn').addEventListener('click', () => setTrafficPreset(80, 800));
    
    // Resource configuration
    const podMemory = document.getElementById('podMemory');
    const podMemoryValue = document.getElementById('podMemoryValue');
    podMemory.addEventListener('input', (e) => {
        podResourceConfig.memory = parseInt(e.target.value);
        podMemoryValue.textContent = podResourceConfig.memory + ' MB';
    });
    
    const podCpu = document.getElementById('podCpu');
    const podCpuValue = document.getElementById('podCpuValue');
    podCpu.addEventListener('input', (e) => {
        podResourceConfig.cpu = parseInt(e.target.value);
        const cores = (podResourceConfig.cpu / 1000).toFixed(1);
        podCpuValue.textContent = cores + ' cores';
    });
    
    // Feature toggles
    document.getElementById('enableHealthChecks').addEventListener('change', (e) => {
        features.healthChecks = e.target.checked;
        addLog('Feature', `Health checks ${features.healthChecks ? 'enabled' : 'disabled'}`);
    });
    
    document.getElementById('enableLoadBalancer').addEventListener('change', (e) => {
        features.loadBalancer = e.target.checked;
        updateLoadBalancerIndicator();
        addLog('Feature', `Load balancer ${features.loadBalancer ? 'enabled' : 'disabled'}`);
    });
    
    document.getElementById('enableSelfHealing').addEventListener('change', (e) => {
        features.selfHealing = e.target.checked;
        addLog('Feature', `Self-healing ${features.selfHealing ? 'enabled' : 'disabled'}`);
    });
    
    document.getElementById('enableVerticalScaling').addEventListener('change', (e) => {
        features.verticalScaling = e.target.checked;
        addLog('Feature', `VPA ${features.verticalScaling ? 'enabled' : 'disabled'}`);
    });
    
    // Failure rate
    const failureRate = document.getElementById('failureRate');
    const failureRateValue = document.getElementById('failureRateValue');
    failureRate.addEventListener('input', (e) => {
        features.failureRate = parseInt(e.target.value);
        failureRateValue.textContent = features.failureRate + '%';
        startChaosEngineering();
    });
    
    // Auto-scale configuration controls
    setupAutoScaleControls();
}

function setupAutoScaleControls() {
    const controls = [
        { id: 'cpuThreshold', valueId: 'cpuThresholdValue', suffix: '%', key: 'cpuThreshold' },
        { id: 'memoryThreshold', valueId: 'memoryThresholdValue', suffix: '%', key: 'memoryThreshold' },
        { id: 'requestThreshold', valueId: 'requestThresholdValue', suffix: '', key: 'requestThreshold' },
        { id: 'scaleDownThreshold', valueId: 'scaleDownThresholdValue', suffix: '%', key: 'scaleDownThreshold' },
        { id: 'minPods', valueId: 'minPodsValue', suffix: '', key: 'minPods' },
        { id: 'maxPods', valueId: 'maxPodsValue', suffix: '', key: 'maxPods' }
    ];
    
    controls.forEach(control => {
        const slider = document.getElementById(control.id);
        const valueDisplay = document.getElementById(control.valueId);
        
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            autoScaleConfig[control.key] = value;
            valueDisplay.textContent = value + control.suffix;
            
            addLog('Config', `Auto-scale ${control.key} set to ${value}${control.suffix}`);
        });
    });
}

function createPod(nodeNum, numContainers = 1) {
    podCounter++;
    const podId = `pod-${podCounter}`;
    const podName = `pod-${Math.random().toString(36).substr(2, 9)}`;
    
    const pod = document.createElement('div');
    pod.className = 'pod';
    pod.id = podId;
    pod.dataset.state = POD_STATES.PENDING;
    pod.dataset.restartCount = 0;
    pod.dataset.generation = deploymentGeneration;
    pod.dataset.memoryLimit = podResourceConfig.memory;
    pod.dataset.cpuLimit = podResourceConfig.cpu;
    
    // Create pod header
    const podHeader = document.createElement('div');
    podHeader.className = 'pod-header';
    
    const podInfo = document.createElement('div');
    podInfo.innerHTML = `
        <div class="pod-name">🔷 ${podName}</div>
        <div class="pod-restart-count">Restarts: 0</div>
    `;
    
    const podControls = document.createElement('div');
    podControls.className = 'pod-controls';
    
    const statusBadge = document.createElement('span');
    statusBadge.className = 'status-badge pending';
    statusBadge.textContent = 'Pending';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'pod-btn';
    deleteBtn.innerHTML = '❌';
    deleteBtn.title = 'Delete Pod';
    deleteBtn.onclick = () => deletePod(podId);
    
    const restartBtn = document.createElement('button');
    restartBtn.className = 'pod-btn';
    restartBtn.innerHTML = '🔄';
    restartBtn.title = 'Restart Pod';
    restartBtn.onclick = () => restartPod(podId);
    
    podControls.appendChild(statusBadge);
    podControls.appendChild(restartBtn);
    podControls.appendChild(deleteBtn);
    
    podHeader.appendChild(podInfo);
    podHeader.appendChild(podControls);
    
    // Add resource limits display
    const resourcesDiv = document.createElement('div');
    resourcesDiv.className = 'pod-resources';
    const cpuCores = (podResourceConfig.cpu / 1000).toFixed(1);
    resourcesDiv.innerHTML = `
        <div class="pod-resource-item">
            <span class="pod-resource-label">💾 Memory:</span>
            <span class="pod-resource-value">${podResourceConfig.memory} MB</span>
        </div>
        <div class="pod-resource-item">
            <span class="pod-resource-label">⚡ CPU:</span>
            <span class="pod-resource-value">${cpuCores} cores</span>
        </div>
    `;
    
    // Create containers
    const containersDiv = document.createElement('div');
    containersDiv.className = 'containers';
    
    for (let i = 0; i < numContainers; i++) {
        const container = createContainer(podResourceConfig.memory, podResourceConfig.cpu);
        containersDiv.appendChild(container);
    }
    
    // Add health checks if enabled
    if (features.healthChecks) {
        const healthDiv = document.createElement('div');
        healthDiv.className = 'pod-health';
        healthDiv.innerHTML = `
            <span class="health-check healthy">Liveness ✓</span>
            <span class="health-check healthy">Readiness ✓</span>
        `;
        pod.appendChild(healthDiv);
    }
    
    pod.appendChild(podHeader);
    pod.appendChild(resourcesDiv);
    pod.appendChild(containersDiv);
    
    // Add to node
    const podsArea = document.querySelector(`.pods-area[data-node="${nodeNum}"]`);
    podsArea.appendChild(pod);
    
    const cpuCoresLog = (podResourceConfig.cpu / 1000).toFixed(1);
    addLog('Pod Created', `${podName} on Node ${nodeNum} | ${numContainers} containers | ${podResourceConfig.memory}MB | ${cpuCoresLog} CPU`);
    
    // Simulate pod lifecycle
    setTimeout(() => updatePodState(podId, POD_STATES.RUNNING, podName), 1000);
    
    updateStats();
    return podId;
}

function createContainer(memoryLimit, cpuLimit) {
    containerCounter++;
    const containerName = CONTAINER_NAMES[Math.floor(Math.random() * CONTAINER_NAMES.length)];
    
    const container = document.createElement('div');
    container.className = 'container-box';
    container.dataset.requests = 0;
    container.dataset.cpu = 0;
    container.dataset.memory = 0;
    container.dataset.memoryLimit = memoryLimit;
    container.dataset.cpuLimit = cpuLimit;
    container.innerHTML = `
        <div class="container-name">🐳 ${containerName}</div>
        <div class="container-status">Starting...</div>
        <div class="container-requests">0 req/s</div>
        <div class="container-resources">
            <div class="resource-stat">
                <span class="resource-label">CPU</span>
                <span class="resource-value cpu-value">0%</span>
            </div>
            <div class="resource-stat">
                <span class="resource-label">MEM</span>
                <span class="resource-value mem-value">0%</span>
            </div>
        </div>
        <div class="load-indicator">
            <div class="load-bar" style="width: 0%"></div>
        </div>
    `;
    
    // Simulate container starting
    setTimeout(() => {
        const status = container.querySelector('.container-status');
        if (status) {
            status.textContent = 'Running';
            status.style.color = 'var(--running)';
        }
        
        // Start updating resource metrics
        updateContainerResources(container);
    }, 1500);
    
    return container;
}

function updateContainerResources(container) {
    if (!container || !container.isConnected) return;
    
    const requests = parseInt(container.dataset.requests || 0);
    
    // Calculate CPU based on requests and random variation
    const baseCPU = Math.min((requests / 15) * 100, 95);
    const cpu = Math.max(5, baseCPU + (Math.random() * 10 - 5));
    container.dataset.cpu = cpu.toFixed(1);
    
    // Calculate Memory (increases slower than CPU)
    const baseMem = Math.min((requests / 20) * 100, 90);
    const memory = Math.max(10, baseMem + (Math.random() * 8 - 4));
    container.dataset.memory = memory.toFixed(1);
    
    // Update UI
    const cpuValue = container.querySelector('.cpu-value');
    const memValue = container.querySelector('.mem-value');
    
    if (cpuValue) {
        cpuValue.textContent = Math.round(cpu) + '%';
        cpuValue.style.color = cpu > 80 ? 'var(--danger)' : cpu > 60 ? 'var(--warning)' : 'var(--success)';
    }
    
    if (memValue) {
        memValue.textContent = Math.round(memory) + '%';
        memValue.style.color = memory > 80 ? 'var(--danger)' : memory > 60 ? 'var(--warning)' : 'var(--success)';
    }
    
    // Schedule next update
    setTimeout(() => updateContainerResources(container), 1000);
}

function updatePodState(podId, state, podName) {
    const pod = document.getElementById(podId);
    if (!pod) return;
    
    const statusBadge = pod.querySelector('.status-badge');
    if (!statusBadge) return;
    
    pod.dataset.state = state;
    statusBadge.className = `status-badge ${state}`;
    statusBadge.textContent = state.charAt(0).toUpperCase() + state.slice(1);
    
    let logMessage = '';
    switch(state) {
        case POD_STATES.RUNNING:
            logMessage = `${podName} is now running`;
            // Randomly succeed or keep running
            if (Math.random() < 0.3) {
                setTimeout(() => updatePodState(podId, POD_STATES.SUCCEEDED, podName), 
                    Math.random() * 5000 + 3000);
            }
            break;
        case POD_STATES.SUCCEEDED:
            logMessage = `${podName} completed successfully`;
            break;
        case POD_STATES.FAILED:
            logMessage = `${podName} failed`;
            break;
        case POD_STATES.PENDING:
            logMessage = `${podName} is pending`;
            break;
    }
    
    if (logMessage) {
        addLog('State Change', logMessage);
    }
}

function deletePod(podId) {
    const pod = document.getElementById(podId);
    if (!pod) return;
    
    const podName = pod.querySelector('.pod-name').textContent;
    
    pod.classList.add('deleting');
    addLog('Pod Deleted', `${podName} terminated`);
    
    setTimeout(() => {
        pod.remove();
        updateStats();
    }, 500);
}

function restartPod(podId) {
    const pod = document.getElementById(podId);
    if (!pod) return;
    
    const podName = pod.querySelector('.pod-name').textContent;
    const restartCount = parseInt(pod.dataset.restartCount || 0) + 1;
    pod.dataset.restartCount = restartCount;
    
    const restartCountEl = pod.querySelector('.pod-restart-count');
    if (restartCountEl) {
        restartCountEl.textContent = `Restarts: ${restartCount}`;
    }
    
    addLog('Pod Restart', `${podName} restarting... (count: ${restartCount})`);
    
    // Reset to pending state
    updatePodState(podId, POD_STATES.PENDING, podName);
    
    // Update container statuses
    const containers = pod.querySelectorAll('.container-status');
    containers.forEach(status => {
        status.textContent = 'Restarting...';
        status.style.color = 'var(--warning)';
        
        setTimeout(() => {
            status.textContent = 'Running';
            status.style.color = 'var(--running)';
        }, 1500);
    });
    
    // Transition to running
    setTimeout(() => updatePodState(podId, POD_STATES.RUNNING, podName), 1000);
}

function restartAllPods() {
    const allPods = document.querySelectorAll('.pod');
    addLog('Restart All', `Restarting ${allPods.length} pods...`);
    
    allPods.forEach((pod, index) => {
        setTimeout(() => {
            restartPod(pod.id);
        }, index * 200);
    });
}

function triggerChaos() {
    const allPods = document.querySelectorAll('.pod');
    if (allPods.length === 0) {
        addLog('Chaos', 'No pods to test. Create pods first.');
        return;
    }
    
    const targetPod = allPods[Math.floor(Math.random() * allPods.length)];
    const podName = targetPod.querySelector('.pod-name').textContent;
    
    addLog('Chaos Engineering', `💥 Randomly killing ${podName}`);
    updatePodState(targetPod.id, POD_STATES.FAILED, podName);
    
    // Self-healing
    if (features.selfHealing) {
        setTimeout(() => {
            addLog('Self-Healing', `🔄 Recreating ${podName} due to failure`);
            const node = Math.random() < 0.5 ? 1 : 2;
            const containers = targetPod.querySelectorAll('.container-box').length;
            createPod(node, containers);
            setTimeout(() => deletePod(targetPod.id), 500);
        }, 2000);
    }
}

function startChaosEngineering() {
    if (chaosInterval) {
        clearInterval(chaosInterval);
        chaosInterval = null;
    }
    
    if (features.failureRate > 0) {
        chaosInterval = setInterval(() => {
            if (Math.random() * 100 < features.failureRate) {
                triggerChaos();
            }
        }, 5000);
        addLog('Chaos', `Chaos engineering active: ${features.failureRate}% failure rate`);
    }
}

function performRollingUpdate() {
    const allPods = document.querySelectorAll('.pod');
    if (allPods.length === 0) {
        addLog('Rolling Update', 'No pods to update. Create pods first.');
        return;
    }
    
    deploymentGeneration++;
    const strategy = document.getElementById('deployStrategy').value;
    addLog('Deployment', `Starting ${strategy} update (generation ${deploymentGeneration})`);
    
    if (strategy === 'rolling') {
        // Rolling update: one at a time
        allPods.forEach((pod, index) => {
            setTimeout(() => {
                const podName = pod.querySelector('.pod-name').textContent;
                addLog('Rolling Update', `Updating ${podName}...`);
                deletePod(pod.id);
                
                setTimeout(() => {
                    const nodeNum = index % 2 + 1;
                    const containers = pod.querySelectorAll('.container-box').length;
                    createPod(nodeNum, containers);
                }, 500);
            }, index * 2000);
        });
    } else if (strategy === 'recreate') {
        // Recreate: delete all, then create all
        addLog('Recreate', 'Terminating all pods...');
        allPods.forEach((pod, index) => {
            setTimeout(() => deletePod(pod.id), index * 100);
        });
        
        setTimeout(() => {
            addLog('Recreate', 'Creating new pods...');
            allPods.forEach((pod, index) => {
                setTimeout(() => {
                    const nodeNum = index % 2 + 1;
                    const containers = pod.querySelectorAll('.container-box').length;
                    createPod(nodeNum, containers);
                }, index * 300);
            });
        }, allPods.length * 100 + 1000);
    } else if (strategy === 'bluegreen') {
        // Blue-Green: create all new, then delete old
        addLog('Blue-Green', 'Creating green deployment...');
        allPods.forEach((pod, index) => {
            setTimeout(() => {
                const nodeNum = index % 2 + 1;
                const containers = pod.querySelectorAll('.container-box').length;
                createPod(nodeNum, containers);
            }, index * 300);
        });
        
        setTimeout(() => {
            addLog('Blue-Green', 'Switching traffic to green, terminating blue...');
            allPods.forEach((pod, index) => {
                setTimeout(() => deletePod(pod.id), index * 100);
            });
        }, allPods.length * 300 + 2000);
    }
}

function updateLoadBalancerIndicator() {
    const clusterView = document.querySelector('.cluster-view');
    let indicator = clusterView.querySelector('.load-balancer-indicator');
    
    if (features.loadBalancer && !indicator) {
        indicator = document.createElement('div');
        indicator.className = 'load-balancer-indicator';
        indicator.textContent = '🔀 Load Balancer Active';
        clusterView.appendChild(indicator);
    } else if (!features.loadBalancer && indicator) {
        indicator.remove();
    }
}

function resetAllSettings() {
    if (!confirm('Reset all settings to default?')) return;
    
    // Reset sliders
    document.getElementById('trafficLevel').value = 0;
    document.getElementById('trafficValue').textContent = '0%';
    document.getElementById('requestRate').value = 0;
    document.getElementById('requestRateValue').textContent = '0 req/s';
    document.getElementById('cpuThreshold').value = 70;
    document.getElementById('cpuThresholdValue').textContent = '70%';
    document.getElementById('memoryThreshold').value = 75;
    document.getElementById('memoryThresholdValue').textContent = '75%';
    document.getElementById('requestThreshold').value = 200;
    document.getElementById('requestThresholdValue').textContent = '200';
    document.getElementById('scaleDownThreshold').value = 30;
    document.getElementById('scaleDownThresholdValue').textContent = '30%';
    document.getElementById('minPods').value = 2;
    document.getElementById('minPodsValue').textContent = '2';
    document.getElementById('maxPods').value = 10;
    document.getElementById('maxPodsValue').textContent = '10';
    document.getElementById('failureRate').value = 0;
    document.getElementById('failureRateValue').textContent = '0%';
    
    // Reset config
    currentTrafficLevel = 0;
    currentRequestRate = 0;
    features.failureRate = 0;
    autoScaleConfig = {
        cpuThreshold: 70,
        memoryThreshold: 75,
        requestThreshold: 200,
        scaleDownThreshold: 30,
        minPods: 2,
        maxPods: 10
    };
    
    updateTraffic();
    addLog('System', 'All settings reset to default');
}

function exportConfig() {
    const config = {
        autoScaleConfig,
        features,
        currentTrafficLevel,
        currentRequestRate
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'k8s-config.json';
    a.click();
    URL.revokeObjectURL(url);
    
    addLog('Export', 'Configuration exported successfully');
}

function importConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const config = JSON.parse(event.target.result);
                Object.assign(autoScaleConfig, config.autoScaleConfig);
                Object.assign(features, config.features);
                currentTrafficLevel = config.currentTrafficLevel;
                currentRequestRate = config.currentRequestRate;
                
                // Update UI
                document.getElementById('trafficLevel').value = currentTrafficLevel;
                document.getElementById('trafficValue').textContent = currentTrafficLevel + '%';
                document.getElementById('requestRate').value = currentRequestRate;
                document.getElementById('requestRateValue').textContent = currentRequestRate + ' req/s';
                
                addLog('Import', 'Configuration imported successfully');
            } catch (err) {
                addLog('Error', 'Failed to import configuration');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function clearAllPods() {
    const allPods = document.querySelectorAll('.pod');
    
    if (allPods.length === 0) {
        addLog('Clear', 'No pods to clear');
        return;
    }
    
    addLog('Clear', `Terminating all ${allPods.length} pods`);
    
    allPods.forEach((pod, index) => {
        setTimeout(() => {
            pod.classList.add('deleting');
            setTimeout(() => {
                pod.remove();
                updateStats();
            }, 500);
        }, index * 100);
    });
    
    if (autoScaleInterval) {
        toggleAutoScale();
    }
    
    // Reset traffic
    if (trafficInterval) {
        clearInterval(trafficInterval);
        trafficInterval = null;
    }
}

function toggleAutoScale() {
    const btn = document.getElementById('autoScaleBtn');
    
    if (autoScaleInterval) {
        clearInterval(autoScaleInterval);
        autoScaleInterval = null;
        btn.innerHTML = '<span class="icon">⚡</span> Start Auto-Scale';
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-success');
        addLog('Auto-Scale', 'Auto-scaling disabled');
    } else {
        const allPods = document.querySelectorAll('.pod');
        if (allPods.length < autoScaleConfig.minPods) {
            addLog('Auto-Scale', `Creating initial pods (min: ${autoScaleConfig.minPods})...`);
            for (let i = allPods.length; i < autoScaleConfig.minPods; i++) {
                const node = (i % 2) + 1;
                createPod(node, 2);
            }
        }
        
        autoScaleInterval = setInterval(() => {
            performAutoScaling();
        }, 3000);
        
        btn.innerHTML = '<span class="icon">⏸️</span> Stop Auto-Scale';
        btn.classList.remove('btn-success');
        btn.classList.add('btn-danger');
        addLog('Auto-Scale', `Auto-scaling enabled with CPU>${autoScaleConfig.cpuThreshold}%, MEM>${autoScaleConfig.memoryThreshold}%, REQ>${autoScaleConfig.requestThreshold}/s`);
    }
}

function performAutoScaling() {
    const allPods = document.querySelectorAll('.pod');
    const allContainers = document.querySelectorAll('.container-box');
    
    if (allContainers.length === 0) return;
    
    // Calculate average metrics
    let totalCPU = 0;
    let totalMemory = 0;
    
    allContainers.forEach(container => {
        totalCPU += parseFloat(container.dataset.cpu || 0);
        totalMemory += parseFloat(container.dataset.memory || 0);
    });
    
    const avgCPU = totalCPU / allContainers.length;
    const avgMemory = totalMemory / allContainers.length;
    const currentReqRate = requestsLastSecond;
    
    // Determine if we should scale
    const shouldScaleUp = (
        avgCPU > autoScaleConfig.cpuThreshold ||
        avgMemory > autoScaleConfig.memoryThreshold ||
        currentReqRate > autoScaleConfig.requestThreshold
    ) && allPods.length < autoScaleConfig.maxPods;
    
    const shouldScaleDown = (
        avgCPU < autoScaleConfig.scaleDownThreshold &&
        avgMemory < autoScaleConfig.scaleDownThreshold &&
        currentReqRate < (autoScaleConfig.requestThreshold / 4)
    ) && allPods.length > autoScaleConfig.minPods;
    
    if (shouldScaleUp) {
        const node = Math.random() < 0.5 ? 1 : 2;
        const containers = Math.floor(Math.random() * 2) + 1;
        createPod(node, containers);
        
        const reasons = [];
        if (avgCPU > autoScaleConfig.cpuThreshold) reasons.push(`CPU ${avgCPU.toFixed(1)}%`);
        if (avgMemory > autoScaleConfig.memoryThreshold) reasons.push(`MEM ${avgMemory.toFixed(1)}%`);
        if (currentReqRate > autoScaleConfig.requestThreshold) reasons.push(`REQ ${currentReqRate}/s`);
        
        addLog('Auto-Scale', `⬆️ SCALE UP: ${reasons.join(', ')} - Pods: ${allPods.length} → ${allPods.length + 1}`);
    } else if (shouldScaleDown) {
        const podToRemove = allPods[allPods.length - 1];
        deletePod(podToRemove.id);
        addLog('Auto-Scale', `⬇️ SCALE DOWN: Low utilization (CPU ${avgCPU.toFixed(1)}%, MEM ${avgMemory.toFixed(1)}%) - Pods: ${allPods.length} → ${allPods.length - 1}`);
    }
}

function setTrafficPreset(trafficPercent, requestsPerSec) {
    document.getElementById('trafficLevel').value = trafficPercent;
    document.getElementById('trafficValue').textContent = trafficPercent + '%';
    document.getElementById('requestRate').value = requestsPerSec;
    document.getElementById('requestRateValue').textContent = requestsPerSec + ' req/s';
    
    currentTrafficLevel = trafficPercent;
    currentRequestRate = requestsPerSec;
    
    updateTraffic();
    
    const level = trafficPercent < 40 ? 'Low' : trafficPercent < 70 ? 'Medium' : 'High';
    addLog('Traffic', `${level} traffic preset applied: ${requestsPerSec} req/s`);
}

function updateTraffic() {
    // Clear existing interval
    if (trafficInterval) {
        clearInterval(trafficInterval);
        trafficInterval = null;
    }
    
    // If no traffic, reset
    if (currentRequestRate === 0) {
        activeRequests = 0;
        updateMetrics();
        return;
    }
    
    // Start new traffic simulation
    const intervalMs = 1000 / Math.max(currentRequestRate / 10, 1);
    
    trafficInterval = setInterval(() => {
        const allContainers = document.querySelectorAll('.container-box');
        if (allContainers.length === 0) return;
        
        // Distribute requests to containers
        const requestsThisTick = Math.ceil(currentRequestRate / 10);
        
        for (let i = 0; i < requestsThisTick; i++) {
            const container = allContainers[Math.floor(Math.random() * allContainers.length)];
            if (!container) continue;
            
            // Simulate request
            simulateRequest(container);
        }
        
        updateMetrics();
    }, intervalMs);
}

function simulateRequest(container) {
    totalRequests++;
    activeRequests++;
    
    // Update container request counter
    const currentReqs = parseInt(container.dataset.requests || 0);
    container.dataset.requests = currentReqs + 1;
    
    const reqDisplay = container.querySelector('.container-requests');
    if (reqDisplay) {
        reqDisplay.textContent = `${currentReqs + 1} req/s`;
    }
    
    // Update load bar
    const loadBar = container.querySelector('.load-bar');
    if (loadBar) {
        const load = Math.min((currentReqs / 10) * 100, 100);
        loadBar.style.width = load + '%';
        
        // Change color based on load
        if (load > 80) {
            loadBar.style.background = 'linear-gradient(90deg, var(--danger), var(--warning))';
        } else if (load > 50) {
            loadBar.style.background = 'linear-gradient(90deg, var(--warning), var(--primary))';
        } else {
            loadBar.style.background = 'linear-gradient(90deg, var(--success), var(--primary))';
        }
    }
    
    // Visual particle effect
    createRequestParticle(container);
    
    // Simulate response time
    const responseTime = Math.random() * 100 + 50 + (currentTrafficLevel * 2);
    totalResponseTime += responseTime;
    
    // Random errors based on load
    const errorChance = currentTrafficLevel > 80 ? 0.05 : 0.01;
    if (Math.random() < errorChance) {
        errorCount++;
    }
    
    // Complete request after response time
    setTimeout(() => {
        activeRequests = Math.max(0, activeRequests - 1);
        
        // Reset container counter periodically
        const newReqs = Math.max(0, parseInt(container.dataset.requests) - 1);
        container.dataset.requests = newReqs;
        
        if (reqDisplay) {
            reqDisplay.textContent = `${newReqs} req/s`;
        }
    }, responseTime);
}

function createRequestParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'request-particle';
    
    const rect = container.getBoundingClientRect();
    particle.style.position = 'fixed';
    particle.style.left = rect.left + rect.width / 2 + 'px';
    particle.style.top = rect.top + rect.height / 2 + 'px';
    
    document.body.appendChild(particle);
    
    setTimeout(() => {
        particle.remove();
    }, 1000);
}

function updateMetrics() {
    document.getElementById('totalRequests').textContent = totalRequests.toLocaleString();
    document.getElementById('activeRequests').textContent = activeRequests;
    document.getElementById('currentReqRate').textContent = requestsLastSecond;
    
    const avgTime = totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0;
    document.getElementById('avgResponseTime').textContent = avgTime + 'ms';
    
    const errorPercent = totalRequests > 0 ? ((errorCount / totalRequests) * 100).toFixed(2) : 0;
    document.getElementById('errorRate').textContent = errorPercent + '%';
    
    // Update error rate color
    const errorRateEl = document.getElementById('errorRate');
    if (parseFloat(errorPercent) > 5) {
        errorRateEl.style.color = 'var(--danger)';
    } else if (parseFloat(errorPercent) > 2) {
        errorRateEl.style.color = 'var(--warning)';
    } else {
        errorRateEl.style.color = 'var(--success)';
    }
    
    // Calculate and update average CPU and Memory
    const allContainers = document.querySelectorAll('.container-box');
    if (allContainers.length > 0) {
        let totalCPU = 0;
        let totalMemory = 0;
        
        allContainers.forEach(container => {
            totalCPU += parseFloat(container.dataset.cpu || 0);
            totalMemory += parseFloat(container.dataset.memory || 0);
        });
        
        const avgCPU = totalCPU / allContainers.length;
        const avgMemory = totalMemory / allContainers.length;
        
        const avgCPUEl = document.getElementById('avgCPU');
        const avgMemoryEl = document.getElementById('avgMemory');
        
        avgCPUEl.textContent = Math.round(avgCPU) + '%';
        avgMemoryEl.textContent = Math.round(avgMemory) + '%';
        
        // Color code based on thresholds
        avgCPUEl.style.color = avgCPU > autoScaleConfig.cpuThreshold ? 'var(--danger)' : 
                                avgCPU > (autoScaleConfig.cpuThreshold * 0.8) ? 'var(--warning)' : 'var(--success)';
        avgMemoryEl.style.color = avgMemory > autoScaleConfig.memoryThreshold ? 'var(--danger)' : 
                                   avgMemory > (autoScaleConfig.memoryThreshold * 0.8) ? 'var(--warning)' : 'var(--success)';
    } else {
        document.getElementById('avgCPU').textContent = '0%';
        document.getElementById('avgMemory').textContent = '0%';
    }
}

// Track requests per second
setInterval(() => {
    const now = Date.now();
    const timeDiff = (now - lastRequestTime) / 1000;
    if (timeDiff > 0) {
        requestsLastSecond = Math.round(activeRequests / timeDiff);
    }
    lastRequestTime = now;
}, 1000);

function updateStats() {
    const allPods = document.querySelectorAll('.pod');
    const allContainers = document.querySelectorAll('.container-box');
    
    document.getElementById('podCount').textContent = allPods.length;
    document.getElementById('containerCountDisplay').textContent = allContainers.length;
    
    // Calculate total memory allocated
    let totalMemory = 0;
    allPods.forEach(pod => {
        totalMemory += parseInt(pod.dataset.memoryLimit || 0);
    });
    
    document.getElementById('totalMemoryAllocated').textContent = totalMemory + ' MB';
}

function addLog(type, message) {
    const logContent = document.getElementById('logContent');
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    
    logEntry.innerHTML = `
        <span class="log-time">[${timeStr}]</span>
        <strong>${type}:</strong> ${message}
    `;
    
    logContent.insertBefore(logEntry, logContent.firstChild);
    
    // Keep only last 50 entries
    while (logContent.children.length > 50) {
        logContent.removeChild(logContent.lastChild);
    }
}

// Additional visual effects
function createNetworkEffect() {
    // Could add network traffic visualization between pods
    // This is a placeholder for future enhancement
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 'p':
                e.preventDefault();
                document.getElementById('addPodBtn').click();
                break;
            case 'k':
                e.preventDefault();
                clearAllPods();
                break;
        }
    }
});

// Add keyboard shortcuts info to log
setTimeout(() => {
    addLog('Tip', 'Use traffic controls to simulate load and watch auto-scaling in action!');
}, 2000);

// Initialize metrics
updateMetrics();

