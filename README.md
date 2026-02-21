# 🎯 Kubernetes Pods & Containers Visualizer

An interactive, animated web application to help understand Kubernetes pods and containers architecture.

## 🚀 Live Demo

**Try it now:** [https://vinodvaswani315.github.io/Kubernetes-Pods-Containers-Visualizer/](https://vinodvaswani315.github.io/Kubernetes-Pods-Containers-Visualizer/)

## Features

### 🎨 Visual Elements
- **Animated Pod Lifecycle**: Watch pods transition through Pending → Running → Succeeded/Failed states
- **Multi-Container Pods**: See how multiple containers work together in a single pod
- **Worker Nodes**: Visualize how pods are distributed across cluster nodes
- **Real-time Stats**: Track pod and container counts
- **Event Log**: Monitor all cluster activities in real-time

### ⚡ Interactive Controls
- **Container Count Selector**: Choose 1-5 containers per pod
- **Create Pod**: Add a pod with specified number of containers
- **Traffic Level Slider**: Adjust overall system load (0-100%)
- **Request Rate Slider**: Control requests per second (0-1000 req/s)
- **Traffic Presets**: Quick buttons for Low/Medium/High traffic scenarios
- **Auto-Scale**: Automatically add/remove pods based on traffic load
- **Clear All**: Remove all pods from the cluster
- **Per-Pod Controls**: Restart (🔄) and Delete (❌) individual pods

### 📊 Real-Time Metrics
- **Total Requests**: Cumulative request count
- **Active Requests**: Currently processing requests
- **Avg Response Time**: Average request latency in milliseconds
- **Error Rate**: Percentage of failed requests

### 🎮 Keyboard Shortcuts
- `Ctrl+P` or `Cmd+P`: Create a new pod
- `Ctrl+K` or `Cmd+K`: Clear all pods

## How to Run

### Option 1: Live Demo
**Visit the live demo:** [https://vinodvaswani315.github.io/Kubernetes-Pods-Containers-Visualizer/](https://vinodvaswani315.github.io/Kubernetes-Pods-Containers-Visualizer/)

## Understanding Kubernetes Concepts

### 📦 Pod
The smallest deployable unit in Kubernetes. A pod can contain one or more containers that share:
- Network namespace (same IP address)
- Storage volumes
- Configuration

### 🐳 Container
An isolated runtime environment running your application code. Containers in the same pod:
- Can communicate via localhost
- Share the same lifecycle
- Are scheduled together on the same node

### 🖥️ Node
A worker machine (physical or virtual) in the Kubernetes cluster that runs pods.

### 🔄 Pod Lifecycle States
- **Pending**: Pod accepted but not yet running
- **Running**: Pod has been bound to a node and containers are running
- **Succeeded**: All containers completed successfully
- **Failed**: At least one container failed

## Technical Stack

- **HTML5**: Structure and semantics
- **CSS3**: Modern animations and gradients
- **Vanilla JavaScript**: Interactive functionality
- **No dependencies**: Pure web technologies

## Customization

You can modify the code to:
- Add more worker nodes
- Change animation speeds
- Customize pod/container names
- Add more lifecycle states
- Implement service visualization
- Add ingress/egress network flows

## Educational Value

This visualizer helps understand:
1. **Pod Composition**: How containers group into pods (1-5 containers)
2. **Lifecycle Management**: State transitions and events
3. **Cluster Distribution**: How pods spread across nodes
4. **Traffic & Load**: Request distribution across containers
5. **Auto-Scaling**: Dynamic pod scaling based on traffic load
6. **Performance Metrics**: Response times, error rates, throughput
7. **Load Balancing**: How requests distribute across containers
8. **Multi-Container Patterns**: Sidecar, ambassador, adapter patterns

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## License

Free to use for educational purposes.

---

**Happy Learning! 🚀**

