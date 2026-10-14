pipeline {
    agent any

    options {
        timestamps()
    }

    environment {
        IMAGE_NAME = 'studypilot'
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out StudyPilot source code'
                checkout scm
            }
        }

        stage('Validate Project') {
            steps {
                sh '''
                    test -f index.html
                    test -f app.js
                    test -f style.css
                    test -f Dockerfile
                    test -f k8s/deployment.yaml
                    test -f k8s/service.yaml
                    echo "All required project files exist."
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t ${IMAGE_NAME}:latest .'
            }
        }

        stage('Verify Docker Image') {
            steps {
                sh 'docker image inspect ${IMAGE_NAME}:latest'
            }
        }
    }

    post {
        success {
            echo 'StudyPilot validation and Docker build completed successfully.'
        }
        failure {
            echo 'Pipeline failed. Check the stage logs.'
        }
    }
}
