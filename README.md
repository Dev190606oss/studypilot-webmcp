# StudyPilot

StudyPilot is a polished, static study planner for college students. Add tasks, track progress, generate a focused plan for today, and keep everything in your browser with `localStorage`.

Its differentiator is WebMCP: in supporting browsers, AI agents can operate the same study planner through explicit, structured browser tools. This lets an agent add, inspect, complete, delete, and prioritize study tasks without fragile UI automation.

## WebMCP tools

The app uses `document.modelContext.registerTool` to register these tools when WebMCP is available:

- `add_study_task` — add a task with title, subject, date, priority, and estimated minutes.
- `get_study_tasks` — retrieve tasks, optionally filtering by date and completion state.
- `complete_study_task` — complete a task by ID.
- `delete_study_task` — delete a task by ID.
- `generate_study_plan` — return incomplete tasks ordered by priority then duration for a date.

Every tool returns an object with a `success` flag plus clear data or error details. The header displays **WebMCP Ready** when `document.modelContext` is provided by the browser; otherwise the normal planner still works.

## Run locally

No installation or build step is required. From this folder, run either:

```bash
python3 -m http.server 8000
```

or:

```bash
npx serve .
```

Then open [http://localhost:8000](http://localhost:8000).

## Test it

1. Add a task and refresh the page — it remains because tasks are stored in `localStorage`.
2. Mark a task complete, delete a task, and generate today’s plan from the main button.
3. In a WebMCP-capable browser/agent environment, open the app and confirm the header says **WebMCP Ready**. The five tools above should be discoverable and callable. Their source registrations are in `app.js`.

For an automated WebMCP smoke test, inject a `document.modelContext` test double with a `registerTool` function before loading `app.js`, then assert it receives all five tool names.

---

# CCA 2 — CI/CD Pipeline Implementation & Deployment

This project serves as the submission for **CCA 2: CI/CD Pipeline Implementation and Deployment of an Existing Project** (TYCSE · Cloud Computing and DevOps).

GitHub Repository: [`https://github.com/Dev190606oss/studypilot-webmcp`](https://github.com/Dev190606oss/studypilot-webmcp)  
Docker Hub Registry: [`https://hub.docker.com/repository/docker/dev1906oss/studypilot`](https://hub.docker.com/repository/docker/dev1906oss/studypilot)

## 1. Project Selection & Academic Rationale
StudyPilot was selected because it represents a production-grade, AI-ready client application with modular structure, zero legacy dependencies, and immediate responsiveness. Containerizing and automating delivery for StudyPilot demonstrates genuine continuous integration, container registry publishing, automated Kubernetes rolling updates, and verification of zero-downtime service delivery.

## 2. Project Architecture & Repository Structure
```
studypilot-webmcp/
├── index.html               # Application markup and UI structure (v2.0)
├── style.css                # Modern responsive stylesheet
├── app.js                   # Application logic, persistence, and WebMCP tools
├── LICENSE                  # MIT License
├── README.md                # Project documentation and deployment guide
├── Dockerfile               # Production Nginx Alpine container definition
├── Jenkinsfile              # Declarative 6-stage CI/CD pipeline
├── .gitignore               # Git exclusion rules
├── k8s/                     # Kubernetes manifests
│   ├── deployment.yaml      # 2-replica Deployment with HTTP readiness probes
│   └── service.yaml         # NodePort Service (Port 30007)
├── screenshots/             # Canonical evidence files (SS1 - SS21)
└── submission/              # Final submission deliverables
    ├── CCA2_StudyPilot_CICD_Report.pdf
    └── CCA2_StudyPilot_CICD_Report.md
```

## 3. Docker Containerization
The application is packaged using high-performance, lightweight Nginx on Alpine Linux:
* **Base Image:** `nginx:alpine`
* **Static Assets:** `index.html`, `style.css`, and `app.js` copied to `/usr/share/nginx/html/`
* **Exposed Port:** `80`

### Build & Run Locally
```bash
# Build the Docker image
docker build -t studypilot:latest .

# Run container on host port 8081
docker run -d -p 8081:80 --name studypilot-container studypilot:latest

# Access in browser
open http://localhost:8081
```

## 4. Container Registry Integration (Docker Hub)
* **Repository:** `dev1906oss/studypilot`
* **Tagging Strategy:** Every pipeline build creates a uniquely identifiable tag matching Jenkins `${BUILD_NUMBER}` (e.g. `dev1906oss/studypilot:4`, `dev1906oss/studypilot:5`) as well as updating `latest`.
* **Security:** Docker credentials are managed through the Docker credential store and Jenkins credentials without exposing plaintext secrets in code or logs.

## 5. Jenkins CI/CD Pipeline
The automation is defined in a declarative [Jenkinsfile](Jenkinsfile) executing the following stages:

| Stage | Name | Purpose & Implementation |
|---|---|---|
| **1** | **Checkout** | Pulls the latest commit from branch `main` of the GitHub repository. |
| **2** | **Build & Test** | Validates existence of all project files and executes Python markup syntax validation on `index.html`. |
| **3** | **Docker Build** | Builds `dev1906oss/studypilot:${BUILD_NUMBER}` and `dev1906oss/studypilot:latest`. |
| **4** | **Push Image** | Pushes the build-specific and latest tags to Docker Hub using authenticated credentials. |
| **5** | **Minikube Deployment** | Applies `k8s/deployment.yaml` and `k8s/service.yaml`, dynamically updates deployment image via `kubectl set image`, and monitors rollout completion with `kubectl rollout status`. |
| **6** | **Verification** | Inspects Kubernetes Deployment, Pods, Service, and performs live HTTP `curl` accessibility testing against the cluster NodePort. |

## 6. Kubernetes & Minikube Deployment
* **Cluster:** Minikube with Docker driver on macOS (Apple Silicon).
* **Deployment (`k8s/deployment.yaml`):**
  * `replicas: 2` (High availability and zero-downtime rolling updates)
  * `image: dev1906oss/studypilot:latest` (Overridden per build to `${BUILD_NUMBER}`)
  * `imagePullPolicy: Always` (Ensures fresh image pulled from Docker Hub)
  * `readinessProbe`: HTTP GET `/` on port 80 with 3s initial delay.
* **Service (`k8s/service.yaml`):**
  * `type: NodePort`
  * `nodePort: 30007`, targetPort: `80`

### Accessing on Minikube
```bash
# Connect service tunnel on macOS
minikube service studypilot-service --url
# Outputs dynamic local URL (e.g. http://127.0.0.1:54128)
```

## 7. Verification & Demonstration Commands
```bash
# Check Minikube status
minikube status

# Check Kubernetes resources
kubectl get deployment studypilot -o wide
kubectl get pods -l app=studypilot -o wide
kubectl get service studypilot-service

# Check application HTTP response
curl -sI http://127.0.0.1:54128
```

## 8. Second-Run Demonstration (Code Change & Redeployment)
To verify genuine continuous delivery:
1. **Source Change:** Modified `index.html` to update the application title to **StudyPilot v2.0** and added the hero subtitle badge `[Deployed automatically via Jenkins & Kubernetes]`.
2. **Commit & Push:** Pushed commit `5642e8d` to GitHub `main`.
3. **Pipeline Execution:** Triggered Jenkins Build **#5**.
4. **Automated Rollout:** Jenkins built `dev1906oss/studypilot:5`, pushed to Docker Hub, and executed a rolling update on Minikube.
5. **Live Verification:** Pods updated to `dev1906oss/studypilot:5` with zero downtime, and the live application served the updated v2.0 interface.

## 9. AWS Cloud Implementation & Live Production Demonstration
To fulfill the enterprise cloud deployment requirements and prepare for live academic demonstration, the complete CI/CD pipeline and container orchestration architecture was provisioned and deployed on **Amazon Web Services (AWS)**:

* **Cloud Provider:** Amazon Web Services (AWS)
* **AWS Region:** `ap-south-1` (Asia Pacific - Mumbai)
* **EC2 Instance:** `i-01d4d058c7bb84fc4` (`t3.medium`, 2 vCPU, 4 GiB RAM, 20 GB gp3 SSD, Ubuntu 24.04 LTS)
* **Public IPv4 Address:** `13.233.225.46`
* **Security Group:** `sg-07702f09e1f0c5483` (`studypilot-demo-sg`)
  * Inbound TCP `22` (SSH), `8080` (Jenkins UI), and `30007` (NodePort) restricted to authorized student networks (`152.56.0.0/14` and AWS EC2 Instance Connect).
* **Installed Services:**
  * **Docker Engine:** `docker.io v28.0.1` with authenticated credentials for Docker Hub (`dev1906oss`)
  * **Jenkins Automation Server:** `v2.580.1` running as a systemd service with git, workflow-aggregator, and pipeline plugins
  * **Kubernetes Orchestrator:** Lightweight Kubernetes (`k3s v1.36.5+k3s1`), running a high-availability multi-pod cluster with embedded kubeconfig at `/var/lib/jenkins/.kube/config`

### AWS Pipeline Executions & Live Verification
1. **Build #1 (Initial AWS Pipeline Run):**
   * Triggered via Jenkins REST API on AWS.
   * Executed 6 stages: GitHub Checkout (`main`), static syntax validation, Docker build, Docker Hub push (`dev1906oss/studypilot:1` and `latest`), k3s deployment rollout, and HTTP 200 OK verification.
   * **Result:** `Finished: SUCCESS`.
2. **Source Code Change (StudyPilot v2.1 Demo Update):**
   * Modified `index.html` updating branding to `StudyPilot v2.1` and hero eyebrow to `SMART STUDY, CLEAR MIND • VERSION 2.1 (AWS EC2 + K8S DEMO)`.
   * Committed and pushed to GitHub: commit `ddb7f60`.
3. **Build #2 (Continuous Deployment Rolling Update):**
   * Triggered automatically upon code update.
   * Built and published `dev1906oss/studypilot:2` and `latest` to Docker Hub.
   * Executed zero-downtime rolling update on k3s: `kubectl set image deployment/studypilot studypilot=dev1906oss/studypilot:2`.
   * Rollout completed seamlessly, replacing older pods with new pods `studypilot-744865d74-h646w` and `studypilot-744865d74-mtvql`.
   * **Result:** `Finished: SUCCESS`.
4. **Live Application Access:**
   * URL: `http://13.233.225.46:30007`
   * Directly accessible and serving StudyPilot v2.1 across 2 active pod replicas.

## 10. Evidence & Screenshot Registry

| ID | Filename | Description |
|---|---|---|
| **SS1** | `SS1-StudyPilot-Original.png` | Original StudyPilot web application |
| **SS2** | `SS2-Dockerfile.png` | Dockerfile in text editor |
| **SS3** | `SS3-Docker-Build.png` | Successful Docker image build terminal output |
| **SS4** | `SS4-Docker-Container.png` | Running Docker containers in terminal |
| **SS5** | `SS5-Docker-Website.png` | StudyPilot running via Docker on `localhost:8081` |
| **SS6** | `SS6-Kubernetes-Deployment.png` | Kubernetes Deployment manifest (`deployment.yaml`) |
| **SS7** | `SS7-Kubernetes-Service.png` | Kubernetes Service manifest (`service.yaml`) |
| **SS8** | `SS8-Minikube-Status.png` | Minikube cluster setup and status |
| **SS9** | `SS9-Kubernetes-Pods.png` | Running Kubernetes Pods in Minikube |
| **SS10** | `SS10-Kubernetes-Resources.png` | Kubernetes Deployments and Services status |
| **SS11** | `SS11-StudyPilot-Kubernetes.png` | Application served via Minikube tunnel |
| **SS12** | `SS12-GitHub-Deployment-Files.png` | GitHub repository containing deployment files |
| **SS13** | `SS13-Jenkinsfile.png` | Declarative Jenkinsfile pipeline script |
| **SS14** | `SS14-Jenkins-Configuration.png` | Jenkins job configuration UI |
| **SS15** | `SS15-Jenkins-Initial-Success.png` | Initial successful Jenkins build console log |
| **SS16** | `SS16-DockerHub-Repository.png` | Docker Hub registry showing published tags |
| **SS17** | `SS17-Jenkins-Pipeline-Build4.png` | First full 6-stage Jenkins pipeline build success (Build #4) |
| **SS18** | `SS18-Kubernetes-Deployment-Verification.png` | Kubernetes Pods and Deployment running image tag 5 |
| **SS19** | `SS19-GitHub-Commit-V2.png` | Git commit showing v2.0 code change |
| **SS20** | `SS20-Jenkins-Pipeline-Build5.png` | Second pipeline build success (Build #5) |
| **SS21** | `SS21-StudyPilot-V2-Deployed.png` | Live updated StudyPilot v2.0 running on Minikube |
| **SS22** | `SS22-AWS-EC2-Instance.png` | AWS EC2 Instance Verification (`i-01d4d058c7bb84fc4`, running in `ap-south-1`) |
| **SS23** | `SS23-AWS-Jenkins-Dashboard.png` | AWS-Hosted Jenkins Job Dashboard (`http://13.233.225.46:8080/`) |
| **SS24** | `SS24-AWS-Jenkins-Build1.png` | AWS Jenkins Build #1 Execution & Kubernetes Verification Log |
| **SS25** | `SS25-AWS-GitHub-Commit-V2.1.png` | Git Commit & Push for StudyPilot v2.1 Demo Update (`ddb7f60`) |
| **SS26** | `SS26-AWS-Jenkins-Build2.png` | AWS Jenkins Build #2 Execution (Stage View & Permalinks) |
| **SS27** | `SS27-AWS-StudyPilot-Deployed.png` | Live StudyPilot v2.1 Application Running on AWS (`http://13.233.225.46:30007`) |

## 11. Teacher Demonstration Walkthrough (15-Hour Live Window)
For the evaluation demonstration:
1. **Show AWS EC2 Infrastructure:**
   ```bash
   aws ec2 describe-instances --instance-ids i-01d4d058c7bb84fc4 --region ap-south-1 --query "Reservations[0].Instances[0].{ID:InstanceId,Type:InstanceType,State:State.Name,IP:PublicIpAddress}"
   ```
2. **Open AWS Jenkins Dashboard:** Navigate to `http://13.233.225.46:8080/job/studypilot-cicd/` to show all 6 stages green for Build #1 and Build #2.
3. **Inspect Kubernetes Pods on AWS:**
   ```bash
   ssh -i ~/.ssh/studypilot-key.pem ubuntu@13.233.225.46 'sudo kubectl get pods,svc -o wide'
   ```
4. **Access the Live Web Application:** Open `http://13.233.225.46:30007` in any browser to demonstrate StudyPilot v2.1 running live.

## 12. Resource Management & Post-Demo Cleanup
* **15-Hour Window Cost:** ~$0.73 USD (~₹61 INR), safely within available credits.
* **Stop Instance (Preserves setup for later):**
  ```bash
  aws ec2 stop-instances --instance-ids i-01d4d058c7bb84fc4 --region ap-south-1
  ```
* **Terminate Instance (Permanent cleanup after grading):**
  ```bash
  aws ec2 terminate-instances --instance-ids i-01d4d058c7bb84fc4 --region ap-south-1
  aws ec2 delete-security-group --group-id sg-07702f09e1f0c5483 --region ap-south-1
  aws ec2 delete-key-pair --key-name studypilot-key --region ap-south-1
  ```

---

## License
MIT — see [LICENSE](LICENSE).
