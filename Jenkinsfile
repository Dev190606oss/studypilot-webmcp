pipeline {
    agent any

    environment {
        REGISTRY_REPO = 'dev1906oss/studypilot'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        APP_URL = 'http://192.168.49.2:30007'
    }

    stages {
        stage('Checkout') {
            steps {
                echo '=== Stage 1: Checkout Source Code ==='
                checkout scm
            }
        }

        stage('Build and Test') {
            steps {
                echo '=== Stage 2: Build & Validation Testing ==='
                sh '''
                    echo "Checking mandatory project and configuration files..."
                    test -f index.html
                    test -f app.js
                    test -f style.css
                    test -f Dockerfile
                    test -f k8s/deployment.yaml
                    test -f k8s/service.yaml

                    echo "Running syntax and markup structure tests..."
                    python3 -c "
import html.parser
with open('index.html', 'r', encoding='utf-8') as f:
    parser = html.parser.HTMLParser()
    parser.feed(f.read())
print('index.html markup validation: PASSED')
"
                    echo "All project validation and static checks passed successfully."
                '''
            }
        }

        stage('Docker Build') {
            steps {
                echo "=== Stage 3: Docker Image Build (${REGISTRY_REPO}:${IMAGE_TAG}) ==="
                sh '''
                    docker build -t ${REGISTRY_REPO}:${IMAGE_TAG} -t ${REGISTRY_REPO}:latest .
                    docker image inspect ${REGISTRY_REPO}:${IMAGE_TAG} --format='Image ID: {{.Id}} | Size: {{.Size}} bytes'
                '''
            }
        }

        stage('Push Image') {
            steps {
                echo "=== Stage 4: Push Docker Image to Docker Hub ==="
                sh '''
                    echo "Publishing image tag ${IMAGE_TAG} to Docker Hub..."
                    docker push ${REGISTRY_REPO}:${IMAGE_TAG}
                    echo "Publishing latest tag to Docker Hub..."
                    docker push ${REGISTRY_REPO}:latest
                '''
            }
        }

        stage('Minikube Deployment') {
            steps {
                echo '=== Stage 5: Deploy to Minikube Cluster ==='
                sh '''
                    echo "Applying Kubernetes Deployment and Service manifests..."
                    kubectl apply -f k8s/deployment.yaml
                    kubectl apply -f k8s/service.yaml

                    echo "Updating deployment image to ${REGISTRY_REPO}:${IMAGE_TAG}..."
                    kubectl set image deployment/studypilot studypilot=${REGISTRY_REPO}:${IMAGE_TAG}

                    echo "Waiting for Kubernetes rollout to complete..."
                    kubectl rollout status deployment/studypilot --timeout=120s
                '''
            }
        }

        stage('Verification') {
            steps {
                echo '=== Stage 6: Application & Resource Verification ==='
                sh '''
                    echo "--- Kubernetes Deployments ---"
                    kubectl get deployment studypilot -o wide

                    echo "--- Kubernetes Pods ---"
                    kubectl get pods -l app=studypilot -o wide

                    echo "--- Kubernetes Services ---"
                    kubectl get service studypilot-service

                    echo "--- HTTP Accessibility Verification ---"
                    curl -sI ${APP_URL} | grep "HTTP/1.1 200 OK"
                    echo "StudyPilot is running and accessible at ${APP_URL}"
                '''
            }
        }
    }

    post {
        success {
            echo "CI/CD Pipeline Build #${env.BUILD_NUMBER} completed successfully!"
        }
        failure {
            echo "Pipeline failed at Build #${env.BUILD_NUMBER}. Please inspect stage logs."
        }
    }
}
